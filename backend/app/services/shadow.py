"""
Shadow scoring stub (Stage 10).

shadow_score is a no-op at Stage 7/8/9. It will be filled in by T60
to score a pair against the shadow model and write to shadow_scores.

Design contract:
  - Must never raise — any failure is caught and ignored.
  - Must never write to overlap_links, alerts, or any visible table.
  - Must be called AFTER the visible overlap write (savepoint committed).
"""


def shadow_score(db, case_a: int, case_b: int, feats: list[float]) -> None:
    """
    No-op stub.  T60 will replace the body.

    Args:
        db:     SQLAlchemy session (shared with the caller's transaction)
        case_a: id of the first case  (always the smaller id)
        case_b: id of the second case
        feats:  7-dimensional feature vector used for the active model score
    """
    # Stage 10 will: load shadow model, score feats, write to shadow_scores.
    # Until then this is intentionally empty.
    pass
