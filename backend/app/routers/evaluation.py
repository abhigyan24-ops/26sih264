from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from ..db import get_db
from ..auth import current_user, require_roles
from ml.promote import activate

router = APIRouter(prefix="/api", tags=["evaluation"])


@router.get("/evaluation/models")
def models(db=Depends(get_db), user=Depends(require_roles("admin","management"))):
    return [dict(row) for row in db.execute(text("SELECT id,kind,trained_on,metrics,status,created_at FROM model_versions ORDER BY created_at DESC,id DESC")).mappings()]


@router.get("/model-card")
def model_card(db=Depends(get_db), user=Depends(current_user)):
    return [dict(row) for row in db.execute(text("SELECT id,parameter,value,origin,derived_from,metrics,model_version,created_at FROM parameter_registry ORDER BY created_at DESC,id DESC")).mappings()]


@router.get("/evaluation/shadow-disagreements")
def disagreements(limit: int = Query(50,ge=1,le=200), offset: int = Query(0,ge=0),
                  db=Depends(get_db), user=Depends(require_roles("admin","management"))):
    base = """FROM shadow_scores s JOIN model_versions m ON m.id=s.model_version AND m.status='shadow'
        JOIN overlap_links l ON l.case_a=s.case_a AND l.case_b=s.case_b
        JOIN cases a ON a.id=s.case_a JOIN cases b ON b.id=s.case_b
        WHERE s.level<>l.level"""
    summary = db.execute(text("SELECT count(*) AS total, "
        "count(*) FILTER(WHERE s.level IN ('high','medium') AND l.level NOT IN ('high','medium')) AS extra, "
        "greatest(1,extract(epoch FROM (max(s.created_at)-min(s.created_at)))/86400) AS days " + base)).mappings().one()
    rows = [dict(row) for row in db.execute(text("SELECT s.case_a,s.case_b,a.case_ref AS a_ref,b.case_ref AS b_ref, "
        "s.model_version,s.probability AS shadow_probability,s.level AS shadow_level, "
        "l.probability AS active_probability,l.level AS active_level,s.created_at " + base +
        " ORDER BY s.created_at DESC,s.id DESC LIMIT :limit OFFSET :offset"), {"limit":limit,"offset":offset}).mappings()]
    return {"total":summary["total"],"items":rows,
            "extra_alerts_per_day_estimate":float(summary["extra"])/float(summary["days"] or 1),
            "coverage":"Observed active-flagged pairs only; unflagged candidates are not covered by the existing scan hook"}


@router.post("/evaluation/promote/{version}")
def promote(version: str, user=Depends(require_roles("admin"))):
    return publish(version,user["id"])


@router.post("/evaluation/rollback")
def rollback(user=Depends(require_roles("admin"))):
    return publish(None,user["id"],rollback=True)


def publish(version, officer_id, rollback=False):
    try:
        return activate(version,officer_id,rollback)
    except ValueError as error:
        raise HTTPException(422,str(error)) from error
    except OSError as error:
        raise HTTPException(503,"Model artifact/publication unavailable; inspect DB and ACTIVE pointer, then retry") from error
