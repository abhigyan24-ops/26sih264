import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from app.main import app
from app.db import engine, get_db
from app.services.sla import risk_from_counts, scan_sla, get_case_risk
from tests.conftest import login_token


def test_pure_risk_from_counts():
    # 1. Below min history
    assert risk_from_counts(n=10, still_open=5, breached=2, min_history=15) is None

    # 2. Zero still-open
    assert risk_from_counts(n=20, still_open=0, breached=0, min_history=15) is None

    # 3. Normal computation
    res = risk_from_counts(n=20, still_open=10, breached=4, min_history=15)
    assert res is not None
    assert round(res, 2) == 0.40

    # 4. Zero breached
    res0 = risk_from_counts(n=30, still_open=12, breached=0, min_history=15)
    assert res0 == 0.0


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


def test_scan_sla_and_deduplication(isolated):
    client, db = isolated

    # Clear today's SLA alerts to ensure isolation if worker already executed today
    db.execute(text("DELETE FROM alerts WHERE kind IN ('sla_risk', 'sla_breach', 'escalation') AND created_at >= CURRENT_DATE"))

    # First scan
    res1 = scan_sla(db)
    assert "created" in res1
    assert "by_kind" in res1
    assert "skipped_dupes" in res1
    assert res1["created"] > 0
    assert any(count > 0 for count in res1["by_kind"].values())

    # Second scan on same day -> created must be 0, skipped_dupes must be > 0
    res2 = scan_sla(db)
    assert res2["created"] == 0
    assert res2["skipped_dupes"] >= res1["created"]


def test_sla_api_scan_permissions(isolated):
    client, db = isolated

    admin_token = login_token(client, "admin")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    officer_token = login_token(client, "rb1")
    officer_headers = {"Authorization": f"Bearer {officer_token}"}

    # Officer should get 403 Forbidden
    res_officer = client.post("/api/sla/scan", headers=officer_headers)
    assert res_officer.status_code == 403

    # Admin should get 200 OK
    res_admin = client.post("/api/sla/scan", headers=admin_headers)
    assert res_admin.status_code == 200
    data = res_admin.json()
    assert "created" in data
    assert "by_kind" in data


def test_sla_api_case_risk_endpoint(isolated):
    client, db = isolated

    case = db.execute(text("SELECT id FROM cases LIMIT 1")).mappings().one()
    token = login_token(client, "rb1")
    headers = {"Authorization": f"Bearer {token}"}

    # Existing case
    res = client.get(f"/api/sla/risk/{case['id']}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "basis" in data
    assert data["basis"] in ("history", "deadline_only")
    assert "n_history" in data
    assert "risk" in data

    # 404 for non-existent case
    res_404 = client.get("/api/sla/risk/999999", headers=headers)
    assert res_404.status_code == 404
