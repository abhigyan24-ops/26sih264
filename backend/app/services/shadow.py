"""Isolated shadow writes never create alerts or alter visible overlap decisions."""
import logging
from pathlib import Path
import joblib
from sqlalchemy import text
from .features import FEATURES

ART = Path(__file__).resolve().parents[2] / "ml" / "artifacts"
log = logging.getLogger(__name__)
_cache = {}


def shadow_score(db, case_a: int, case_b: int, feats: list[float]) -> None:
    try:
        with db.begin_nested():
            version = db.execute(text("SELECT id FROM model_versions WHERE kind='overlap' AND status='shadow' ORDER BY created_at DESC,id DESC LIMIT 1")).scalar()
            if version is None:
                return
            artifact = ART / f"{version}.joblib"
            key = (str(artifact), artifact.stat().st_mtime_ns)
            if _cache.get("key") != key:
                _cache.clear()
                _cache.update(key=key, model=joblib.load(artifact))
            model = _cache["model"]
            if model.get("features") != FEATURES or model.get("version") != version:
                raise ValueError("Shadow feature contract mismatch")
            probability = float(model["calibrated"].predict_proba([feats])[0,1])
            cases = db.execute(text("SELECT id,closed_date,bureau_id FROM cases WHERE id IN (:a,:b)"), {"a":case_a,"b":case_b}).mappings().all()
            if len(cases) != 2:
                return
            from .overlap import classify
            level = classify(probability, dict(cases[0]), dict(cases[1]), model["t_high"], model["t_med"]) or "none"
            db.execute(text("INSERT INTO shadow_scores(case_a,case_b,model_version,probability,level) "
                "VALUES(:a,:b,:v,:p,:l) ON CONFLICT(case_a,case_b,model_version) DO UPDATE "
                "SET probability=:p,level=:l,created_at=now()"),
                {"a":min(case_a,case_b),"b":max(case_a,case_b),"v":version,"p":probability,"l":level})
    except Exception:
        log.exception("Shadow scoring failed for %s/%s", case_a, case_b)
