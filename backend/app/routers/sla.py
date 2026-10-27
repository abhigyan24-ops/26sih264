"""
SLA API Router (Stage 8 / T30).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text

from ..db import get_db
from ..auth import current_user, require_roles
from ..services.sla import scan_sla, get_case_risk

router = APIRouter(prefix="/api/sla", tags=["sla"])


@router.post("/scan")
def trigger_scan(
    db=Depends(get_db),
    user=Depends(require_roles("admin")),
):
    """
    Manually trigger an SLA overdue and risk scan.
    Admin role required. Returns summary of created alerts and skipped duplicates.
    """
    summary = scan_sla(db)
    return summary


@router.get("/risk/{case_id}")
def case_risk_badge(
    case_id: int,
    db=Depends(get_db),
    user=Depends(current_user),
):
    """
    Get SLA risk status and probability for a specific case.
    Available to all authenticated officers.
    """
    # Verify case exists
    exists = db.execute(
        text("SELECT id FROM cases WHERE id = :id"),
        {"id": case_id},
    ).scalar()
    if not exists:
        raise HTTPException(status_code=404, detail="Case not found")

    return get_case_risk(db, case_id)
