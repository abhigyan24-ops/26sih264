import uuid
import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient
from app.main import app
from app.db import engine, get_db, SessionLocal
from app.services.egress import send, EgressBlocked, redact
from tests.conftest import login_token


def test_redaction():
    assert redact("sample@example.org 9876543210") == "[email] [phone]"


@pytest.mark.parametrize("mode,sensitive,blocked", [("offline", False, True), ("online", True, True), ("online", False, False)])
def test_ledger_survives_caller_rollback(mode, sensitive, blocked):
    marker = "test-egress-" + uuid.uuid4().hex
    with SessionLocal() as db:
        original = db.execute(text("SELECT value FROM policy_settings WHERE scope='global'")).scalar()
        db.execute(text("INSERT INTO policy_settings(scope,value) VALUES('global',:v) "
                        "ON CONFLICT(scope) DO UPDATE SET value=:v"), {"v": mode})
        db.execute(text("INSERT INTO audit_log(action,entity,entity_id) VALUES('egress_test','test',:m)"), {"m": marker})
        kwargs = dict(capability="email", destination=marker, payload_kind="test", case_ref=None,
                      payload={"contact": "sample@example.org", "phone": 9876543210}, sensitive=sensitive)
        try:
            if blocked:
                with pytest.raises(EgressBlocked):
                    send(db, **kwargs)
            else:
                assert send(db, **kwargs) == {"contact": "[email]", "phone": "[phone]"}
            db.rollback()  # Restores original policy and removes caller's audit data.
            assert db.execute(text("SELECT count(*) FROM audit_log WHERE entity_id=:m"), {"m": marker}).scalar() == 0
            assert db.execute(text("SELECT value FROM policy_settings WHERE scope='global'")).scalar() == original
            row = db.execute(text("SELECT mode,outcome FROM egress_ledger WHERE destination=:m"), {"m": marker}).one()
            assert row.mode == ("offline" if blocked else "online")
            assert row.outcome == ("blocked" if blocked else "stub")
        finally:
            db.rollback()
            # Delete only the unique test ledger row, never existing ledger data.
            db.execute(text("DELETE FROM egress_ledger WHERE destination=:m"), {"m": marker})
            db.commit()


def test_twenty_offline_cases_then_online_and_sensitive(monkeypatch):
    marker = "test-egress-" + uuid.uuid4().hex
    import app.services.egress as gateway
    original_send = gateway.send
    def marked_send(db, **kwargs):
        kwargs["destination"] = marker
        return original_send(db, **kwargs)
    monkeypatch.setattr(gateway, "send", marked_send)
    # Every policy change, audit and new case lives inside this OUTER transaction.
    # API commits release only savepoints. Finally rolls back every caller write.
    with engine.connect() as conn:
        outer = conn.begin()
        db = Session(bind=conn, join_transaction_mode="create_savepoint")
        app.dependency_overrides[get_db] = lambda: db
        try:
            with TestClient(app) as client:
                admin = {"Authorization": f"Bearer {login_token(client, 'admin')}"}
                officer = {"Authorization": f"Bearer {login_token(client, 'rb1')}"}
                assert client.put("/api/policy", headers=officer, json={"scope":"global","value":"offline"}).status_code == 403
                assert client.put("/api/policy", headers=admin, json={"scope":"invalid","value":"online"}).status_code == 422
                for scope in ("global", "explain"):
                    assert client.put("/api/policy", headers=admin, json={"scope":scope,"value":"offline"}).status_code == 200
                source = db.execute(text("SELECT c.*,i.name FROM cases c JOIN institutions i ON i.id=c.institution_id JOIN bureaus b ON b.id=c.bureau_id WHERE b.code='PGRC' AND c.closed_date IS NULL LIMIT 1")).mappings().one()
                payload = {"institution_name": source.name, "institution_id": source.institution_id,
                           "category": source.category, "description": source.description, "bureau_code":"RB"}
                for _ in range(20):
                    response = client.post("/api/cases", headers=officer, json=payload)
                    assert response.status_code == 201 and response.json()["overlap_scan_error"] is None
                    assert all(o["explanation_src"] == "template" for o in response.json()["overlaps"])
                assert db.execute(text("SELECT count(*) FROM egress_ledger WHERE destination=:m AND mode='online'"), {"m":marker}).scalar() == 0
                for scope in ("global", "explain"):
                    assert client.put("/api/policy", headers=admin, json={"scope":scope,"value":"online"}).status_code == 200
                response = client.post("/api/cases", headers=officer, json=payload)
                assert response.status_code == 201 and response.json()["overlap_scan_error"] is None
                assert any(o["explanation_src"] == "llm" for o in response.json()["overlaps"])
                before = db.execute(text("SELECT count(*) FROM egress_ledger WHERE destination=:m"), {"m":marker}).scalar()
                sensitive = client.post("/api/cases", headers=officer, json={**payload,"sensitive":True})
                assert sensitive.status_code == 201
                assert all(o["explanation_src"] == "template" for o in sensitive.json()["overlaps"])
                assert db.execute(text("SELECT count(*) FROM egress_ledger WHERE destination=:m"), {"m":marker}).scalar() == before
        finally:
            app.dependency_overrides.pop(get_db, None)
            db.close()
            outer.rollback()  # ALL twenty-two cases and policy changes are discarded.
            with SessionLocal() as cleanup:
                cleanup.execute(text("DELETE FROM egress_ledger WHERE destination=:m"), {"m":marker})
                cleanup.commit()
