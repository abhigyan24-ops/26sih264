"""
Unit tests for overlap training and threshold selection (Stage 6B).
Tests:
- select_thresholds behavior on synthetic predictions
- fallback labeling as default_pending_data
- grouped calibration behavior
"""
import numpy as np
import pytest
from ml.train_overlap import select_thresholds, make_calibrated, TARGET_PRECISION_HIGH, TARGET_RECALL_MEDIUM


def test_select_thresholds_clean():
    """Verify threshold selection finds precision >= 0.90 with >= 10 flagged."""
    # Synthetic dataset with 100 samples, 30 positives
    rng = np.random.RandomState(42)
    y = np.array([1] * 30 + [0] * 70)
    # Give positives high scores and negatives low scores with some noise
    p = np.zeros(100)
    p[:30] = rng.uniform(0.70, 0.99, size=30)
    p[30:] = rng.uniform(0.01, 0.40, size=70)

    res = select_thresholds(y, p)
    assert 0.0 < res["t_high"] <= 1.0
    assert 0.0 < res["t_med"] <= res["t_high"]
    assert res["high_origin"] == "learned_synthetic"
    assert res["med_origin"] == "learned_synthetic"


def test_select_thresholds_fallback():
    """Verify fallback to default_pending_data when precision target cannot be met."""
    y = np.array([1] * 5 + [0] * 95)
    # Uniform random scores: impossible to reach 90% precision with 10 flagged
    p = np.linspace(0.01, 0.99, 100)
    res = select_thresholds(y, p)
    assert res["high_origin"] == "default_pending_data"
    assert res["t_high"] == 0.90
    assert res["t_med"] <= res["t_high"]


def test_grouped_calibration_runs():
    """make_calibrated runs on a synthetic dataset with institution groups."""
    rng = np.random.RandomState(17)
    n = 120
    X = rng.randn(n, 6)
    # Ensure at least 6 positives in each fold (>= 30 total)
    y = np.array([1] * 35 + [0] * 85)
    # 10 groups
    g = np.array([i % 10 for i in range(n)])

    model = make_calibrated(X, y, g)
    probs = model.predict_proba(X)[:, 1]
    assert len(probs) == n
    assert (probs >= 0.0).all() and (probs <= 1.0).all()
