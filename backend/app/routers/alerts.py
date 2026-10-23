from fastapi import APIRouter, Depends
from sqlalchemy import text

from ..db import get_db
from ..auth import current_user

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("")
def my_alerts(
    unread_only: bool = False,
    db=Depends(get_db),
    user=Depends(current_user),
):
    """Return alerts for the user's bureau. Management/admin see all."""
    bureau_filter = ""
    params: dict = {"b": user.get("bureau_id")}

    if user["role"] in ("officer", "regional"):
        bureau_filter = "AND (a.bureau_id = :b OR :b IS NULL)"
    # management and admin see all alerts

    read_filter = " AND a.read=FALSE" if unread_only else ""

    sql = (
        f"SELECT a.*, c.case_ref FROM alerts a "
        f"LEFT JOIN cases c ON c.id=a.case_id "
        f"WHERE 1=1 {bureau_filter}{read_filter} "
        f"ORDER BY a.created_at DESC LIMIT 100"
    )
    return [dict(r) for r in db.execute(text(sql), params).mappings()]


@router.post("/{alert_id}/read")
def mark_read(alert_id: int, db=Depends(get_db), user=Depends(current_user)):
    db.execute(text("UPDATE alerts SET read=TRUE WHERE id=:i"), {"i": alert_id})
    db.commit()
    return {"ok": True}


@router.post("/read-all")
def mark_all_read(db=Depends(get_db), user=Depends(current_user)):
    bureau_clause = ""
    params: dict = {"b": user.get("bureau_id")}
    if user["role"] in ("officer", "regional") and user.get("bureau_id"):
        bureau_clause = "AND bureau_id=:b"
    db.execute(
        text(f"UPDATE alerts SET read=TRUE WHERE read=FALSE {bureau_clause}"), params
    )
    db.commit()
    return {"ok": True}
