"""Alert insertion; the caller owns the transaction."""
from sqlalchemy import text


def create_alert(db, kind, case_id, bureau_id, message, overlap_id=None, dedupe_key=None):
    db.execute(
        text("INSERT INTO alerts (kind, case_id, bureau_id, message, overlap_id) "
             "VALUES (:kind, :case_id, :bureau_id, :message, :overlap_id)"),
        {"kind": kind, "case_id": case_id, "bureau_id": bureau_id,
         "message": message, "overlap_id": overlap_id},
    )
