"""Alert insertion; the caller owns the transaction."""
from sqlalchemy import text


def create_alert(db, kind, case_id, bureau_id, message, overlap_id=None, dedupe_key=None):
    if dedupe_key is not None:
        existing = db.execute(text(
            "SELECT 1 FROM alerts WHERE kind=:kind "
            "AND case_id IS NOT DISTINCT FROM CAST(:case_id AS bigint) "
            "AND bureau_id IS NOT DISTINCT FROM CAST(:bureau_id AS bigint) "
            "AND created_at::date=CURRENT_DATE LIMIT 1"),
            {"kind": kind, "case_id": case_id, "bureau_id": bureau_id}).first()
        if existing:
            return False
    db.execute(
        text("INSERT INTO alerts (kind, case_id, bureau_id, message, overlap_id) "
             "VALUES (:kind, :case_id, :bureau_id, :message, :overlap_id)"),
        {"kind": kind, "case_id": case_id, "bureau_id": bureau_id,
         "message": message, "overlap_id": overlap_id},
    )
    return True
