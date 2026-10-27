"""Evaluate synthetic labelled pairs on the training institution holdout."""
import json
import logging
from pathlib import Path
import joblib
import numpy as np
from sklearn.calibration import calibration_curve
from sklearn.metrics import average_precision_score
from sqlalchemy import text
from app.db import SessionLocal
from app.services.features import FEATURES
from ml.train_overlap import load_pairs, held_out_split, at

ART = Path(__file__).resolve().parent / "artifacts"
log = logging.getLogger(__name__)


def evaluate():
    version = (ART / "ACTIVE").read_text().strip()
    model = joblib.load(ART / f"{version}.joblib")
    if model.get("features") != FEATURES:
        raise ValueError("Active model feature contract mismatch")
    X, y, groups, metadata = load_pairs(include_metadata=True)
    _, test = held_out_split(X, y, groups)
    if "test_institutions" in model:
        test = np.flatnonzero(np.isin(groups, model["test_institutions"]))
    excluded = sum(not metadata[index]["labelled"] for index in test)
    test = np.array([index for index in test if metadata[index]["labelled"]], dtype=int)
    if len(test) == 0 or not y[test].any():
        raise ValueError("No positive labelled pairs in held-out institutions")
    probabilities = model["calibrated"].predict_proba(X[test])[:,1]
    cosine = X[test, FEATURES.index("cos")]
    labels = y[test]
    observed, predicted = calibration_curve(labels, probabilities, n_bins=5, strategy="quantile")
    def worst(indices, reverse):
        ranked = sorted(indices, key=lambda index: probabilities[index], reverse=reverse)[:10]
        return [{"case_a":metadata[test[index]]["case_a"], "case_b":metadata[test[index]]["case_b"],
                 "institution_id":int(groups[test[index]]), "probability":round(float(probabilities[index]),4)} for index in ranked]
    active_ids = {metadata[index][side] for index in test for side,flag in (("case_a","a_active"),("case_b","b_active")) if metadata[index][flag]}
    alerts = int(((probabilities >= model["t_med"]) & (X[test,FEATURES.index("both_active")] == 1)).sum())
    near_identical = float((cosine[labels == 1] >= 0.99).mean())
    result = {
        "version":version, "warning":"synthetic data; not real-world accuracy",
        "split":"training institution holdout; saved institution IDs when available, otherwise canonical seed-7 GroupShuffleSplit",
        "n_test_pairs":len(test), "excluded_unlabelled_pairs":excluded,
        "pr_auc":round(float(average_precision_score(labels,probabilities)),4),
        "high":{"threshold":model["t_high"], **at(labels,probabilities,model["t_high"])},
        "medium":{"threshold":model["t_med"], **at(labels,probabilities,model["t_med"])},
        "baseline":{"threshold":0.8, "pr_auc":round(float(average_precision_score(labels,cosine)),4), **at(labels,cosine,0.8)},
        "alerts_per_active_case":round(2 * alerts / max(1,len(active_ids)),4),
        "calibration":[{"mean_predicted":float(p),"observed":float(o)} for p,o in zip(predicted,observed)],
        "false_positives":worst(np.flatnonzero((labels == 0) & (probabilities >= model["t_med"])),True),
        "false_negatives":worst(np.flatnonzero((labels == 1) & (probabilities < model["t_med"])),False),
        "near_identical_positive_fraction":round(near_identical,4),
        "data_probably_too_easy":near_identical > 0.5,
    }
    (ART / f"{version}_eval.json").write_text(json.dumps(result,indent=2),encoding="utf-8")
    legacy = {"model_version":version,"evaluation_protocol":result["split"],"status":"SYNTHETIC_ONLY",
              "metrics_learned":{"pr_auc":result["pr_auc"],"high_threshold":result["high"]["threshold"],
                "high_precision":result["high"]["precision"],"high_recall":result["high"]["recall"],
                "medium_threshold":result["medium"]["threshold"],"medium_precision":result["medium"]["precision"],
                "medium_recall":result["medium"]["recall"]},
              "metrics_baseline":result["baseline"],"delta_pr_auc":round(result["pr_auc"]-result["baseline"]["pr_auc"],4),
              "top_false_positives":result["false_positives"],"top_false_negatives":result["false_negatives"],
              "warning":result["warning"]}
    (ART / "evaluation_report.json").write_text(json.dumps(legacy,indent=2),encoding="utf-8")
    with SessionLocal() as db:
        db.execute(text("UPDATE model_versions SET metrics=metrics || CAST(:m AS jsonb) WHERE id=:v"),
                   {"m":json.dumps({"evaluation":result}),"v":version})
        db.commit()
    return result


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO,format="%(message)s")
    result = evaluate()
    log.warning(result["warning"])
    if result["data_probably_too_easy"]:
        log.warning("Positive pairs are mostly near-identical; synthetic data is probably too easy")
    log.info(json.dumps(result,indent=2))
