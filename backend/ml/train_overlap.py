"""
Overlap scorer training.

Run from backend/:
    python -m ml.train_overlap

Loads seed data, builds pair features (EXCLUDES issue_key from features),
trains a calibrated logistic regression, selects thresholds by policy targets,
saves the model artifact, and writes results to model_versions and parameter_registry.

Split strategy: by institution to prevent leakage (same institution's cases
never appear in both train and test sets).

Ground truth: a pair is positive iff both cases share the same issue_key
AND the same institution. This is the seed evaluation label only.
It is never used as a model feature.
"""
import datetime
import itertools
import json
from collections import defaultdict

import joblib
import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, precision_recall_curve
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sqlalchemy import text

from app.db import engine
from app.services.features import FEATURES, pair_features

# Policy targets (recorded in parameter_registry; NOT ground truth)
TARGET_PRECISION_HIGH = 0.90   # high alerts must be precise: false alarms cause fatigue
TARGET_RECALL_MEDIUM = 0.90    # medium alerts must catch most real overlaps


def load_pairs():
    """
    Load all cases with embeddings, build all same-institution pairs.
    Returns X (features), y (labels), g (institution groups for split).
    """
    with engine.connect() as c:
        rows = c.execute(
            text(
                """
                SELECT id, institution_id, category, bureau_id, closed_date,
                       received_date, inst_match_conf, issue_key,
                       embedding::text AS emb
                FROM cases
                WHERE embedding IS NOT NULL
                """
            )
        ).mappings().all()

    by_inst: dict = defaultdict(list)
    for r in rows:
        d = dict(r)
        d["vec"] = np.array(json.loads(d["emb"]))
        by_inst[d["institution_id"]].append(d)

    X, y, g = [], [], []
    for inst, cs in by_inst.items():
        for a, b in itertools.combinations(cs, 2):
            norm_a = np.linalg.norm(a["vec"])
            norm_b = np.linalg.norm(b["vec"])
            if norm_a == 0 or norm_b == 0:
                continue
            cos = float(a["vec"] @ b["vec"] / (norm_a * norm_b))
            # Label: same institution (guaranteed by grouping) AND same issue
            label = int(
                a["issue_key"] is not None
                and b["issue_key"] is not None
                and a["issue_key"] == b["issue_key"]
            )
            X.append(pair_features(a, b, cos))
            y.append(label)
            g.append(inst)

    return np.array(X), np.array(y), np.array(g)


def main():
    X, y, g = load_pairs()
    n_pos = int(y.sum())
    print(f"Pairs: {len(y)} total | {n_pos} positive ({y.mean():.1%})")

    if len(y) < 10:
        print("ERROR: Too few pairs to train. Run seed.py first.")
        return

    # Group-split by institution to prevent leakage
    splitter = GroupShuffleSplit(n_splits=1, test_size=0.30, random_state=7)
    tr, te = next(splitter.split(X, y, g))

    # Calibrated model (for probability outputs)
    base_pipe = make_pipeline(
        StandardScaler(),
        LogisticRegression(class_weight="balanced", max_iter=1000),
    )
    cal = CalibratedClassifierCV(base_pipe, method="sigmoid", cv=5)
    cal.fit(X[tr], y[tr])

    # Plain logistic for interpretable feature contributions (bars in the UI)
    explain_pipe = make_pipeline(
        StandardScaler(),
        LogisticRegression(class_weight="balanced", max_iter=1000),
    )
    explain_pipe.fit(X[tr], y[tr])

    # Evaluate on held-out set
    p = cal.predict_proba(X[te])[:, 1]
    prec_curve, rec_curve, thr_curve = precision_recall_curve(y[te], p)

    # Threshold selection
    ok_hi = [t for pr, t in zip(prec_curve[:-1], thr_curve) if pr >= TARGET_PRECISION_HIGH]
    ok_me = [t for rc, t in zip(rec_curve[:-1], thr_curve) if rc >= TARGET_RECALL_MEDIUM]
    t_high = float(min(ok_hi)) if ok_hi else 0.90
    t_med = float(max(ok_me)) if ok_me else 0.55
    t_med = min(t_med, t_high)

    def metrics_at(t: float) -> dict:
        pred = p >= t
        tp = int((pred & (y[te] == 1)).sum())
        fp = int((pred & (y[te] == 0)).sum())
        fn = int((~pred & (y[te] == 1)).sum())
        prec = tp / max(1, tp + fp)
        rec = tp / max(1, tp + fn)
        f1 = 2 * prec * rec / max(1e-9, prec + rec)
        return {
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1": round(f1, 4),
            "tp": tp, "fp": fp, "fn": fn,
            "flagged": int(pred.sum()),
        }

    pr_auc = float(average_precision_score(y[te], p))
    metrics = {
        "pr_auc": round(pr_auc, 4),
        "high": metrics_at(t_high),
        "medium": metrics_at(t_med),
        "n_train": int(len(tr)),
        "n_test": int(len(te)),
        "split": "grouped by institution",
        "data_note": "SYNTHETIC EVALUATION — metrics from synthetic seed data only",
        "features": FEATURES,
    }

    print(json.dumps(metrics, indent=2))
    print(f"t_high={t_high:.4f}  t_med={t_med:.4f}")

    if not ok_hi:
        print(
            "WARNING: No threshold meets the target precision of "
            f"{TARGET_PRECISION_HIGH}. t_high set to 0.90. "
            "Inspect the data — positives may be too easy or too noisy."
        )

    version = "overlap-" + datetime.datetime.now().strftime("%Y%m%d-%H%M")
    artifact = {
        "calibrated": cal,
        "explain": explain_pipe,
        "features": FEATURES,
        "t_high": t_high,
        "t_med": t_med,
        "version": version,
    }

    from pathlib import Path
    art_dir = Path(__file__).parent / "artifacts"
    art_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, art_dir / f"{version}.joblib")
    joblib.dump(version, art_dir / "ACTIVE")
    print(f"Saved: {art_dir / version}.joblib")
    print(f"Active pointer: {art_dir / 'ACTIVE'} → {version}")

    with engine.begin() as c:
        c.execute(
            text(
                "INSERT INTO model_versions (id,kind,trained_on,metrics,status) "
                "VALUES (:i,'overlap',:t,CAST(:m AS jsonb),'active') "
                "ON CONFLICT (id) DO NOTHING"
            ),
            {
                "i": version,
                "t": "synthetic seed v1 (SYNTHETIC EVALUATION)",
                "m": json.dumps(metrics),
            },
        )
        for name, val, origin_note in [
            ("overlap_threshold_high", t_high,
             f"target precision {TARGET_PRECISION_HIGH} on synthetic data"),
            ("overlap_threshold_medium", t_med,
             f"target recall {TARGET_RECALL_MEDIUM} on synthetic data"),
        ]:
            c.execute(
                text(
                    "INSERT INTO parameter_registry "
                    "(parameter,value,origin,derived_from,metrics,model_version) "
                    "VALUES (:p,:v,'learned_synthetic',:d,CAST(:m AS jsonb),:mv)"
                ),
                {
                    "p": name,
                    "v": f"{val:.4f}",
                    "d": origin_note,
                    "m": json.dumps(metrics),
                    "mv": version,
                },
            )
    print("✓ Model version and parameters written to database.")


if __name__ == "__main__":
    main()
