"""
Tests for the feature builder.
These run without a database connection.
"""
from datetime import date
from app.services.features import pair_features, FEATURES


def make_case(**kwargs):
    defaults = {
        "category": "FEES",
        "bureau_id": 1,
        "closed_date": None,
        "received_date": date(2026, 1, 1),
        "inst_match_conf": 1.0,
    }
    return {**defaults, **kwargs}


def test_feature_vector_length():
    a = make_case()
    b = make_case(bureau_id=2)
    feats = pair_features(a, b, 0.8)
    assert len(feats) == len(FEATURES), f"Expected {len(FEATURES)} features, got {len(feats)}"


def test_cross_bureau_flag():
    a = make_case(bureau_id=1)
    b = make_case(bureau_id=2)
    feats = pair_features(a, b, 0.5)
    cross_idx = FEATURES.index("cross_bureau")
    assert feats[cross_idx] == 1.0


def test_same_bureau_no_cross_flag():
    a = make_case(bureau_id=1)
    b = make_case(bureau_id=1)
    feats = pair_features(a, b, 0.5)
    cross_idx = FEATURES.index("cross_bureau")
    assert feats[cross_idx] == 0.0


def test_same_category_flag():
    a = make_case(category="FEES")
    b = make_case(category="FEES")
    feats = pair_features(a, b, 0.5)
    cat_idx = FEATURES.index("same_category")
    assert feats[cat_idx] == 1.0


def test_different_category_no_flag():
    a = make_case(category="FEES")
    b = make_case(category="FACULTY")
    feats = pair_features(a, b, 0.5)
    cat_idx = FEATURES.index("same_category")
    assert feats[cat_idx] == 0.0


def test_both_active():
    a = make_case(closed_date=None)
    b = make_case(closed_date=None)
    feats = pair_features(a, b, 0.5)
    active_idx = FEATURES.index("both_active")
    assert feats[active_idx] == 1.0


def test_one_closed():
    a = make_case(closed_date=None)
    b = make_case(closed_date=date(2026, 3, 1))
    feats = pair_features(a, b, 0.5)
    active_idx = FEATURES.index("both_active")
    assert feats[active_idx] == 0.0


def test_inst_conf_min():
    a = make_case(inst_match_conf=0.9)
    b = make_case(inst_match_conf=0.7)
    feats = pair_features(a, b, 0.5)
    conf_idx = FEATURES.index("inst_conf")
    assert abs(feats[conf_idx] - 0.7) < 1e-6


def test_cos_passthrough():
    a = make_case()
    b = make_case()
    feats = pair_features(a, b, 0.75)
    cos_idx = FEATURES.index("cos")
    assert abs(feats[cos_idx] - 0.75) < 1e-6
