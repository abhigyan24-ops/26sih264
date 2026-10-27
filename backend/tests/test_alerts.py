import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient
from app.main import app
from app.db import engine, get_db
from app.services.alerts import create_alert
from tests.conftest import login_token


@pytest.fixture
def isolated():
    with engine.connect() as conn:
        outer = conn.begin()
        db = Session(bind=conn, join_transaction_mode="create_savepoint")
        app.dependency_overrides[get_db] = lambda: db
        try:
            with TestClient(app) as client:
                yield client, db
        finally:
            app.dependency_overrides.pop(get_db, None)
            db.close()
            outer.rollback()


def test_alerts_scoping_per_role(isolated):
    client, db = isolated

    # Get sample cases from South and West regions
    south_case = db.execute(text("""
        SELECT c.id, c.bureau_id FROM cases c
        JOIN institutions i ON i.id = c.institution_id
        WHERE i.region = 'South' AND c.bureau_id IS NOT NULL LIMIT 1
    """)).mappings().one()

    west_case = db.execute(text("""
        SELECT c.id, c.bureau_id FROM cases c
        JOIN institutions i ON i.id = c.institution_id
        WHERE i.region = 'West' AND c.bureau_id IS NOT NULL LIMIT 1
    """)).mappings().one()

    # Create alerts
    create_alert(db, "system", south_case["id"], south_case["bureau_id"], "South Alert 1")
    create_alert(db, "system", west_case["id"], west_case["bureau_id"], "West Alert 1")
    db.flush()

    # Regional officer (South) should only see South case alerts
    south_headers = {"Authorization": f"Bearer {login_token(client, 'south1')}"}
    res = client.get("/api/alerts", headers=south_headers)
    assert res.status_code == 200
    alerts = res.json()
    assert all("South Alert" in a["message"] for a in alerts if a["case_id"] in (south_case["id"], west_case["id"]))

    # Management should see both
    mgmt_headers = {"Authorization": f"Bearer {login_token(client, 'mgmt1')}"}
    res_mgmt = client.get("/api/alerts", headers=mgmt_headers)
    assert res_mgmt.status_code == 200
    mgmt_messages = [a["message"] for a in res_mgmt.json()]
    assert "South Alert 1" in mgmt_messages
    assert "West Alert 1" in mgmt_messages


def test_mark_read_and_unread_count(isolated):
    client, db = isolated

    south_case = db.execute(text("""
        SELECT c.id, c.bureau_id FROM cases c
        JOIN institutions i ON i.id = c.institution_id
        WHERE i.region = 'South' LIMIT 1
    """)).mappings().one()

    create_alert(db, "pending", south_case["id"], south_case["bureau_id"], "Pending Alert Test")
    db.flush()

    alert_id = db.execute(text("SELECT id FROM alerts WHERE message = 'Pending Alert Test'")).scalar()

    south_headers = {"Authorization": f"Bearer {login_token(client, 'south1')}"}

    # Check unread count
    res_count = client.get("/api/alerts/unread-count", headers=south_headers)
    assert res_count.status_code == 200
    initial_count = res_count.json()["count"]
    assert initial_count >= 1

    # Mark as read
    res_read = client.post(f"/api/alerts/{alert_id}/read", headers=south_headers)
    assert res_read.status_code == 200
    assert res_read.json() == {"ok": True}

    # Verify unread count decreased
    res_count_after = client.get("/api/alerts/unread-count", headers=south_headers)
    assert res_count_after.json()["count"] == initial_count - 1


def test_mark_read_out_of_scope_404(isolated):
    client, db = isolated

    # West case alert
    west_case = db.execute(text("""
        SELECT c.id, c.bureau_id FROM cases c
        JOIN institutions i ON i.id = c.institution_id
        WHERE i.region = 'West' LIMIT 1
    """)).mappings().one()

    create_alert(db, "system", west_case["id"], west_case["bureau_id"], "West Secret Alert")
    db.flush()
    west_alert_id = db.execute(text("SELECT id FROM alerts WHERE message = 'West Secret Alert'")).scalar()

    # South officer attempts to mark West alert as read -> 404
    south_headers = {"Authorization": f"Bearer {login_token(client, 'south1')}"}
    res = client.post(f"/api/alerts/{west_alert_id}/read", headers=south_headers)
    assert res.status_code == 404, "Out of scope alert must return 404"


def test_alert_deduplication(isolated):
    client, db = isolated

    case = db.execute(text("SELECT id, bureau_id FROM cases LIMIT 1")).mappings().one()

    # First insert with dedupe_key -> True
    ins1 = create_alert(db, "sla_risk", case["id"], case["bureau_id"], "Risk Alert", dedupe_key="risk_today")
    assert ins1 is True
    db.flush()

    # Second insert with same dedupe_key today -> False (skipped)
    ins2 = create_alert(db, "sla_risk", case["id"], case["bureau_id"], "Risk Alert Duplicate", dedupe_key="risk_today")
    assert ins2 is False

    # Insert without dedupe_key -> always True
    ins3 = create_alert(db, "sla_risk", case["id"], case["bureau_id"], "Risk Alert Again", dedupe_key=None)
    assert ins3 is True


def test_mark_all_read(isolated):
    client, db = isolated

    south_case = db.execute(text("""
        SELECT c.id, c.bureau_id FROM cases c
        JOIN institutions i ON i.id = c.institution_id
        WHERE i.region = 'South' LIMIT 1
    """)).mappings().one()

    create_alert(db, "system", south_case["id"], south_case["bureau_id"], "Unread 1")
    create_alert(db, "system", south_case["id"], south_case["bureau_id"], "Unread 2")
    db.flush()

    south_headers = {"Authorization": f"Bearer {login_token(client, 'south1')}"}
    res_all = client.post("/api/alerts/read-all", headers=south_headers)
    assert res_all.status_code == 200

    res_unread = client.get("/api/alerts/unread-count", headers=south_headers)
    assert res_unread.json()["count"] == 0
