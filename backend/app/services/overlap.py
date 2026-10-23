"""
Overlap detection service.

Scans for potentially overlapping cases when a new case is created or
when triggered by the periodic worker.

Pipeline:
  1. Load calibrated scorer from ml/artifacts/ACTIVE (falls back to cosine-only)
  2. Find same-institution cases with precomputed cosine similarity (pgvector)
  3. Build feature vectors
  4. Score each pair
  5. Classify: high | medium | info (or skip below threshold)
  6. Insert overlap_links ON CONFLICT DO NOTHING (idempotent)
  7. Generate alerts for high/medium overlaps

Classification rules (after calibration):
  - high:   p >= t_high AND both active AND cross-bureau
  - medium: p >= t_med  AND both active
  - info:   p >= t_med  (historical pairs)
"""
import json
from pathlib import Path

import joblib
from sqlalchemy import text

from .features import pair_features
from .routing import explain_overlap

ART = Path(__file__).parent.parent.parent / "ml" / "artifacts"
_cache: dict = {}


def load_model() -> dict | None:
    """Load active model from artifacts directory. Returns None if not trained yet."""
    if "m" not in _cache:
        ptr = ART / "ACTIVE"
        if not ptr.exists():
            return None
        version = joblib.load(ptr)
        _cache["m"] = joblib.load(ART / f"{version}.joblib")
    return _cache.get("m")


def reload_model() -> None:
    """Force reload (call after promoting a new model version)."""
    _cache.clear()


def score_pair(m: dict | None, a: dict, b: dict, cos: float) -> tuple[float, dict]:
    """
    Returns (probability, breakdown).
    breakdown maps feature_name → {value, contribution}.
    If model is not trained, falls back to cosine similarity only.
    """
    x = [pair_features(a, b, cos)]
    if m is None:
        return cos, {}

    p = float(m["calibrated"].predict_proba(x)[0, 1])

    # Explanation uses the plain LR (not calibrated) for interpretable contributions.
    # Contributions are directional bar widths in the UI.
    scaler = m["explain"].steps[0][1]
    lr = m["explain"].steps[1][1]
    scaled = scaler.transform(x)[0]
    contrib = (scaled * lr.coef_[0]).tolist()

    breakdown = {
        feat: {"value": round(val, 3), "contribution": round(cn, 3)}
        for feat, val, cn in zip(m["features"], x[0], contrib)
    }
    return p, breakdown


def classify(m: dict | None, p: float, a: dict, b: dict) -> str | None:
    """Return level string or None if below all thresholds."""
    t_high = m["t_high"] if m else 0.85
    t_med = m["t_med"] if m else 0.60
    both_active = a["closed_date"] is None and b["closed_date"] is None
    cross = a["bureau_id"] != b["bureau_id"]

    if p >= t_high and both_active and cross:
        return "high"
    if p >= t_med and both_active:
        return "medium"
    if p >= t_med:
        return "info"
    return None


def scan_overlaps(db, case_id: int) -> list[dict]:
    """
    Scan for overlaps involving case_id against same-institution cases.
    Returns list of {other, level, p} for any found overlaps.
    Idempotent: uses ON CONFLICT DO NOTHING.
    """
    m = load_model()

    me = db.execute(
        text(
            "SELECT id, institution_id, category, bureau_id, closed_date, "
            "received_date, inst_match_conf, sensitivity_flag "
            "FROM cases WHERE id=:i"
        ),
        {"i": case_id},
    ).mappings().one()

    me = dict(me)

    # Fetch same-institution cases with cosine similarity computed by pgvector
    others = db.execute(
        text(
            """
            SELECT c.id, c.category, c.bureau_id, c.closed_date, c.received_date,
                   c.inst_match_conf, c.case_ref,
                   1 - (c.embedding <=> (SELECT embedding FROM cases WHERE id=:i)) AS cos
            FROM cases c
            WHERE c.institution_id=:inst
              AND c.id <> :i
              AND c.embedding IS NOT NULL
            """
        ),
        {"i": case_id, "inst": me["institution_id"]},
    ).mappings().all()

    found = []
    for o in others:
        o = dict(o)
        cos = float(o["cos"]) if o["cos"] is not None else 0.0
        p, breakdown = score_pair(m, me, o, cos)
        level = classify(m, p, me, o)
        if not level:
            continue

        # Canonical ordering: always case_a < case_b
        a_id, b_id = sorted((case_id, o["id"]))

        text_, src = explain_overlap(
            db, breakdown, me, o, sensitive=bool(me["sensitivity_flag"])
        )

        row = db.execute(
            text(
                """
                INSERT INTO overlap_links
                  (case_a, case_b, level, probability, breakdown,
                   model_version, explanation, explanation_src)
                VALUES (:a, :b, :l, :p, CAST(:bd AS jsonb), :mv, :ex, :src)
                ON CONFLICT (case_a, case_b) DO NOTHING
                RETURNING id
                """
            ),
            {
                "a": a_id,
                "b": b_id,
                "l": level,
                "p": p,
                "bd": json.dumps(breakdown),
                "mv": m["version"] if m else "untrained",
                "ex": text_,
                "src": src,
            },
        ).first()

        if row and level in ("high", "medium"):
            # Alert both bureaus involved
            for bureau_id in {me["bureau_id"], o["bureau_id"]}:
                db.execute(
                    text(
                        "INSERT INTO alerts "
                        "(kind, case_id, overlap_id, bureau_id, message) "
                        "VALUES (:k, :c, :oid, :b, :msg)"
                    ),
                    {
                        "k": f"overlap_{level}",
                        "c": case_id,
                        "oid": row.id,
                        "b": bureau_id,
                        "msg": (
                            "Potential Overlapping Cases – Coordination Required"
                            if level == "high"
                            else "Related cases found for the same institution"
                        ),
                    },
                )

        found.append({"other": o["id"], "level": level, "p": round(p, 3)})

    return found
