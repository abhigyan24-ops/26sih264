"""
Institution resolution: answers "which institution is this complaint about?"

Resolution ladder:
  1. Exact AICTE Permanent ID match   → confidence 1.0, no review
  2. Trigram + IDF-weighted token similarity → auto-accept at AUTO_ACCEPT
  3. Below REVIEW_FLOOR → send to manual review

Parameters AUTO_ACCEPT and REVIEW_FLOOR are defaults pending real data.
They are written to parameter_registry with origin='default_pending_data' at
app startup (Stage 10 will tune them from officer-labelled name variants).

See CaseNexus_Modules_Pipelines_Theory.md Section 1.7 for IDF theory.
"""
import math
import re
from collections import Counter

from sqlalchemy import text

AUTO_ACCEPT = 0.85    # lowest score for automatic acceptance; pending_data
REVIEW_FLOOR = 0.55   # below this, cannot determine institution; pending_data

ABBR = [
    (r"\bgovt\.?\b", "government"),
    (r"\bengg\.?\b", "engineering"),
    (r"\binst\.?\b", "institute"),
    (r"\btech\.?\b", "technology"),
    (r"\bcoll\.?\b", "college"),
]


def normalize(s: str) -> str:
    s = s.lower()
    for pat, rep in ABBR:
        s = re.sub(pat, rep, s)
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def _tokens(s: str) -> list[str]:
    return normalize(s).split()


def idf_table(db) -> dict[str, float]:
    """
    Compute IDF weights from the institution master list.
    Generic words like 'college' get low weight automatically.
    w(t) = ln((N+1)/(df+1)) + 1  (add-1 smoothing)
    """
    rows = db.execute(text("SELECT normalized_name FROM institutions")).scalars().all()
    n = len(rows) or 1
    df = Counter(t for r in rows for t in set(r.split()))
    return {t: math.log((n + 1) / (c + 1)) + 1.0 for t, c in df.items()}


def idf_overlap(a: list[str], b: list[str], idf: dict[str, float]) -> float:
    """Weighted Jaccard similarity between two token lists."""
    sa, sb = set(a), set(b)
    if not sa or not sb:
        return 0.0
    w = lambda t: idf.get(t, math.log(2) + 1.0)
    inter = sum(w(t) for t in sa & sb)
    union = sum(w(t) for t in sa | sb)
    return inter / union if union else 0.0


def resolve_institution(
    db, aicte_id: str | None, name: str, city: str | None
) -> tuple[int | None, float, bool]:
    """
    Returns (institution_id | None, confidence, needs_review).

    needs_review=True means the match is uncertain and an officer should confirm.
    Never auto-merges institutions on weak fuzzy similarity alone.
    """
    # Rung 1: exact AICTE Permanent ID
    if aicte_id:
        row = db.execute(
            text("SELECT id FROM institutions WHERE aicte_permanent_id=:a"),
            {"a": aicte_id},
        ).first()
        if row:
            return row.id, 1.0, False

    # Rung 2+3: fuzzy name matching
    nn = normalize(name)
    cands = db.execute(
        text(
            "SELECT id, normalized_name, city, similarity(normalized_name, :n) AS trgm "
            "FROM institutions WHERE normalized_name % :n OR similarity(normalized_name, :n) > 0.2 "
            "ORDER BY trgm DESC LIMIT 5"
        ),
        {"n": nn},
    ).mappings().all()

    if not cands:
        return None, 0.0, True

    idf = idf_table(db)
    best, best_score = None, 0.0
    for c in cands:
        tok = idf_overlap(_tokens(name), c["normalized_name"].split(), idf)
        city_bonus = (
            0.1
            if city and c["city"] and city.lower() == c["city"].lower()
            else 0.0
        )
        score = min(1.0, 0.5 * c["trgm"] + 0.5 * tok + city_bonus)
        if score > best_score:
            best, best_score = c["id"], score

    if best_score >= AUTO_ACCEPT:
        return best, best_score, False
    if best_score >= REVIEW_FLOOR:
        return best, best_score, True
    return None, best_score, True
