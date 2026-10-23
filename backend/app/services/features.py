"""
Feature builder shared by training (ml/train_overlap.py) and runtime scanning.
Keeping features in one module prevents training/scoring skew.

Feature list (FEATURES) must be kept in sync with training data columns.
"""
import math
from datetime import date

# Canonical feature order — must match column order in training X matrix
FEATURES = ["inst_conf", "cos", "same_category", "log_days", "both_active", "cross_bureau"]


def pair_features(a: dict, b: dict, cos: float) -> list[float]:
    """
    Compute the 6-feature vector for a pair of cases.

    Args:
        a, b: dicts with keys: category, bureau_id, closed_date,
              received_date, inst_match_conf
        cos:  cosine similarity of their embeddings (pre-computed)

    Returns:
        list of 6 floats in FEATURES order
    """
    rd_a = a["received_date"]
    rd_b = b["received_date"]
    # Handle both date and datetime objects
    if hasattr(rd_a, "date"):
        rd_a = rd_a.date()
    if hasattr(rd_b, "date"):
        rd_b = rd_b.date()
    days = abs((rd_a - rd_b).days)

    return [
        float(min(a["inst_match_conf"], b["inst_match_conf"])),  # inst_conf
        float(cos),                                               # cos
        1.0 if a["category"] == b["category"] else 0.0,          # same_category
        float(math.log1p(days)),                                  # log_days
        1.0 if (a["closed_date"] is None and b["closed_date"] is None) else 0.0,  # both_active
        1.0 if a["bureau_id"] != b["bureau_id"] else 0.0,        # cross_bureau
    ]
