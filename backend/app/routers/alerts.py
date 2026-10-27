from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import text
from ..db import get_db
from ..auth import current_user

router = APIRouter(prefix="/api/alerts", tags=["alerts"])
JOINS = "FROM alerts a LEFT JOIN cases c ON c.id=a.case_id LEFT JOIN institutions i ON i.id=c.institution_id"
KINDS = {"overlap_high", "overlap_medium", "pending", "escalation", "sla_risk", "sla_breach", "system"}


def alert_scope(user):
    if user["role"] == "regional":
        return "i.region=:region", {"region": user.get("region")}
    if user["role"] == "officer":
        return "a.bureau_id=:bureau", {"bureau": user.get("bureau_id")}
    return "TRUE", {}


@router.get("")
def my_alerts(response: Response, unread_only: bool = False, kind: str | None = None,
              limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0),
              db=Depends(get_db), user=Depends(current_user)):
    where, params = alert_scope(user)
    if kind is not None:
        if kind not in KINDS:
            raise HTTPException(422, "Unknown alert kind")
        where += " AND a.kind=:kind"
        params["kind"] = kind
    if unread_only:
        where += " AND NOT a.read"
    response.headers["X-Total-Count"] = str(db.execute(text(f"SELECT count(*) {JOINS} WHERE {where}"), params).scalar())
    return [dict(row) for row in db.execute(text(f"SELECT a.*,c.case_ref {JOINS} WHERE {where} "
                "ORDER BY a.created_at DESC,a.id DESC LIMIT :limit OFFSET :offset"),
                {**params, "limit": limit, "offset": offset}).mappings()]


@router.get("/unread-count")
def unread_count(db=Depends(get_db), user=Depends(current_user)):
    where, params = alert_scope(user)
    return {"count": db.execute(text(f"SELECT count(*) {JOINS} WHERE {where} AND NOT a.read"), params).scalar()}


@router.post("/read-all")
def mark_all_read(db=Depends(get_db), user=Depends(current_user)):
    where, params = alert_scope(user)
    db.execute(text(f"UPDATE alerts SET read=TRUE WHERE id IN (SELECT a.id {JOINS} WHERE {where} AND NOT a.read)"), params)
    db.commit()
    return {"ok": True}


@router.post("/{alert_id}/read")
def mark_read(alert_id: int, db=Depends(get_db), user=Depends(current_user)):
    where, params = alert_scope(user)
    row = db.execute(text(f"UPDATE alerts SET read=TRUE WHERE id IN "
                         f"(SELECT a.id {JOINS} WHERE a.id=:id AND {where}) RETURNING id"),
                     {**params, "id": alert_id}).first()
    if row is None:
        raise HTTPException(404, "Alert not found")
    db.commit()
    return {"ok": True}
