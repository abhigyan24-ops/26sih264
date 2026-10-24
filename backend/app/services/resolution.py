"""
Institution resolution. Pure functions are separated from database helpers so they can be unit-tested.
Implements deltas D1 to D4.
"""
import math
import re
from collections import Counter
from sqlalchemy import bindparam, text

W_TRGM, W_TOK, W_CITY = 0.45, 0.45, 0.10  # sum to 1.0 (D1)
DEFAULTS = {
    "resolver_auto_accept": 0.85,
    "resolver_review_floor": 0.55,
    "resolver_margin": 0.05,
}
CANDIDATE_LIMIT = 10  # D4
ABBR = [
    (r"\bgovt\.?\b", "government"),
    (r"\bengg\.?\b", "engineering"),
    (r"\binst\.?\b", "institute"),
    (r"\btech\.?\b", "technology"),
    (r"\bcoll\.?\b", "college"),
]


# ---------------- pure functions ----------------
def normalize(s: str) -> str:
    s = (s or "").lower()
    for pat, rep in ABBR:
        s = re.sub(pat, rep, s)
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def idf_from_names(names: list[str]) -> dict[str, float]:
    n = len(names) or 1
    df = Counter(t for nm in names for t in set(nm.split()))
    return {t: math.log((n + 1) / (c + 1)) + 1.0 for t, c in df.items()}


def idf_overlap(a: list[str], b: list[str], idf: dict[str, float]) -> float:
    sa, sb = set(a), set(b)
    if not sa or not sb:
        return 0.0
    default = math.log(2) + 1.0
    w = lambda t: idf.get(t, default)
    union = sum(w(t) for t in sa | sb)
    return sum(w(t) for t in sa & sb) / union if union else 0.0


def city_equal(a, b) -> bool:
    return bool(a) and bool(b) and a.strip().lower() == b.strip().lower()


def score_candidate(q_tokens, c_tokens, trgm: float, city_match: bool, idf) -> float:
    # D1: weights sum to 1.0, no min(1.0, ...) cap
    return W_TRGM * trgm + W_TOK * idf_overlap(q_tokens, c_tokens, idf) + (W_CITY if city_match else 0.0)


def decide(ranked: list[dict], th: dict):
    """
    ranked sorted by score desc.
    Returns (institution_id | None, confidence, needs_review, reason).
    """
    if not ranked:
        return None, 0.0, True, "no_candidates"
    best = ranked[0]
    second = ranked[1]["score"] if len(ranked) > 1 else 0.0
    if best["score"] < th["resolver_review_floor"]:
        return None, best["score"], True, "low_score"
    if best["score"] >= th["resolver_auto_accept"]:
        # D3: margin guard
        if best["score"] - second >= th["resolver_margin"]:
            return best["id"], best["score"], False, "auto"
        return best["id"], best["score"], True, "ambiguous"
    return best["id"], best["score"], True, "review"


def resolve_ranked(ranked, qn: str, city, th: dict):
    """
    D2: Exact normalised-name shortcut first, then the threshold rule.
    """
    exact = [c for c in ranked if c["normalized_name"] == qn]
    if city:
        exact = [c for c in exact if city_equal(city, c.get("city"))]
    if len(exact) == 1:
        return exact[0]["id"], 1.0, False, "exact_name"
    return decide(ranked, th)


# ---------------- database helpers ----------------
def load_thresholds(db) -> dict:
    """Read tuned thresholds from parameter_registry with fallback to DEFAULTS (D4)."""
    q = text("""
        SELECT DISTINCT ON (parameter) parameter, value
        FROM parameter_registry
        WHERE parameter IN :names
        ORDER BY parameter, created_at DESC, id DESC
    """).bindparams(bindparam("names", expanding=True))
    th = dict(DEFAULTS)
    for r in db.execute(q, {"names": list(DEFAULTS)}):
        try:
            th[r.parameter] = float(r.value)
        except (ValueError, TypeError):
            pass
    return th


def rank_candidates(db, name: str, city, limit: int = CANDIDATE_LIMIT) -> list[dict]:
    qn = normalize(name)
    if not qn:
        return []
    cands = db.execute(
        text("""
            SELECT id, name, normalized_name, city, similarity(normalized_name, :n) AS trgm
            FROM institutions
            WHERE normalized_name % :n
            ORDER BY trgm DESC
            LIMIT :lim
        """),
        {"n": qn, "lim": limit},
    ).mappings().all()
    if not cands:
        return []
    idf = idf_from_names(db.execute(text("SELECT normalized_name FROM institutions")).scalars().all())
    q_tok = qn.split()
    out = [
        {
            "id": c["id"],
            "name": c["name"],
            "city": c["city"],
            "normalized_name": c["normalized_name"],
            "trgm": round(float(c["trgm"]), 3),
            "score": score_candidate(
                q_tok,
                c["normalized_name"].split(),
                float(c["trgm"]),
                city_equal(city, c["city"]),
                idf,
            ),
        }
        for c in cands
    ]
    out.sort(key=lambda x: -x["score"])
    return out


def _public(ranked):
    return [
        {
            "id": c["id"],
            "name": c["name"],
            "city": c.get("city"),
            "score": round(c["score"], 3),
        }
        for c in ranked[:5]
    ]


def resolve_detailed(db, aicte_id, name: str, city) -> dict:
    th = load_thresholds(db)
    if aicte_id:
        row = db.execute(
            text("SELECT id, name, city FROM institutions WHERE aicte_permanent_id=:a"),
            {"a": aicte_id.strip()},
        ).first()
        if row:
            return {
                "institution_id": row.id,
                "confidence": 1.0,
                "needs_review": False,
                "reason": "aicte_id",
                "candidates": [{"id": row.id, "name": row.name, "city": row.city, "score": 1.0}],
            }
    ranked = rank_candidates(db, name, city)
    inst_id, conf, review, reason = resolve_ranked(ranked, normalize(name), city, th)
    return {
        "institution_id": inst_id,
        "confidence": round(conf, 4),
        "needs_review": review,
        "reason": reason,
        "candidates": _public(ranked),
    }


def resolve_institution(db, aicte_id, name, city):
    """Stage 3-compatible 3-tuple."""
    r = resolve_detailed(db, aicte_id, name, city)
    return r["institution_id"], r["confidence"], r["needs_review"]
