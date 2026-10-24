"""
meta router — Stage 5 (BD3)

GET /api/meta/filters: returns dropdown options for the Cases page.
Any authenticated user may call it.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import text

from ..db import get_db
from ..auth import current_user

router = APIRouter(prefix="/api/meta", tags=["meta"])

# Statuses in lifecycle order (nine values from schema CHECK constraint)
STATUS_ORDER = [
    "received", "registered", "assigned", "under_process",
    "transferred", "escalated", "action_taken", "disposed", "reopened",
]


@router.get("/filters")
def filter_options(db=Depends(get_db), user=Depends(current_user)):
    """Return dropdown option lists for the Cases page filter bar."""
    bureaus = db.execute(
        text("SELECT code, name FROM bureaus ORDER BY code")
    ).mappings().all()

    categories = db.execute(
        text("SELECT code, label FROM categories ORDER BY code")
    ).mappings().all()

    regions = db.execute(
        text("SELECT DISTINCT region FROM institutions ORDER BY region")
    ).scalars().all()

    return {
        "bureaus": [dict(r) for r in bureaus],
        "categories": [dict(r) for r in categories],
        "regions": regions,
        "statuses": STATUS_ORDER,
    }
