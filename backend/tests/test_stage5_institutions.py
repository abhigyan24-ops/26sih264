"""
Stage 5 backend tests — institutions and meta (C6, C7, C8)
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.db import SessionLocal
from tests.conftest import login_token


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ── C6: meta/filters ──────────────────────────────────────────────────────────

def test_c6_meta_filters_requires_auth(client: TestClient):
    r = client.get("/api/meta/filters")
    assert r.status_code == 401

def test_c6_meta_filters(client: TestClient, token_rb1: str):
    r = client.get("/api/meta/filters", headers=_headers(token_rb1))
    assert r.status_code == 200
    body = r.json()

    assert len(body["bureaus"]) >= 6, f"Expected ≥6 bureaus, got {len(body['bureaus'])}"
    assert len(body["categories"]) >= 6, f"Expected ≥6 categories, got {len(body['categories'])}"
    assert len(body["statuses"]) == 9, f"Expected 9 statuses, got {len(body['statuses'])}"
    assert len(body["regions"]) >= 5, f"Expected ≥5 regions, got {len(body['regions'])}"

    # Each bureau has code and name
    for b in body["bureaus"]:
        assert "code" in b and "name" in b


# ── C7: institution search ────────────────────────────────────────────────────

def test_c7_search_one_char_is_422(client: TestClient, token_rb1: str):
    r = client.get("/api/institutions/search", params={"q": "A"}, headers=_headers(token_rb1))
    assert r.status_code == 422

def test_c7_search_by_name_fragment(client: TestClient, token_mgmt1: str):
    db = SessionLocal()
    try:
        name = db.execute(text("SELECT name FROM institutions LIMIT 1")).scalar()
    finally:
        db.close()
    fragment = name[:5]
    r = client.get("/api/institutions/search", params={"q": fragment}, headers=_headers(token_mgmt1))
    assert r.status_code == 200
    assert len(r.json()) >= 1

def test_c7_search_by_aicte_id(client: TestClient, token_mgmt1: str):
    db = SessionLocal()
    try:
        aid = db.execute(text("SELECT aicte_permanent_id FROM institutions WHERE aicte_permanent_id IS NOT NULL LIMIT 1")).scalar()
    finally:
        db.close()
    if aid:
        r = client.get("/api/institutions/search", params={"q": aid}, headers=_headers(token_mgmt1))
        assert r.status_code == 200
        ids = [x["aicte_permanent_id"] for x in r.json()]
        assert aid in ids

def test_c7_search_scoped_south1(client: TestClient, token_south1: str):
    r = client.get("/api/institutions/search", params={"q": "college"}, headers=_headers(token_south1))
    assert r.status_code == 200
    for inst in r.json():
        assert inst["region"] == "South", f"south1 got non-South result: {inst}"


# ── C8: institution detail ────────────────────────────────────────────────────

def test_c8_institution_detail(client: TestClient, token_mgmt1: str):
    db = SessionLocal()
    try:
        # Find an institution that has both RB and PGRC cases
        inst_id = db.execute(text(
            """
            SELECT c.institution_id
            FROM cases c
            JOIN bureaus b ON b.id=c.bureau_id
            WHERE b.code IN ('RB', 'PGRC')
            GROUP BY c.institution_id
            HAVING count(DISTINCT b.code) >= 2
            LIMIT 1
            """
        )).scalar()
        if inst_id is None:
            # Fall back to any institution
            inst_id = db.execute(text("SELECT id FROM institutions LIMIT 1")).scalar()
    finally:
        db.close()

    r = client.get(f"/api/institutions/{inst_id}", headers=_headers(token_mgmt1))
    assert r.status_code == 200
    body = r.json()

    assert "institution" in body
    assert "cases" in body
    assert "repeat_categories" in body
    assert "active_by_bureau" in body
    assert "overlaps" in body
    assert "stats" in body

    stats = body["stats"]
    total = stats["total"]
    cases = body["cases"]
    assert total == len(cases), "stats.total should equal len(cases)"

    for rc in body["repeat_categories"]:
        assert rc["n"] > 1, "repeat_categories should only have n > 1"

    assert isinstance(body["overlaps"], list)

def test_c8_institution_detail_404(client: TestClient, token_mgmt1: str):
    r = client.get("/api/institutions/999999999", headers=_headers(token_mgmt1))
    assert r.status_code == 404

def test_c8_institution_detail_south1_scope(client: TestClient, token_south1: str, token_mgmt1: str):
    db = SessionLocal()
    try:
        # Find a non-South institution
        non_south_id = db.execute(text(
            "SELECT id FROM institutions WHERE region != 'South' LIMIT 1"
        )).scalar()
    finally:
        db.close()

    if non_south_id:
        r = client.get(f"/api/institutions/{non_south_id}", headers=_headers(token_south1))
        assert r.status_code == 404, "south1 should get 404 for non-South institution"
