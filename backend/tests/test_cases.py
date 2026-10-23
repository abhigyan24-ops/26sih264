from fastapi.testclient import TestClient
from sqlalchemy import text


def test_a7_cases_filter_bureau_status(client: TestClient, token_rb1: str):
    """A7: GET /api/cases?bureau=RB&status=under_process -> Every row has bureau == 'RB' and status == 'under_process'"""
    resp = client.get(
        "/api/cases?bureau=RB&status=under_process",
        headers={"Authorization": f"Bearer {token_rb1}"},
    )
    assert resp.status_code == 200
    cases = resp.json()
    assert len(cases) > 0
    for c in cases:
        assert c["bureau"] == "RB"
        assert c["status"] == "under_process"


def test_a8_cases_filter_institution_and_bureau(client: TestClient, token_rb1: str):
    """A8: GET /api/cases?institution=<word from a seeded name>&bureau=RB -> Every row is RB (D1)"""
    resp = client.get(
        "/api/cases?institution=college&bureau=RB",
        headers={"Authorization": f"Bearer {token_rb1}"},
    )
    assert resp.status_code == 200
    cases = resp.json()
    assert len(cases) > 0
    for c in cases:
        assert c["bureau"] == "RB"


def test_a9_cases_region_scoping_south1(client: TestClient, token_south1: str):
    """A9: As south1: list cases -> Every row has region == 'South'"""
    resp = client.get(
        "/api/cases",
        headers={"Authorization": f"Bearer {token_south1}"},
    )
    assert resp.status_code == 200
    cases = resp.json()
    assert len(cases) > 0
    for c in cases:
        assert c["region"] == "South"


def test_a11_case_detail_out_of_scope_404(client: TestClient, token_south1: str, db_session):
    """A11: As south1: open the detail of a case in another region -> 404 (D2)"""
    non_south_id = db_session.execute(
        text("SELECT c.id FROM cases c JOIN institutions i ON i.id=c.institution_id WHERE i.region != 'South' LIMIT 1")
    ).scalar()
    assert non_south_id is not None

    resp = client.get(
        f"/api/cases/{non_south_id}",
        headers={"Authorization": f"Bearer {token_south1}"},
    )
    assert resp.status_code == 404


def test_a12_create_case_abbreviated_institution(client: TestClient, token_mgmt1: str, db_session):
    """A12: POST /api/cases with a lowercase abbreviated name -> 201; case_ref like CASE-000123; embedding stored; first action registered; overlaps == []"""
    payload = {
        "institution_name": "bhagat singh coll of engg",
        "city": "Bengaluru",
        "category": "MISREP",
        "bureau_code": "RB",
        "priority": "normal",
        "sensitive": False,
        "description": "Misleading website claims regarding unapproved foreign university collaboration.",
    }
    resp = client.post(
        "/api/cases",
        json=payload,
        headers={"Authorization": f"Bearer {token_mgmt1}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    case_id = data["id"]
    try:
        assert isinstance(case_id, int)
        assert data.get("overlaps") == [] or data.get("overlaps_found") == []

        row = db_session.execute(
            text("SELECT case_ref, embedding IS NOT NULL AS has_emb, array_length(embedding::real[], 1) AS emb_dim FROM cases WHERE id=:id"),
            {"id": case_id},
        ).mappings().one()
        assert row["case_ref"].startswith("CASE-")
        assert len(row["case_ref"]) == 11  # CASE-000123 format
        assert row["has_emb"] is True
        assert row["emb_dim"] == 384

        first_action = db_session.execute(
            text("SELECT action_type FROM actions WHERE case_id=:id ORDER BY created_at ASC LIMIT 1"),
            {"id": case_id},
        ).scalar()
        assert first_action == "registered"
    finally:
        db_session.execute(text("DELETE FROM actions WHERE case_id=:id"), {"id": case_id})
        db_session.execute(text("DELETE FROM cases WHERE id=:id"), {"id": case_id})
        db_session.commit()


def test_a13_create_case_unknown_bureau(client: TestClient, token_mgmt1: str):
    """A13: POST /api/cases with unknown bureau_code -> 422 (D6)"""
    payload = {
        "institution_name": "Bhagat Singh College of Engineering, Bengaluru",
        "city": "Bengaluru",
        "category": "FACULTY",
        "bureau_code": "UNKNOWN_BUREAU",
        "description": "Valid complaint description text here.",
    }
    resp = client.post(
        "/api/cases",
        json=payload,
        headers={"Authorization": f"Bearer {token_mgmt1}"},
    )
    assert resp.status_code == 422


def test_a14_add_action_disposed(client: TestClient, token_mgmt1: str, db_session):
    """A14: POST /api/cases/{id}/actions with new_status='disposed' -> 201; closed_date set; dashboard disposed increases by 1 and total is unchanged"""
    row = db_session.execute(
        text("SELECT id, status, closed_date FROM cases WHERE status != 'disposed' AND closed_date IS NULL LIMIT 1")
    ).mappings().first()
    assert row is not None
    cid = row["id"]
    orig_status = row["status"]

    dash_before = client.get("/api/dashboard", headers={"Authorization": f"Bearer {token_mgmt1}"}).json()["kpi"]

    try:
        resp = client.post(
            f"/api/cases/{cid}/actions",
            json={"action_type": "disposed", "new_status": "disposed", "remarks": "Resolved successfully."},
            headers={"Authorization": f"Bearer {token_mgmt1}"},
        )
        assert resp.status_code == 201

        updated = db_session.execute(
            text("SELECT status, closed_date FROM cases WHERE id=:id"),
            {"id": cid},
        ).mappings().one()
        assert updated["status"] == "disposed"
        assert updated["closed_date"] is not None

        dash_after = client.get("/api/dashboard", headers={"Authorization": f"Bearer {token_mgmt1}"}).json()["kpi"]
        assert dash_after["disposed"] == dash_before["disposed"] + 1
        assert dash_after["total"] == dash_before["total"]
    finally:
        db_session.execute(
            text("UPDATE cases SET status=:s, closed_date=NULL WHERE id=:id"),
            {"s": orig_status, "id": cid},
        )
        db_session.execute(
            text("DELETE FROM actions WHERE case_id=:id AND action_type='disposed' AND remarks='Resolved successfully.'"),
            {"id": cid},
        )
        db_session.commit()


def test_a15_add_action_invalid_status(client: TestClient, token_mgmt1: str, db_session):
    """A15: Same endpoint with new_status='banana' -> 422 (D5)"""
    cid = db_session.execute(text("SELECT id FROM cases LIMIT 1")).scalar()
    resp = client.post(
        f"/api/cases/{cid}/actions",
        json={"action_type": "status_change", "new_status": "banana"},
        headers={"Authorization": f"Bearer {token_mgmt1}"},
    )
    assert resp.status_code == 422


def test_a16_add_action_unknown_transfer_bureau(client: TestClient, token_mgmt1: str, db_session):
    """A16: Same endpoint with transfer_to='NOPE' -> 422 (D5)"""
    cid = db_session.execute(text("SELECT id FROM cases LIMIT 1")).scalar()
    resp = client.post(
        f"/api/cases/{cid}/actions",
        json={"action_type": "transfer", "transfer_to": "NOPE"},
        headers={"Authorization": f"Bearer {token_mgmt1}"},
    )
    assert resp.status_code == 422
