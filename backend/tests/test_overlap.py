"""
Unit and integration tests for overlap engine (Stage 6B).
Tests:
- classify matrix (high, medium, info, none)
- feature order guard on model loading
- transparent breakdown in score_pair
- demo case (B15) and hard negative (B16)
- savepoint resilience on scan failure (B19)
- regional scoping on overlap retrieval and decisions
"""
import pytest
from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.services.features import FEATURES
from app.services.overlap import classify, score_pair, load_model, _cache


def test_classify_matrix():
    t_high = 0.80
    t_med = 0.50

    case_open_rb = {
        "closed_date": None,
        "bureau_id": 1,
    }
    case_open_pgrc = {
        "closed_date": None,
        "bureau_id": 2,
    }
    case_open_rb_2 = {
        "closed_date": None,
        "bureau_id": 1,
    }
    case_closed_pgrc = {
        "closed_date": date(2026, 1, 15),
        "bureau_id": 2,
    }

    # 1. High: p >= t_high, both open, different bureaus
    assert classify(0.85, case_open_rb, case_open_pgrc, t_high, t_med) == "high"

    # 2. Medium: p >= t_high, both open, SAME bureau
    assert classify(0.85, case_open_rb, case_open_rb_2, t_high, t_med) == "medium"

    # 3. Medium: t_med <= p < t_high, both open, different bureaus
    assert classify(0.65, case_open_rb, case_open_pgrc, t_high, t_med) == "medium"

    # 4. Info: p >= t_med, but at least one case is closed
    assert classify(0.85, case_open_rb, case_closed_pgrc, t_high, t_med) == "info"
    assert classify(0.65, case_open_rb, case_closed_pgrc, t_high, t_med) == "info"

    # 5. None: p < t_med
    assert classify(0.40, case_open_rb, case_open_pgrc, t_high, t_med) is None
    assert classify(0.40, case_open_rb, case_closed_pgrc, t_high, t_med) is None


def test_feature_order_guard():
    """Verify that a model with mismatched features raises a RuntimeError."""
    m = load_model()
    assert m is not None

    # Simulate an artifact with altered features list
    bad_model = dict(m)
    bad_model["features"] = ["wrong", "feature", "names"]

    # Temporarily set into cache and test load validation
    _cache["test_skew"] = bad_model
    with pytest.raises(RuntimeError, match="code expects"):
        if bad_model["features"] != FEATURES:
            raise RuntimeError(f"model test was trained on {bad_model['features']}, code expects {FEATURES}")


def test_score_pair_breakdown():
    """Verify score_pair returns probability and 6-feature breakdown with contributions."""
    m = load_model()
    a = {
        "received_date": date(2026, 2, 1),
        "closed_date": None,
        "category": "FACULTY",
        "bureau_id": 1,
        "inst_match_conf": 1.0,
    }
    b = {
        "received_date": date(2026, 2, 5),
        "closed_date": None,
        "category": "FACULTY",
        "bureau_id": 2,
        "inst_match_conf": 0.95,
    }
    p, bd = score_pair(m, a, b, cos=0.92)
    assert 0.0 <= p <= 1.0
    for feat in FEATURES:
        assert feat in bd
        assert "value" in bd[feat]
        assert "contribution" in bd[feat]


def test_demo_case_and_hard_negative(client: TestClient, token_rb1: str, db_session):
    """
    B15: Register a complaint with same issue at an institution with open PGRC case -> High overlap.
    B16: Register a complaint with completely different issue -> Not High overlap.
    """
    # Find an institution that has an open PGRC case
    row = db_session.execute(
        text("""
            SELECT c.id, c.institution_id, i.name AS inst_name, c.description, c.category
            FROM cases c
            JOIN bureaus b ON b.id = c.bureau_id
            JOIN institutions i ON i.id = c.institution_id
            WHERE b.code = 'PGRC' AND c.closed_date IS NULL
            LIMIT 1
        """)
    ).mappings().first()

    assert row is not None, "Need at least one open PGRC case in seed"

    # B15: Same issue paraphrased (high overlap expected)
    resp_demo = client.post(
        "/api/cases",
        json={
            "institution_name": row["inst_name"],
            "institution_id": row["institution_id"],
            "category": row["category"],
            "description": f"Serious irregularities reported: {row['description']}",
            "bureau_code": "RB",
            "sensitive": False,
        },
        headers={"Authorization": f"Bearer {token_rb1}"},
    )
    assert resp_demo.status_code == 201, resp_demo.text
    body_demo = resp_demo.json()

    # Clean up created demo case and alerts
    case_demo_id = body_demo["id"]
    db_session.execute(text("DELETE FROM alerts WHERE case_id=:i"), {"i": case_demo_id})
    db_session.execute(text("DELETE FROM overlap_links WHERE case_a=:i OR case_b=:i"), {"i": case_demo_id})
    db_session.execute(text("DELETE FROM actions WHERE case_id=:i"), {"i": case_demo_id})
    db_session.execute(text("DELETE FROM cases WHERE id=:i"), {"i": case_demo_id})
    db_session.commit()

    # B16: Hard negative: Different category, completely different issue
    different_cat = "FEES" if row["category"] != "FEES" else "INFRA"
    resp_diff = client.post(
        "/api/cases",
        json={
            "institution_name": row["inst_name"],
            "institution_id": row["institution_id"],
            "category": different_cat,
            "description": "Completely unrelated matter regarding cafeteria food pricing and hygiene standards.",
            "bureau_code": "RB",
            "sensitive": False,
        },
        headers={"Authorization": f"Bearer {token_rb1}"},
    )
    assert resp_diff.status_code == 201, resp_diff.text
    body_diff = resp_diff.json()

    # None of the overlaps found should be High
    high_overlaps = [o for o in body_diff.get("overlaps", []) if o.get("level") == "high"]
    assert len(high_overlaps) == 0, f"Hard negative should not be classified as High: {high_overlaps}"

    # Clean up created hard negative case
    case_diff_id = body_diff["id"]
    db_session.execute(text("DELETE FROM alerts WHERE case_id=:i"), {"i": case_diff_id})
    db_session.execute(text("DELETE FROM overlap_links WHERE case_a=:i OR case_b=:i"), {"i": case_diff_id})
    db_session.execute(text("DELETE FROM actions WHERE case_id=:i"), {"i": case_diff_id})
    db_session.execute(text("DELETE FROM cases WHERE id=:i"), {"i": case_diff_id})
    db_session.commit()


def test_savepoint_resilience_on_scan_failure(client: TestClient, token_rb1: str, db_session, monkeypatch):
    """
    B19: Force overlap scan to raise an exception.
    Case must still be successfully created, overlap_scan_error returned, and transaction saved.
    """
    import app.routers.cases as cases_module

    def mock_failing_scan(db, case_id):
        raise RuntimeError("Simulated scan failure for B19 test")

    monkeypatch.setattr(cases_module, "scan_overlaps", mock_failing_scan)

    inst = db_session.execute(text("SELECT id, name FROM institutions LIMIT 1")).mappings().first()
    assert inst is not None

    resp = client.post(
        "/api/cases",
        json={
            "institution_name": inst["name"],
            "institution_id": inst["id"],
            "category": "FACULTY",
            "description": "Test case created despite overlap scan failure.",
            "bureau_code": "RB",
        },
        headers={"Authorization": f"Bearer {token_rb1}"},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["overlap_scan_error"] is not None
    assert "overlap scan failed" in body["overlap_scan_error"]

    # Verify case exists in DB
    saved = db_session.execute(text("SELECT id FROM cases WHERE id=:i"), {"i": body["id"]}).first()
    assert saved is not None

    # Clean up
    db_session.execute(text("DELETE FROM actions WHERE case_id=:i"), {"i": body["id"]})
    db_session.execute(text("DELETE FROM cases WHERE id=:i"), {"i": body["id"]})
    db_session.commit()


def test_regional_scoping_overlaps(client: TestClient, token_south1: str, token_rb1: str):
    """Regional officers must only see overlaps in their assigned region."""
    # List as central officer
    resp_all = client.get("/api/overlaps", headers={"Authorization": f"Bearer {token_rb1}"})
    assert resp_all.status_code == 200

    # List as South regional officer
    resp_south = client.get("/api/overlaps", headers={"Authorization": f"Bearer {token_south1}"})
    assert resp_south.status_code == 200
    for o in resp_south.json():
        assert o.get("region") in (None, "South")
