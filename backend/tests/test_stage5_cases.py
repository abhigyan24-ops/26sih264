"""
Stage 5 backend tests — cases (C1 to C5, C9, C10)

These tests use the seeded dev database and clean up everything they create.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.db import SessionLocal
from tests.conftest import login_token


# ── helpers ──────────────────────────────────────────────────────────────────

def _seed_ids(db):
    """Return (inst_id, rb_bureau_id, pgrc_bureau_id, rb_case_id) from seeded data."""
    inst_id = db.execute(text("SELECT id FROM institutions LIMIT 1")).scalar()
    rb_id = db.execute(text("SELECT id FROM bureaus WHERE code='RB'")).scalar()
    pgrc_id = db.execute(text("SELECT id FROM bureaus WHERE code='PGRC'")).scalar()
    cat = db.execute(text("SELECT category FROM sla_rules LIMIT 1")).scalar()
    case_id = db.execute(
        text("SELECT id FROM cases WHERE bureau_id=:b LIMIT 1"), {"b": rb_id}
    ).scalar()
    return inst_id, rb_id, pgrc_id, cat, case_id


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ── C1: X-Total-Count header and pagination ────────────────────────────────────

def test_c1_total_count_and_pagination(client: TestClient, token_rb1: str):
    h = _headers(token_rb1)

    r0 = client.get("/api/cases", params={"limit": 10, "offset": 0}, headers=h)
    assert r0.status_code == 200
    total = int(r0.headers["X-Total-Count"])
    assert total > 0, "X-Total-Count must be present and positive"

    r1 = client.get("/api/cases", params={"limit": 10, "offset": 10}, headers=h)
    assert r1.status_code == 200
    assert int(r1.headers["X-Total-Count"]) == total, "Total unchanged by offset"

    ids0 = {row["id"] for row in r0.json()}
    ids1 = {row["id"] for row in r1.json()}
    assert ids0.isdisjoint(ids1), "Pages should share no case ids"


# ── C2: sort / dir / invalid sort ─────────────────────────────────────────────

def test_c2_sort_and_dir(client: TestClient, token_rb1: str):
    h = _headers(token_rb1)

    asc_r = client.get("/api/cases", params={"sort": "received_date", "dir": "asc", "limit": 10}, headers=h)
    assert asc_r.status_code == 200
    dates_asc = [row["received_date"] for row in asc_r.json()]
    assert dates_asc == sorted(dates_asc), "ASC order not respected"

    desc_r = client.get("/api/cases", params={"sort": "received_date", "dir": "desc", "limit": 10}, headers=h)
    assert desc_r.status_code == 200
    dates_desc = [row["received_date"] for row in desc_r.json()]
    assert dates_desc == sorted(dates_desc, reverse=True), "DESC order not respected"

    bad_r = client.get("/api/cases", params={"sort": "received_date;DROP"}, headers=h)
    assert bad_r.status_code == 422


# ── C3: individual PS filters ─────────────────────────────────────────────────

def test_c3_filters(client: TestClient, token_mgmt1: str):
    h = _headers(token_mgmt1)
    db = SessionLocal()
    try:
        # Pick real values from DB
        row = db.execute(text(
            """
            SELECT c.case_ref, c.category, c.status,
                   i.name AS inst_name, i.aicte_permanent_id, i.region,
                   b.code AS bureau
            FROM cases c
            JOIN institutions i ON i.id=c.institution_id
            JOIN bureaus b ON b.id=c.bureau_id
            LIMIT 1
            """
        )).mappings().first()

        # case_ref search
        r = client.get("/api/cases", params={"q": row["case_ref"]}, headers=h)
        assert r.status_code == 200
        assert any(x["case_ref"] == row["case_ref"] for x in r.json()), "q by case_ref failed"

        # institution name substring
        fragment = row["inst_name"][:6]
        r = client.get("/api/cases", params={"institution": fragment}, headers=h)
        assert r.status_code == 200
        assert len(r.json()) >= 1

        # AICTE ID
        if row["aicte_permanent_id"]:
            r = client.get("/api/cases", params={"aicte_id": row["aicte_permanent_id"]}, headers=h)
            assert r.status_code == 200
            assert all(x["aicte_permanent_id"] == row["aicte_permanent_id"] for x in r.json())

        # bureau
        r = client.get("/api/cases", params={"bureau": row["bureau"]}, headers=h)
        assert r.status_code == 200
        assert all(x["bureau"] == row["bureau"] for x in r.json())

        # region
        r = client.get("/api/cases", params={"region": row["region"]}, headers=h)
        assert r.status_code == 200
        assert all(x["region"] == row["region"] for x in r.json())

        # category
        r = client.get("/api/cases", params={"category": row["category"]}, headers=h)
        assert r.status_code == 200
        assert all(x["category"] == row["category"] for x in r.json())

        # status
        r = client.get("/api/cases", params={"status": row["status"]}, headers=h)
        assert r.status_code == 200
        assert all(x["status"] == row["status"] for x in r.json())

        # date range
        date_val = row["case_ref"]  # not used; get real date
        date_row = db.execute(text("SELECT received_date FROM cases LIMIT 1")).scalar()
        r = client.get("/api/cases", params={"date_from": str(date_row), "date_to": str(date_row)}, headers=h)
        assert r.status_code == 200
        assert all(x["received_date"] == str(date_row) for x in r.json())

        # overdue
        r = client.get("/api/cases", params={"overdue": True}, headers=h)
        assert r.status_code == 200
        assert all(x.get("overdue") for x in r.json())

    finally:
        db.close()


# ── C4: combined filters ───────────────────────────────────────────────────────

def test_c4_combined_filters(client: TestClient, token_mgmt1: str):
    h = _headers(token_mgmt1)
    db = SessionLocal()
    try:
        row = db.execute(text(
            """
            SELECT i.name AS inst_name, b.code AS bureau, c.status
            FROM cases c
            JOIN institutions i ON i.id=c.institution_id
            JOIN bureaus b ON b.id=c.bureau_id
            LIMIT 1
            """
        )).mappings().first()

        r = client.get("/api/cases", params={
            "institution": row["inst_name"][:6],
            "bureau": row["bureau"],
            "status": row["status"],
        }, headers=h)
        assert r.status_code == 200
        for x in r.json():
            assert x["bureau"] == row["bureau"]
            assert x["status"] == row["status"]
    finally:
        db.close()


# ── C5: wildcard literals ─────────────────────────────────────────────────────

def test_c5_wildcard_literal(client: TestClient, token_mgmt1: str):
    h = _headers(token_mgmt1)
    # These should not match everything; they should be treated literally
    r_pct = client.get("/api/cases", params={"q": "%"}, headers=h)
    r_und = client.get("/api/cases", params={"q": "_"}, headers=h)
    total = int(client.get("/api/cases", headers=h).headers["X-Total-Count"])

    # If % or _ were unescaped, they'd match everything → same count as total
    # Since they are escaped, results should be sparse (typically 0)
    assert r_pct.status_code == 200
    assert int(r_pct.headers["X-Total-Count"]) < total, "% was not escaped"
    assert r_und.status_code == 200


# ── C9: case detail has no forbidden fields ────────────────────────────────────

def test_c9_case_detail(client: TestClient, token_mgmt1: str):
    h = _headers(token_mgmt1)
    db = SessionLocal()
    try:
        case_id = db.execute(text("SELECT id FROM cases LIMIT 1")).scalar()
    finally:
        db.close()

    r = client.get(f"/api/cases/{case_id}", headers=h)
    assert r.status_code == 200
    body = r.json()
    c = body["case"]

    # Must NOT contain
    assert "issue_key" not in c, "issue_key must not be in response"
    assert "embedding" not in c, "embedding must not be in response"

    # Must contain SLA fields (BD6)
    assert "sla_source" in c
    assert "days_open" in c
    assert "days_remaining" in c

    # Each action must have a documents list (BD6)
    for action in body.get("actions", []):
        assert "documents" in action
        for doc in action["documents"]:
            assert "storage_key" not in doc, "storage_key must not be exposed"
            assert "checksum" not in doc, "checksum must not be exposed"


# ── C10: action rules ─────────────────────────────────────────────────────────

def test_c10_action_rules(client: TestClient, token_rb1: str):
    h = _headers(token_rb1)
    db = SessionLocal()
    created_cases = []
    try:
        # Create a test case owned by RB
        inst_id = db.execute(text(
            "SELECT c.institution_id FROM cases c JOIN bureaus b ON b.id=c.bureau_id "
            "WHERE b.code='RB' LIMIT 1"
        )).scalar()
        rb_id = db.execute(text("SELECT id FROM bureaus WHERE code='RB'")).scalar()
        pgrc_id = db.execute(text("SELECT id FROM bureaus WHERE code='PGRC'")).scalar()
        cat = db.execute(text("SELECT category FROM sla_rules LIMIT 1")).scalar()

        r = client.post("/api/cases", json={
            "institution_name": db.execute(text(
                "SELECT name FROM institutions WHERE id=:i"), {"i": inst_id}
            ).scalar(),
            "aicte_id": db.execute(text(
                "SELECT aicte_permanent_id FROM institutions WHERE id=:i"), {"i": inst_id}
            ).scalar(),
            "category": cat,
            "description": "Test case for C10 action rules",
            "bureau_code": "RB",
            "sensitive": False,
        }, headers=h)
        assert r.status_code == 201, f"create case failed: {r.text}"
        case_id = r.json()["id"]
        created_cases.append(case_id)

        # transfer without transfer_to → 422
        r = client.post(f"/api/cases/{case_id}/actions", json={
            "action_type": "transfer"
        }, headers=h)
        assert r.status_code == 422, "transfer without transfer_to should be 422"

        # transfer to same bureau → 422
        r = client.post(f"/api/cases/{case_id}/actions", json={
            "action_type": "transfer", "transfer_to": "RB"
        }, headers=h)
        assert r.status_code == 422, "transfer to same bureau should be 422"

        # valid transfer to PGRC → 201, response has action_id (BD7)
        r = client.post(f"/api/cases/{case_id}/actions", json={
            "action_type": "transfer", "transfer_to": "PGRC"
        }, headers=h)
        assert r.status_code == 201, f"valid transfer failed: {r.text}"
        data = r.json()
        assert data["ok"] is True
        assert "action_id" in data

        # reopened on non-disposed case → 422
        r = client.post(f"/api/cases/{case_id}/actions", json={
            "action_type": "reopened"
        }, headers=h)
        assert r.status_code == 422, "reopened on non-disposed should be 422"

        # dispose the case
        r = client.post(f"/api/cases/{case_id}/actions", json={
            "action_type": "closed", "new_status": "disposed"
        }, headers=h)
        assert r.status_code == 201

        # reopened on disposed → 201, closed_date cleared
        r = client.post(f"/api/cases/{case_id}/actions", json={
            "action_type": "reopened"
        }, headers=h)
        assert r.status_code == 201
        detail = client.get(f"/api/cases/{case_id}", headers=h).json()
        assert detail["case"]["status"] == "reopened"
        assert detail["case"]["closed_date"] is None

        # link → 422 (reserved Stage 7)
        r = client.post(f"/api/cases/{case_id}/actions", json={
            "action_type": "link"
        }, headers=h)
        assert r.status_code == 422

        # hold → 422
        r = client.post(f"/api/cases/{case_id}/actions", json={
            "action_type": "hold"
        }, headers=h)
        assert r.status_code == 422

    finally:
        for cid in created_cases:
            try:
                db.execute(text("DELETE FROM cases WHERE id=:i"), {"i": cid})
                db.commit()
            except Exception:
                db.rollback()
        db.close()
