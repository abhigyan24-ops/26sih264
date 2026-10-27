import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient
from app.main import app
from app.db import engine, get_db
from tests.conftest import login_token


@pytest.fixture
def isolated():
    with engine.connect() as conn:
        outer = conn.begin()
        db = Session(bind=conn, join_transaction_mode="create_savepoint")
        app.dependency_overrides[get_db] = lambda: db
        try:
            with TestClient(app) as client:
                token = login_token(client, "mgmt1")
                headers = {"Authorization": f"Bearer {token}"}
                pair = db.execute(text("""SELECT l.id, l.case_a, l.case_b, ba.code AS lead,
                    ca.bureau_id AS a_bureau, cb.bureau_id AS b_bureau
                    FROM overlap_links l JOIN cases ca ON ca.id=l.case_a
                    JOIN cases cb ON cb.id=l.case_b JOIN bureaus ba ON ba.id=ca.bureau_id
                    WHERE l.status='suggested' AND ca.bureau_id<>cb.bureau_id
                    AND ca.closed_date IS NULL AND cb.closed_date IS NULL LIMIT 1""")).mappings().one()
                yield client, db, headers, pair
        finally:
            app.dependency_overrides.pop(get_db, None)
            db.close()
            outer.rollback()


def test_link_atomic_outputs_and_double_decision(isolated):
    client, db, headers, pair = isolated
    before = db.execute(text("SELECT count(*) FROM alerts WHERE overlap_id=:id"), {"id": pair.id}).scalar()
    response = client.post(f"/api/overlaps/{pair.id}/decide", headers=headers,
                           json={"decision": "link", "lead_bureau": pair.lead, "hold_other": True})
    assert response.status_code == 200, response.text
    assert db.execute(text("SELECT status FROM overlap_links WHERE id=:id"), {"id": pair.id}).scalar() == "confirmed"
    flags = dict(db.execute(text("SELECT id,hold_parallel FROM cases WHERE id IN (:a,:b)"),
                           {"a": pair.case_a, "b": pair.case_b}).all())
    assert flags[pair.case_a] is False and flags[pair.case_b] is True
    actions = db.execute(text("SELECT case_id,bureau_id FROM actions WHERE meta->>'overlap_id'=:id AND action_type='link'"), {"id": str(pair.id)}).all()
    assert set(actions) == {(pair.case_a, pair.a_bureau), (pair.case_b, pair.b_bureau)}
    assert db.execute(text("SELECT count(*) FROM audit_log WHERE entity='overlap' AND entity_id=:id AND action='link'"), {"id": str(pair.id)}).scalar() >= 1
    assert db.execute(text("SELECT count(*) FROM alerts WHERE overlap_id=:id"), {"id": pair.id}).scalar() == before + 2
    assert client.post(f"/api/overlaps/{pair.id}/decide", headers=headers, json={"decision": "link"}).status_code == 409


@pytest.mark.parametrize("body", [
    {"decision": "dismiss"}, {"decision": "dismiss", "reason": "invented"},
    {"decision": "dismiss", "reason": "other"}, {"decision": "link", "hold_other": True},
    {"decision": "link", "lead_bureau": "UNKNOWN"},
])
def test_invalid_decisions(isolated, body):
    client, db, headers, pair = isolated
    assert client.post(f"/api/overlaps/{pair.id}/decide", headers=headers, json=body).status_code == 422


def test_dismiss_reason_and_list_filters(isolated):
    client, db, headers, pair = isolated
    reasons = client.get("/api/overlaps/dismiss-reasons", headers=headers)
    assert reasons.status_code == 200 and "different_issue" in reasons.json()
    for params in ({}, {"level": "high"}, {"limit": 1, "offset": 1}):
        response = client.get("/api/overlaps", headers=headers, params=params)
        assert response.status_code == 200 and int(response.headers["X-Total-Count"]) >= len(response.json())
        assert all("issue_key" not in row for row in response.json())
    assert client.get(f"/api/overlaps/{pair.id}", headers=headers).status_code == 200
    assert client.get(f"/api/cases/{pair.case_a}/overlaps", headers=headers).status_code == 200
    response = client.post(f"/api/overlaps/{pair.id}/decide", headers=headers,
                           json={"decision": "dismiss", "reason": "other", "note": "Different academic year"})
    assert response.status_code == 200
    assert db.execute(text("SELECT decision_reason FROM overlap_links WHERE id=:id"), {"id": pair.id}).scalar() == "other: Different academic year"


def test_regional_out_of_scope(isolated):
    client, db, headers, pair = isolated
    outside = db.execute(text("""SELECT l.id FROM overlap_links l JOIN cases c ON c.id=l.case_a
        JOIN institutions i ON i.id=c.institution_id WHERE i.region<>'South' LIMIT 1""")).scalar_one()
    token = login_token(client, "south1")
    headers = {"Authorization": f"Bearer {token}"}
    assert client.get(f"/api/overlaps/{outside}", headers=headers).status_code == 404
    assert client.post(f"/api/overlaps/{outside}/decide", headers=headers, json={"decision": "link"}).status_code == 404
    assert all(row["region"] == "South" for row in client.get("/api/overlaps", headers=headers).json())


def test_failure_rolls_back_every_write(isolated, monkeypatch):
    client, db, headers, pair = isolated
    import app.services.coordination as service
    def fail(*args, **kwargs):
        raise RuntimeError("injected alert failure")
    monkeypatch.setattr(service, "create_alert", fail)
    with pytest.raises(RuntimeError, match="injected alert failure"):
        client.post(f"/api/overlaps/{pair.id}/decide", headers=headers,
                    json={"decision": "link", "lead_bureau": pair.lead, "hold_other": True})
    assert db.execute(text("SELECT status FROM overlap_links WHERE id=:id"), {"id": pair.id}).scalar() == "suggested"
    assert db.execute(text("SELECT hold_parallel FROM cases WHERE id=:id"), {"id": pair.case_b}).scalar() is False
    assert db.execute(text("SELECT count(*) FROM actions WHERE meta->>'overlap_id'=:id"), {"id": str(pair.id)}).scalar() == 0
