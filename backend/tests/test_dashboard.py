from fastapi.testclient import TestClient
from sqlalchemy import text


def test_a6_dashboard_mgmt1(client: TestClient, token_mgmt1: str, db_session):
    """A6: GET /api/dashboard as mgmt1 -> kpi.total equals SELECT count(*) FROM cases"""
    resp = client.get(
        "/api/dashboard",
        headers={"Authorization": f"Bearer {token_mgmt1}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    kpi_total = data["kpi"]["total"]

    db_total = db_session.execute(text("SELECT count(*) FROM cases")).scalar()
    assert kpi_total == db_total


def test_a10_dashboard_south1(client: TestClient, token_mgmt1: str, token_south1: str):
    """A10: As south1: dashboard total -> Less than the mgmt1 total; by_region contains only South"""
    resp_mgmt = client.get(
        "/api/dashboard",
        headers={"Authorization": f"Bearer {token_mgmt1}"},
    )
    assert resp_mgmt.status_code == 200
    mgmt_total = resp_mgmt.json()["kpi"]["total"]

    resp_south = client.get(
        "/api/dashboard",
        headers={"Authorization": f"Bearer {token_south1}"},
    )
    assert resp_south.status_code == 200
    south_data = resp_south.json()
    south_total = south_data["kpi"]["total"]

    assert south_total < mgmt_total
    regions = [r["region"] for r in south_data["by_region"]]
    assert regions == ["South"]
