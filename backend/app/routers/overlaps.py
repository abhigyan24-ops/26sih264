from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, field_validator
from sqlalchemy import text
from ..db import get_db
from ..auth import current_user
from ..services.coordination import (DISMISS_REASONS, FIELDS, JOINS, overlap_scope,
                                     get_overlap, decide_overlap)

router = APIRouter(prefix="/api", tags=["overlaps"])


class Decision(BaseModel):
    decision: Literal["link", "dismiss"]
    lead_bureau: str | None = None
    hold_other: bool = False
    reason: str | None = None
    note: str | None = None

    @field_validator("reason", "note")
    @classmethod
    def trim(cls, value):
        return value.strip() or None if value is not None else None


@router.get("/overlaps")
def list_overlaps(response: Response,
                  status: Literal["suggested", "confirmed", "dismissed"] = "suggested",
                  level: Literal["high", "medium", "info"] | None = None,
                  institution_id: int | None = None,
                  limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0),
                  db=Depends(get_db), user=Depends(current_user)):
    scope, params = overlap_scope(user)
    where = "l.status=:status" + scope
    params["status"] = status
    if level is not None:
        where += " AND l.level=:level"
        params["level"] = level
    if institution_id is not None:
        where += " AND ia.id=:institution"
        params["institution"] = institution_id
    response.headers["X-Total-Count"] = str(db.execute(
        text(f"SELECT count(*) {JOINS} WHERE {where}"), params).scalar())
    rows = db.execute(text(f"SELECT {FIELDS} {JOINS} WHERE {where} "
                           "ORDER BY CASE l.level WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, "
                           "l.probability DESC, l.id LIMIT :limit OFFSET :offset"),
                      {**params, "limit": limit, "offset": offset}).mappings()
    return [dict(row) for row in rows]


@router.get("/overlaps/dismiss-reasons")
def dismiss_reasons(user=Depends(current_user)):
    return list(DISMISS_REASONS)


@router.get("/overlaps/{overlap_id}")
def overlap_detail(overlap_id: int, db=Depends(get_db), user=Depends(current_user)):
    return get_overlap(db, user, overlap_id)


@router.post("/overlaps/{overlap_id}/decide")
def decide(overlap_id: int, body: Decision, db=Depends(get_db), user=Depends(current_user)):
    try:
        result = decide_overlap(db, user, overlap_id, body)
        db.commit()
        return result
    except Exception:
        db.rollback()
        raise


@router.get("/cases/{case_id}/overlaps")
def case_overlaps(case_id: int, db=Depends(get_db), user=Depends(current_user)):
    # Check case visibility even when it has no overlaps.
    where = "c.id=:id"
    params = {"id": case_id}
    if user["role"] == "regional":
        where += " AND i.region=:region"
        params["region"] = user.get("region")
    elif user["role"] == "officer":
        where += " AND c.bureau_id=:bureau"
        params["bureau"] = user.get("bureau_id")
    if not db.execute(text("SELECT c.id FROM cases c JOIN institutions i ON i.id=c.institution_id WHERE " + where), params).first():
        raise HTTPException(404, "Case not found")
    scope, scoped = overlap_scope(user)
    return [dict(row) for row in db.execute(
        text(f"SELECT {FIELDS} {JOINS} WHERE (l.case_a=:id OR l.case_b=:id) {scope} "
             "ORDER BY l.probability DESC, l.id"), {"id": case_id, **scoped}).mappings()]
