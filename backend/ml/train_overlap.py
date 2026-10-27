"""
Run from backend/:  python -m ml.train_overlap

Overlap scorer training implementing D10 to D14:
- Grouped cross-validation (StratifiedGroupKFold) for calibration
- Out-of-fold threshold selection on train split; test split held-out
- Plain-text ACTIVE pointer
- Diagnostics: cosine baseline, Brier score, 5-bin reliability table, near-identical text fraction
"""
import argparse
import datetime
import itertools
import json
from collections import defaultdict
from pathlib import Path

import joblib
import numpy as np
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, brier_score_loss, precision_recall_curve
from sklearn.model_selection import GroupShuffleSplit, StratifiedGroupKFold
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sqlalchemy import text

from app.db import engine
from app.services.features import FEATURES, pair_features

TARGET_PRECISION_HIGH = 0.90      # policy
TARGET_RECALL_MEDIUM = 0.90       # policy
MIN_FLAGGED = 10                  # a threshold must flag at least this many out-of-fold pairs to count
MIN_POS_ALL, MIN_POS_TRAIN = 50, 25
ART = Path("ml/artifacts")


def _base():
    return make_pipeline(StandardScaler(), LogisticRegression(class_weight="balanced", max_iter=1000))


def make_calibrated(X, y, g):
    """Calibration folds are grouped by institution (no leakage). Needs >= 5 positives per fold."""
    splits = list(StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=7).split(X, y, g))
    return CalibratedClassifierCV(_base(), method="sigmoid", cv=splits).fit(X, y)


def oof_probs(X, y, g):
    oof = np.zeros(len(y))
    for tr, va in StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=11).split(X, y, g):
        oof[va] = make_calibrated(X[tr], y[tr], g[tr]).predict_proba(X[va])[:, 1]
    return oof


def select_thresholds(y, p):
    prec, rec, thr = precision_recall_curve(y, p)
    prec, rec = prec[:-1], rec[:-1]
    flagged = (p[:, None] >= thr[None, :]).sum(axis=0)
    ok_hi = thr[(prec >= TARGET_PRECISION_HIGH) & (flagged >= MIN_FLAGGED)]
    ok_me = thr[rec >= TARGET_RECALL_MEDIUM]
    hi_met, me_met = len(ok_hi) > 0, len(ok_me) > 0
    t_high = float(ok_hi.min()) if hi_met else 0.90          # fallback, labelled default_pending_data
    t_med = float(ok_me.max()) if me_met else 0.50
    return {
        "t_high": round(t_high, 4),
        "t_med": round(min(t_med, t_high), 4),
        "high_origin": "learned_synthetic" if hi_met else "default_pending_data",
        "med_origin": "learned_synthetic" if me_met else "default_pending_data",
    }


def at(y, p, t):
    pred = p >= t
    tp = int((pred & (y == 1)).sum())
    n = int(pred.sum())
    return {
        "flagged": n,
        "precision": round(tp / n, 4) if n else None,
        "recall": round(tp / max(1, int(y.sum())), 4),
    }


def load_pairs(include_metadata=False):
    """
    Load all cases with embeddings from DB, build all same-institution pairs.
    Returns X (features), y (labels), g (institution groups for split).
    """
    with engine.connect() as c:
        rows = c.execute(
            text("""
                SELECT id, institution_id, category, bureau_id, closed_date,
                       received_date, inst_match_conf, issue_key,
                       embedding::text AS emb
                FROM cases
                WHERE embedding IS NOT NULL AND issue_key IS NOT NULL
            """)
        ).mappings().all()

    by_inst: dict = defaultdict(list)
    for r in rows:
        d = dict(r)
        d["vec"] = np.array(json.loads(d["emb"]))
        by_inst[d["institution_id"]].append(d)

    X, y, g, metadata = [], [], [], []
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
            metadata.append({"case_a": a["id"], "case_b": b["id"], "institution_id": inst,
                             "labelled": a["issue_key"] is not None and b["issue_key"] is not None,
                             "a_active": a["closed_date"] is None, "b_active": b["closed_date"] is None})

    arrays = (np.array(X), np.array(y), np.array(g))
    return (*arrays, metadata) if include_metadata else arrays


def held_out_split(X, y, groups):
    """Canonical split reused by training and evaluation."""
    return next(GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=7).split(X, y, groups))


def main(shadow=False):
    X, y, g = load_pairs()
    n_pos = int(y.sum())
    print(f"Pairs: {len(y)} total | {n_pos} positive ({y.mean():.1%}) across {len(set(g))} institutions")

    if n_pos < MIN_POS_ALL:
        raise SystemExit(
            f"Only {n_pos} positive pairs; need >= {MIN_POS_ALL}. Re-seed with more institutions."
        )

    tr, te = held_out_split(X, y, g)
    if y[tr].sum() < MIN_POS_TRAIN:
        raise SystemExit("Too few positive training pairs; re-seed with more institutions.")

    # Thresholds from out-of-fold probabilities on train only (D12)
    p_oof = oof_probs(X[tr], y[tr], g[tr])
    sel = select_thresholds(y[tr], p_oof)

    cal = make_calibrated(X[tr], y[tr], g[tr])
    explain = _base().fit(X[tr], y[tr])

    # Evaluate held-out TEST institutions
    p_te = cal.predict_proba(X[te])[:, 1]
    cos_te = X[te][:, FEATURES.index("cos")]
    base_pred = cos_te >= 0.80  # baseline: cosine alone at 0.80
    btp = int((base_pred & (y[te] == 1)).sum())

    frac, mean_p = calibration_curve(y[te], p_te, n_bins=5, strategy="quantile")

    metrics = {
        "split": "grouped by institution, 20% test, thresholds from out-of-fold predictions on train",
        "n_pairs": int(len(y)),
        "n_pos_train": int(y[tr].sum()),
        "n_pos_test": int(y[te].sum()),
        "pr_auc_test": round(float(average_precision_score(y[te], p_te)), 4),
        "brier_test": round(float(brier_score_loss(y[te], p_te)), 4),
        "high": at(y[te], p_te, sel["t_high"]),
        "medium": at(y[te], p_te, sel["t_med"]),
        "baseline_cos_0.80": {
            "flagged": int(base_pred.sum()),
            "precision": round(btp / int(base_pred.sum()), 4) if base_pred.sum() else None,
            "recall": round(btp / max(1, int(y[te].sum())), 4),
        },
        "reliability_5bin": {
            "mean_predicted": mean_p.round(3).tolist(),
            "observed": frac.round(3).tolist(),
        },
        "positives_with_cos>=0.99": round(float((X[:, FEATURES.index("cos")][y == 1] >= 0.99).mean()), 4),
        "note": "synthetic data; probabilities calibrated to the synthetic base rate",
    }

    version = "overlap-" + datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    ART.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "calibrated": cal,
            "explain": explain,
            "features": FEATURES,
            "t_high": sel["t_high"],
            "t_med": sel["t_med"],
            "version": version,
            "test_institutions": sorted(set(g[te].tolist())),
        },
        ART / f"{version}.joblib",
    )

    from ml.promote import publication_connection, write_active_pointer
    with publication_connection() as connection:
        with connection.begin():
            c = connection
            if not shadow:
                c.execute(text("UPDATE model_versions SET status='retired' WHERE kind='overlap' AND status='active'"))
            c.execute(
                text("""
                    INSERT INTO model_versions (id, kind, trained_on, metrics, status)
                    VALUES (:i, 'overlap', :t, CAST(:m AS jsonb), :status)
                """),
                {"i": version, "t": "synthetic seed", "m": json.dumps(metrics), "status": "shadow" if shadow else "active"},
            )
            for name, val, origin in ([] if shadow else [
                ("overlap_threshold_high", sel["t_high"], sel["high_origin"]),
                ("overlap_threshold_medium", sel["t_med"], sel["med_origin"]),
            ]):
                c.execute(
                    text("""
                        INSERT INTO parameter_registry (parameter, value, origin, derived_from, metrics, model_version)
                        VALUES (:p, :v, :o, :d, CAST(:m AS jsonb), :mv)
                    """),
                    {
                        "p": name,
                        "v": f"{val:.4f}",
                        "o": origin,
                        "mv": version,
                        "m": json.dumps(metrics),
                        "d": f"out-of-fold; target precision {TARGET_PRECISION_HIGH} / recall {TARGET_RECALL_MEDIUM}",
                    },
                )

        if not shadow:
            write_active_pointer(version)
    print(json.dumps({"version": version, "status": "shadow" if shadow else "active", **metrics}, indent=2))

    # Interpretation rules
    high_prec = metrics["high"]["precision"]
    if high_prec is not None and high_prec < 0.90:
        print(f"[NOTE] High precision on TEST is {high_prec:.1%} (< 90%). Met out-of-fold but lower on held-out institutions.")
    if metrics["positives_with_cos>=0.99"] > 0.5:
        print("[NOTE] Positive pairs are mostly near-identical text; this synthetic set is probably too easy. Do not quote these numbers as accuracy.")
    base_prec = metrics["baseline_cos_0.80"]["precision"]
    base_rec = metrics["baseline_cos_0.80"]["recall"]
    if base_prec and high_prec and abs(base_prec - high_prec) <= 0.02 and abs(base_rec - metrics["high"]["recall"]) <= 0.02:
        print("[NOTE] Cosine-only baseline matches the full model within 2% precision and recall on this synthetic set.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--shadow", action="store_true")
    main(shadow=parser.parse_args().shadow)
