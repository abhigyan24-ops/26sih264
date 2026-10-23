from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text

from ..db import get_db
from ..auth import current_user

router = APIRouter(prefix="/api/institutions", tags=["institutions"])


@router.get("/search")
def search(q: str, db=Depends(get_db), user=Depends(current_user)):
    """
    Fuzzy institution search using pg_trgm similarity.
    Also matches on exact AICTE Permanent ID.
    """
    rows = db.execute(
        text(
            """
            SELECT id, name, aicte_permanent_id, city, state, region,
                   GREATEST(
                       similarity(normalized_name, lower(:q)),
                       (aicte_permanent_id = :q)::int::float
                   ) AS score
            FROM institutions
            WHERE normalized_name % lower(:q)
               OR name ILIKE :like
               OR aicte_permanent_id = :q
            ORDER BY score DESC
            LIMIT 15
            """
        ),
        {"q": q, "like": f"%{q}%"},
    ).mappings().all()
    return [dict(r) for r in rows]


@router.get("/{inst_id}")
def get_institution(inst_id: int, db=Depends(get_db), user=Depends(current_user)):
    inst = db.execute(
        text("SELECT * FROM institutions WHERE id=:i"), {"i": inst_id}
    ).mappings().first()
    if not inst:
        raise HTTPException(404, "Institution not found")

    cases = db.execute(
        text(
            """
            SELECT c.id, c.case_ref, c.category, c.status, c.received_date,
                   c.closed_date, c.priority, c.sensitivity_flag,
                   b.code AS bureau,
                   (c.closed_date IS NULL AND c.sla_due_date < CURRENT_DATE) AS overdue
            FROM cases c
            JOIN bureaus b ON b.id=c.bureau_id
            WHERE c.institution_id=:i
            ORDER BY c.received_date DESC
            """
        ),
        {"i": inst_id},
    ).mappings().all()

    # Categories that appear more than once (repeat complaints)
    repeats = db.execute(
        text(
            """
            SELECT category, count(*) AS n
            FROM cases WHERE institution_id=:i
            GROUP BY category HAVING count(*) > 1
            ORDER BY n DESC
            """
        ),
        {"i": inst_id},
    ).mappings().all()

    aliases = db.execute(
        text(
            "SELECT alias, source, approved FROM institution_aliases "
            "WHERE institution_id=:i"
        ),
        {"i": inst_id},
    ).mappings().all()

    # Overlap links involving this institution's cases
    overlap_summary = db.execute(
        text(
            """
            SELECT l.id, l.level, l.status, l.probability, l.created_at,
                   ca.case_ref AS a_ref, cb.case_ref AS b_ref
            FROM overlap_links l
            JOIN cases ca ON ca.id=l.case_a
            JOIN cases cb ON cb.id=l.case_b
            WHERE ca.institution_id=:i OR cb.institution_id=:i
            ORDER BY l.created_at DESC
            LIMIT 20
            """
        ),
        {"i": inst_id},
    ).mappings().all()

    return {
        "institution": dict(inst),
        "cases": [dict(r) for r in cases],
        "repeat_categories": [dict(r) for r in repeats],
        "aliases": [dict(r) for r in aliases],
        "overlaps": [dict(r) for r in overlap_summary],
    }
