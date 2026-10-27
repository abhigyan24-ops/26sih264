"""
Overlap detection service implementing D9, D10, D17, D19.
- Plain-text ACTIVE pointer checked on each scan (retraining hot-reload)
- Feature set validation (train/serve skew protection)
- Idempotent pair checking
- Bi-directional sensitivity check
- Savepoint-safe execution
"""
import json
import logging
from pathlib import Path

import joblib
from sqlalchemy import text

from .features import FEATURES, pair_features
from .routing import explain_overlap
from .shadow import shadow_score

log = logging.getLogger(__name__)
ART = Path(__file__).resolve().parent.parent.parent / "ml" / "artifacts"
UNTRAINED_T_HIGH, UNTRAINED_T_MED = 0.85, 0.60
_cache: dict = {}


def load_model() -> dict | None:
    """
    Load active model from ml/artifacts/ACTIVE.
    Re-reads ACTIVE on each scan so retraining is picked up without server restart (D10).
    Validates features match canonical FEATURES list (D17).
    """
    ptr = ART / "ACTIVE"
    if not ptr.exists():
        return None
    try:
        ver = ptr.read_text().strip()
    except Exception:
        return None

    if _cache.get("ver") != ver:
        artifact_path = ART / f"{ver}.joblib"
        if not artifact_path.exists():
            return None
        m = joblib.load(artifact_path)
        if m.get("features") != FEATURES:
            raise RuntimeError(
                f"Model {ver} was trained on {m.get('features')}, "
                f"code expects {FEATURES}; retraining required."
            )
        _cache.update(ver=ver, m=m)
    return _cache.get("m")


def reload_model() -> None:
    """Clear memory cache to force re-reading model from disk."""
    _cache.clear()


def score_pair(m: dict | None, a: dict, b: dict, cos: float) -> tuple[float, dict]:
    """
    Returns (probability, breakdown).
    Breakdown contains {feature: {value, contribution}} for transparent explanation bars.
    """
    x = [pair_features(a, b, cos)]
    if not m:
        return float(cos), {}

    p = float(m["calibrated"].predict_proba(x)[0, 1])
    scaler = m["explain"].steps[0][1]
    lr = m["explain"].steps[1][1]
    scaled = scaler.transform(x)[0]
    contrib = (scaled * lr.coef_[0]).tolist()
    breakdown = {
        f: {"value": round(v, 3), "contribution": round(c, 3)}
        for f, v, c in zip(m["features"], x[0], contrib)
    }
    return p, breakdown


def classify(p: float, a: dict, b: dict, t_high: float, t_med: float) -> str | None:
    """
    D19: Overlap level classification rules:
    - High: p >= t_high AND both open AND different bureaus
    - Medium: p >= t_med AND both open (includes same-bureau high-p pairs)
    - Info: p >= t_med AND at least one case closed
    - None: p < t_med
    """
    both_active = a["closed_date"] is None and b["closed_date"] is None
    if p >= t_high and both_active and a["bureau_id"] != b["bureau_id"]:
        return "high"
    if p >= t_med and both_active:
        return "medium"
    if p >= t_med:
        return "info"
    return None


def scan_overlaps(db, case_id: int, max_candidates: int = 200) -> list[dict]:
    """
    Scan for overlaps involving case_id against same-institution cases.
    Returns list of found overlaps.
    Idempotent: skips already existing pairs.
    """
    m = load_model()
    t_high = m["t_high"] if m else UNTRAINED_T_HIGH
    t_med = m["t_med"] if m else UNTRAINED_T_MED

    me_row = db.execute(
        text("""
            SELECT id, institution_id, category, bureau_id, closed_date,
                   received_date, inst_match_conf, sensitivity_flag
            FROM cases WHERE id=:i
        """),
        {"i": case_id},
    ).mappings().one_or_none()

    if not me_row:
        return []

    me = dict(me_row)

    others = db.execute(
        text("""
            SELECT c.id, c.case_ref, c.category, c.bureau_id, c.closed_date,
                   c.received_date, c.inst_match_conf, c.sensitivity_flag,
                   1 - (c.embedding <=> m.embedding) AS cos
            FROM cases c, (SELECT embedding FROM cases WHERE id=:i) m
            WHERE c.institution_id=:inst
              AND c.id <> :i
              AND c.embedding IS NOT NULL
              AND m.embedding IS NOT NULL
            ORDER BY c.received_date DESC
            LIMIT :lim
        """),
        {"i": case_id, "inst": me["institution_id"], "lim": max_candidates},
    ).mappings().all()

    found = []
    for o_row in others:
        o = dict(o_row)
        a_id, b_id = sorted((case_id, o["id"]))

        # Idempotency check: skip already evaluated pairs (D9)
        existing = db.execute(
            text("SELECT 1 FROM overlap_links WHERE case_a=:a AND case_b=:b"),
            {"a": a_id, "b": b_id},
        ).first()
        if existing:
            continue

        cos = float(o["cos"]) if o["cos"] is not None else 0.0
        p, breakdown = score_pair(m, me, o, cos)
        level = classify(p, me, o, t_high, t_med)
        if not level:
            continue

        # D9: Sensitive if either case is flagged sensitive
        sensitive = bool(me.get("sensitivity_flag")) or bool(o.get("sensitivity_flag"))
        expl, src = explain_overlap(db, breakdown, me, o, sensitive=sensitive)

        row = db.execute(
            text("""
                INSERT INTO overlap_links
                  (case_a, case_b, level, probability, breakdown,
                   model_version, explanation, explanation_src)
                VALUES
                  (:a, :b, :l, :p, CAST(:bd AS jsonb), :mv, :ex, :src)
                ON CONFLICT (case_a, case_b) DO NOTHING
                RETURNING id
            """),
            {
                "a": a_id,
                "b": b_id,
                "l": level,
                "p": round(p, 4),
                "bd": json.dumps(breakdown),
                "mv": m["version"] if m else "untrained",
                "ex": expl,
                "src": src,
            },
        ).first()

        if row:
            overlap_id = row.id
            if level in ("high", "medium"):
                msg = (
                    "Potential Overlapping Cases – Coordination Required"
                    if level == "high"
                    else "Related cases found for the same institution"
                )
                for bureau in {me["bureau_id"], o["bureau_id"]}:
                    db.execute(
                        text("""
                            INSERT INTO alerts (kind, case_id, overlap_id, bureau_id, message)
                            VALUES (:k, :c, :o, :b, :m)
                        """),
                        {
                            "k": f"overlap_{level}",
                            "c": case_id,
                            "o": overlap_id,
                            "b": bureau,
                            "m": msg,
                        },
                    )

            try:
                with db.begin_nested():
                    shadow_score(db, a_id, b_id, pair_features(me, o, cos))
            except Exception:
                log.exception("shadow scoring failed for pair %s/%s", a_id, b_id)

            found.append({
                "overlap_id": overlap_id,
                "other_case_id": o["id"],
                "other_case_ref": o.get("case_ref"),
                "level": level,
                "probability": round(p, 3),
                "breakdown": breakdown,
                "explanation": expl,
                "explanation_src": src,
            })

    return found
