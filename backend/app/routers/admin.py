from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text

from ..db import get_db
from ..auth import current_user, require_roles

router = APIRouter(prefix="/api", tags=["admin"])


@router.get("/audit-log")
def audit(
    db=Depends(get_db),
    user=Depends(require_roles("admin", "management")),
):
    rows = db.execute(
        text(
            """
            SELECT al.*, o.username AS actor
            FROM audit_log al
            LEFT JOIN officers o ON o.id=al.actor_id
            ORDER BY al.created_at DESC LIMIT 200
            """
        )
    ).mappings().all()
    return [dict(r) for r in rows]


@router.get("/parameter-registry")
def parameter_registry(db=Depends(get_db), user=Depends(current_user)):
    rows = db.execute(
        text("SELECT * FROM parameter_registry ORDER BY created_at DESC")
    ).mappings().all()
    return [dict(r) for r in rows]


@router.get("/model-versions")
def model_versions(db=Depends(get_db), user=Depends(current_user)):
    rows = db.execute(
        text("SELECT * FROM model_versions ORDER BY created_at DESC")
    ).mappings().all()
    return [dict(r) for r in rows]


@router.get("/evaluation-report")
def evaluation_report(user=Depends(current_user)):
    import json
    from pathlib import Path
    p = Path(__file__).resolve().parent.parent.parent / "ml" / "artifacts" / "evaluation_report.json"
    if not p.exists():
        raise HTTPException(404, "Evaluation report not generated yet")
    with open(p) as f:
        return json.load(f)
