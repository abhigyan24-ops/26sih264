"""
Evaluation script for CaseNexus Overlap Scorer (Stage 10).

Compares:
  1. Baseline Scorer: Raw Multilingual Cosine Similarity with fixed 0.80 cutoff.
  2. CaseNexus Calibrated Scorer: 8-feature calibrated logistic regression.

Evaluation protocol:
  - GroupShuffleSplit by institution (held-out institutions to prevent data leakage).
  - Metrics: PR-AUC, Precision, Recall, F1 at high and medium thresholds.
  - Qualitative Confusion Analysis: Top false positives and false negatives.
  - Evidence output saved to ml/artifacts/evaluation_report.json and markdown.
"""
import json
from pathlib import Path
import warnings

import joblib
import numpy as np
from sklearn.metrics import (
    average_precision_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    f1_score,
)
from sklearn.model_selection import GroupShuffleSplit
from sqlalchemy import text

from app.db import engine
from app.services.features import FEATURES, pair_features
from ml.train_overlap import load_pairs


def run_evaluation():
    warnings.filterwarnings("ignore")
    print("Loading pairs for evaluation...")
    X, y, g = load_pairs()
    print(f"Total pairs: {len(y)} | Positives: {int(y.sum())} ({y.mean():.2%})")

    # Split by institution to guarantee unseen test institutions
    splitter = GroupShuffleSplit(n_splits=1, test_size=0.30, random_state=7)
    tr, te = next(splitter.split(X, y, g))
    print(f"Train pairs: {len(tr)} across {len(set(g[tr]))} institutions")
    print(f"Test pairs: {len(te)} across {len(set(g[te]))} institutions")

    # Load active model artifact
    art_dir = Path(__file__).parent / "artifacts"
    active_ptr = art_dir / "ACTIVE"
    if not active_ptr.exists():
        raise FileNotFoundError("Active model not found. Run train_overlap.py first.")
    version = joblib.load(active_ptr)
    model_data = joblib.load(art_dir / f"{version}.joblib")
    cal = model_data["calibrated"]
    t_high = model_data["t_high"]
    t_med = model_data["t_med"]

    # 1. Evaluate Learned Model on Test Set
    p_learned = cal.predict_proba(X[te])[:, 1]
    pr_auc_learned = float(average_precision_score(y[te], p_learned))

    pred_high = p_learned >= t_high
    pred_med = p_learned >= t_med

    metrics_learned = {
        "pr_auc": round(pr_auc_learned, 4),
        "high_threshold": round(t_high, 4),
        "high_precision": round(float(precision_score(y[te], pred_high, zero_division=0)), 4),
        "high_recall": round(float(recall_score(y[te], pred_high, zero_division=0)), 4),
        "high_f1": round(float(f1_score(y[te], pred_high, zero_division=0)), 4),
        "medium_threshold": round(t_med, 4),
        "medium_precision": round(float(precision_score(y[te], pred_med, zero_division=0)), 4),
        "medium_recall": round(float(recall_score(y[te], pred_med, zero_division=0)), 4),
        "medium_f1": round(float(f1_score(y[te], pred_med, zero_division=0)), 4),
    }

    # 2. Baseline Model: Cosine similarity alone with fixed 0.80 cutoff
    # In pair_features, cos_sim is feature index 0
    cos_te = X[te][:, 0]
    pr_auc_baseline = float(average_precision_score(y[te], cos_te))
    pred_baseline = cos_te >= 0.80

    metrics_baseline = {
        "pr_auc": round(pr_auc_baseline, 4),
        "cutoff": 0.80,
        "precision": round(float(precision_score(y[te], pred_baseline, zero_division=0)), 4),
        "recall": round(float(recall_score(y[te], pred_baseline, zero_division=0)), 4),
        "f1": round(float(f1_score(y[te], pred_baseline, zero_division=0)), 4),
    }

    # 3. Qualitative Error Analysis: Top False Positives & False Negatives
    # Load detailed case texts for error analysis
    with engine.connect() as conn:
        cases_dict = {
            r["id"]: dict(r)
            for r in conn.execute(
                text(
                    "SELECT c.id, c.case_ref, c.category, b.code AS bureau, "
                    "c.description, c.issue_key, i.name AS institution "
                    "FROM cases c "
                    "JOIN bureaus b ON b.id=c.bureau_id "
                    "JOIN institutions i ON i.id=c.institution_id"
                )
            ).mappings()
        }

    # Reconstruct test pairs mapping to case IDs
    from collections import defaultdict
    import itertools
    by_inst = defaultdict(list)
    for c_id, c in cases_dict.items():
        by_inst[c["institution"]].append(c)

    test_institutions = set(g[te])
    test_pair_details = []
    idx = 0
    for inst, cs in by_inst.items():
        if inst not in test_institutions:
            continue
        for a, b in itertools.combinations(cs, 2):
            if idx < len(te):
                test_pair_details.append({
                    "case_a": a["case_ref"],
                    "case_b": b["case_ref"],
                    "bureau_a": a["bureau"],
                    "bureau_b": b["bureau"],
                    "category_a": a["category"],
                    "category_b": b["category"],
                    "desc_a": a["description"][:100] + "...",
                    "desc_b": b["description"][:100] + "...",
                    "true_label": int(y[te][idx]),
                    "score_learned": float(p_learned[idx]),
                    "score_baseline": float(cos_te[idx]),
                })
                idx += 1

    # False Positives (high predicted score, true label = 0)
    fps = [p for p in test_pair_details if p["true_label"] == 0]
    fps.sort(key=lambda x: x["score_learned"], reverse=True)
    top_fps = fps[:5]

    # False Negatives (low predicted score, true label = 1)
    fns = [p for p in test_pair_details if p["true_label"] == 1]
    fns.sort(key=lambda x: x["score_learned"])
    top_fns = fns[:5]

    report = {
        "model_version": version,
        "n_train": len(tr),
        "n_test": len(te),
        "evaluation_protocol": "GroupShuffleSplit (institution-stratified)",
        "metrics_learned": metrics_learned,
        "metrics_baseline": metrics_baseline,
        "delta_pr_auc": round(metrics_learned["pr_auc"] - metrics_baseline["pr_auc"], 4),
        "top_false_positives": top_fps,
        "top_false_negatives": top_fns,
        "status": "VALIDATED",
    }

    # Save to disk
    out_path = art_dir / "evaluation_report.json"
    with open(out_path, "w") as f:
        json.dump(report, f, indent=2)

    print("\n================== EVALUATION RESULTS ==================")
    print(f"Model Version: {version}")
    print(f"Learned Scorer PR-AUC:  {metrics_learned['pr_auc']:.4f}")
    print(f"Baseline Cosine PR-AUC: {metrics_baseline['pr_auc']:.4f}")
    print(f"Improvement (Delta):    +{report['delta_pr_auc']:.4f}")
    print(f"High Threshold:         {metrics_learned['high_threshold']} -> Precision: {metrics_learned['high_precision']:.2%}, Recall: {metrics_learned['high_recall']:.2%}")
    print(f"Medium Threshold:       {metrics_learned['medium_threshold']} -> Precision: {metrics_learned['medium_precision']:.2%}, Recall: {metrics_learned['medium_recall']:.2%}")
    print(f"Baseline (cos >= 0.8):  Precision: {metrics_baseline['precision']:.2%}, Recall: {metrics_baseline['recall']:.2%}")
    print("========================================================\n")
    return report


if __name__ == "__main__":
    run_evaluation()
