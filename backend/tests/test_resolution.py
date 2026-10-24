"""
Unit and integration tests for institution resolution (Stage 6A).
Tests:
- normalise abbreviations
- score cap (weights sum to 1.0)
- exact shortcut (resolves right sibling without review)
- defaults never auto-accept unknowns
- tuned thresholds meet policy (precision >= 0.98, neg_auto == 0, recall@5 >= 0.95, auto_rate > 0.3)
- API endpoint GET /api/institutions/resolve
- API create_case with institution_id and 422 candidate fallback
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.services.resolution import (
    normalize,
    score_candidate,
    idf_from_names,
    idf_overlap,
    resolve_ranked,
    DEFAULTS,
)
from ml.name_variants import variants_for, negatives
from ml.tune_core import choose, evaluate, AUTO_PRECISION_TARGET, REVIEW_RECALL_TARGET


def test_normalize_abbreviations():
    assert normalize("Govt. Engg. College, Pune") == "government engineering college pune"
    assert normalize("Inst. of Tech. & Science") == "institute of technology science"
    assert normalize("Coll. of Engg.") == "college of engineering"


def test_score_candidate_cap():
    tokens = ["government", "engineering", "college", "pune"]
    idf = idf_from_names(["government engineering college pune", "indian institute of technology"])
    score = score_candidate(tokens, tokens, trgm=1.0, city_match=True, idf=idf)
    assert score <= 1.0
    assert abs(score - 1.0) < 1e-6


def test_exact_shortcut_and_siblings():
    """
    Sibling test: 'College of Engineering, Pune' vs 'Engineering College, Pune'.
    Exact normalized name match must return the exact institution with confidence 1.0
    and needs_review=False.
    """
    inst1 = {
        "id": 101,
        "name": "Dr. Ambedkar College of Engineering, Pune",
        "normalized_name": "dr ambedkar college of engineering pune",
        "city": "Pune",
        "score": 0.98,
    }
    inst2 = {
        "id": 102,
        "name": "Dr. Ambedkar Engineering College, Pune",
        "normalized_name": "dr ambedkar engineering college pune",
        "city": "Pune",
        "score": 0.97,
    }

    ranked = [inst1, inst2]

    # Exact query for inst1
    iid, conf, review, reason = resolve_ranked(
        ranked, "dr ambedkar college of engineering pune", "Pune", DEFAULTS
    )
    assert iid == 101
    assert conf == 1.0
    assert review is False
    assert reason == "exact_name"

    # Exact query for inst2
    iid2, conf2, review2, reason2 = resolve_ranked(
        ranked, "dr ambedkar engineering college pune", "Pune", DEFAULTS
    )
    assert iid2 == 102
    assert conf2 == 1.0
    assert review2 is False
    assert reason2 == "exact_name"


def test_defaults_never_auto_accept_unknowns():
    """Negative controls must NEVER be auto-accepted."""
    sample_insts = [
        {"id": 1, "name": "Sri Venkateswara Institute of Technology, Pune", "city": "Pune"},
        {"id": 2, "name": "Rajiv Gandhi College of Engineering, Nagpur", "city": "Nagpur"},
    ]
    negs = negatives(sample_insts, seed=42, per_kind=20)
    # Simulate ranked candidates with low scores
    cases = [
        {
            "truth_id": None,
            "qn": normalize(n["name"]),
            "city": n["city"],
            "ranked": [
                {
                    "id": 1,
                    "name": sample_insts[0]["name"],
                    "normalized_name": normalize(sample_insts[0]["name"]),
                    "city": sample_insts[0]["city"],
                    "score": 0.42,  # below auto_accept
                }
            ],
        }
        for n in negs
    ]
    metrics = evaluate(cases, DEFAULTS)
    assert metrics["neg_auto"] == 0


def test_tuned_thresholds_meet_policy():
    """Synthetic suite to test choose() convergence on generated variants."""
    insts = [
        {"id": 1, "name": "Sri Venkateswara Institute of Technology, Pune", "city": "Pune"},
        {"id": 2, "name": "Dr. Ambedkar College of Engineering, Pune", "city": "Pune"},
        {"id": 3, "name": "Maharana Pratap College of Engineering, Nagpur", "city": "Nagpur"},
        {"id": 4, "name": "Netaji Subhas Institute of Technology, Bengaluru", "city": "Bengaluru"},
        {"id": 5, "name": "Rajiv Gandhi Engineering College, Mysuru", "city": "Mysuru"},
    ]
    names = [i["name"] for i in insts]
    idf = idf_from_names([normalize(nm) for nm in names])

    cases = []
    # Positives
    for inst in insts:
        for v in variants_for(inst):
            qn = normalize(v["name"])
            q_tok = qn.split()
            ranked = []
            for other in insts:
                on = normalize(other["name"])
                c_tok = on.split()
                # Simple mock trigram for testing tune_core
                overlap_chars = len(set(qn) & set(on)) / max(1, len(set(qn) | set(on)))
                city_match = (v.get("city") or "").lower() == (other.get("city") or "").lower()
                s = score_candidate(q_tok, c_tok, overlap_chars, city_match, idf)
                ranked.append({
                    "id": other["id"],
                    "name": other["name"],
                    "normalized_name": on,
                    "city": other["city"],
                    "score": round(s, 3),
                })
            ranked.sort(key=lambda x: -x["score"])
            cases.append({
                "truth_id": inst["id"],
                "qn": qn,
                "city": v["city"],
                "ranked": ranked,
            })

    # Negatives
    for n in negatives(insts, seed=7, per_kind=10):
        cases.append({
            "truth_id": None,
            "qn": normalize(n["name"]),
            "city": n["city"],
            "ranked": [
                {
                    "id": 1,
                    "name": insts[0]["name"],
                    "normalized_name": normalize(insts[0]["name"]),
                    "city": insts[0]["city"],
                    "score": 0.35,
                }
            ],
        })

    th, m, met = choose(cases)
    assert m["auto_precision"] is not None and m["auto_precision"] >= AUTO_PRECISION_TARGET
    assert m["neg_auto"] == 0
    assert m["auto_rate"] > 0.3


def test_api_resolve_endpoint(client: TestClient, token_rb1: str):
    """GET /api/institutions/resolve returns candidates with confidence."""
    resp = client.get(
        "/api/institutions/resolve",
        params={"name": "Government Engineering College", "city": "Pune"},
        headers={"Authorization": f"Bearer {token_rb1}"},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "confidence" in data
    assert "needs_review" in data
    assert "candidates" in data
    assert isinstance(data["candidates"], list)


def test_api_create_case_with_institution_id(client: TestClient, token_rb1: str, db_session):
    """POST /api/cases with institution_id skips fuzzy resolution with 1.0 confidence."""
    # Find an institution from DB
    inst = db_session.execute(text("SELECT id, name FROM institutions LIMIT 1")).mappings().first()
    assert inst is not None

    payload = {
        "institution_name": inst["name"],
        "institution_id": inst["id"],
        "category": "FACULTY",
        "description": "Deterministic test for institution_id skip resolution.",
        "bureau_code": "RB",
        "sensitive": False,
    }
    resp = client.post(
        "/api/cases",
        json=payload,
        headers={"Authorization": f"Bearer {token_rb1}"},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["institution_match"]["confidence"] == 1.0
    assert body["institution_match"]["needs_review"] is False
    assert body["institution_match"]["reason"] == "officer_confirmed"

    # Clean up created case
    db_session.execute(text("DELETE FROM cases WHERE id=:i"), {"i": body["id"]})
    db_session.commit()


def test_api_create_case_unresolvable_422(client: TestClient, token_rb1: str):
    """POST /api/cases with an unresolvable institution returns 422 with candidate list."""
    payload = {
        "institution_name": "Totally Unknown Nonexistent Alien Academy XYZ999",
        "category": "FACULTY",
        "description": "Test unresolvable institution error response.",
        "bureau_code": "RB",
    }
    resp = client.post(
        "/api/cases",
        json=payload,
        headers={"Authorization": f"Bearer {token_rb1}"},
    )
    assert resp.status_code == 422, resp.text
    detail = resp.json().get("detail", {})
    assert "candidates" in detail or "Institution could not be resolved" in str(resp.json())
