"""
institutions router — Stage 5 (BD1, BD2)

BD1: search normalises query (same normalizer as resolution.py), applies
     scope_clause, escapes ILIKE wildcards, enforces min_length=2.
BD2: detail is scope-checked (404 when out of scope) and returns
     active_by_bureau, overlaps, stats in addition to the guide's keys.
"""
from fastapi import APIRouter, Depends, HTTPException, Query

from sqlalchemy import text

from ..db import get_db
from ..auth import current_user, scope_clause
from ..services.resolution import normalize

router = APIRouter(prefix="/api/institutions", tags=["institutions"])


def _escape_like(s: str) -> str:
    """Escape %, _ and \\ so they are treated as literals in ILIKE."""
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


# ── BD1: /search must come before /{inst_id} ──────────────────────────────────
@router.get("/search")
def search(
    q: str = Query(..., min_length=2),
    db=Depends(get_db),
    user=Depends(current_user),
):
    """
    Fuzzy institution search.
    Normalises the query (abbreviation expansion + lowercase) before trigram
    matching so "govt engg" finds "government engineering …".
    Applies row-level region scope for regional users.
    """
    sc, sp = scope_clause(user, table_alias="i")
    nq = normalize(q)
    like_pat = f"%{_escape_like(nq)}%"
    rows = db.execute(
        text(
            f"""
            SELECT i.id, i.name, i.aicte_permanent_id, i.city, i.state, i.region,
                   GREATEST(
                       similarity(i.normalized_name, :nq),
                       (i.aicte_permanent_id = :raw)::int::float
                   ) AS score
            FROM institutions i
            WHERE (
                i.normalized_name % :nq
                OR i.normalized_name ILIKE :like ESCAPE '\\'
                OR i.aicte_permanent_id = :raw
            ) {sc}
            ORDER BY score DESC
            LIMIT 15
            """
        ),
        {"nq": nq, "like": like_pat, "raw": q, **sp},
    ).mappings().all()
    return [dict(r) for r in rows]


# ── BD2: institution detail ────────────────────────────────────────────────────
@router.get("/{inst_id}")
def get_institution(inst_id: int, db=Depends(get_db), user=Depends(current_user)):
    """
    Institution 360 view.
    Scope-checked: regional users see only their region.
    Returns cases, repeat_categories (guide keys, unchanged),
    active_by_bureau, overlaps, stats (BD2 additions).
    """
    sc, sp = scope_clause(user, table_alias="i")

    inst = db.execute(
        text(
            f"""
            SELECT i.id, i.name, i.aicte_permanent_id, i.address,
                   i.city, i.state, i.region, i.inst_type, i.created_at
            FROM institutions i
            WHERE i.id = :id {sc}
            """
        ),
        {"id": inst_id, **sp},
    ).mappings().first()

    if not inst:
        raise HTTPException(404, "Institution not found")

    # All cases for this institution (no region re-filter needed; already scoped above)
    cases = db.execute(
        text(
            """
            SELECT c.id, c.case_ref, c.category, c.status,
                   c.received_date, c.closed_date, c.sla_due_date,
                   c.priority, c.sensitivity_flag,
                   b.code AS bureau, b.name AS bureau_name,
                   o.full_name AS officer,
                   (c.closed_date IS NULL AND c.sla_due_date < CURRENT_DATE) AS overdue
            FROM cases c
            JOIN bureaus b ON b.id = c.bureau_id
            LEFT JOIN officers o ON o.id = c.officer_id
            WHERE c.institution_id = :i
            ORDER BY c.received_date DESC
            """
        ),
        {"i": inst_id},
    ).mappings().all()

    # Repeat complaint categories (n > 1)
    repeats = db.execute(
        text(
            """
            SELECT c.category, cat.label, count(*) AS n
            FROM cases c
            LEFT JOIN categories cat ON cat.code = c.category
            WHERE c.institution_id = :i
            GROUP BY c.category, cat.label HAVING count(*) > 1
            ORDER BY n DESC
            """
        ),
        {"i": inst_id},
    ).mappings().all()

    # active_by_bureau: bureaus with at least one open case
    active_by_bureau = db.execute(
        text(
            """
            SELECT b.code AS bureau, b.name AS bureau_name,
                   count(*) AS open_cases
            FROM cases c
            JOIN bureaus b ON b.id = c.bureau_id
            WHERE c.institution_id = :i AND c.closed_date IS NULL
            GROUP BY b.code, b.name
            ORDER BY b.code
            """
        ),
        {"i": inst_id},
    ).mappings().all()

    # Overlap links involving any case of this institution
    overlaps = db.execute(
        text(
            """
            SELECT l.id, l.level, l.status, l.probability, l.created_at,
                   ca.case_ref AS a_ref, cb.case_ref AS b_ref
            FROM overlap_links l
            JOIN cases ca ON ca.id = l.case_a
            JOIN cases cb ON cb.id = l.case_b
            WHERE ca.institution_id = :i OR cb.institution_id = :i
            ORDER BY l.created_at DESC
            LIMIT 50
            """
        ),
        {"i": inst_id},
    ).mappings().all()

    # Stats
    stats_row = db.execute(
        text(
            """
            SELECT
              count(*)                                                     AS total,
              count(*) FILTER (WHERE closed_date IS NULL)                  AS open,
              count(*) FILTER (WHERE status = 'disposed')                  AS disposed,
              count(*) FILTER (WHERE closed_date IS NULL
                                 AND sla_due_date < CURRENT_DATE)          AS overdue
            FROM cases
            WHERE institution_id = :i
            """
        ),
        {"i": inst_id},
    ).mappings().first()

    return {
        "institution": dict(inst),
        "cases": [dict(r) for r in cases],
        "repeat_categories": [dict(r) for r in repeats],
        "active_by_bureau": [dict(r) for r in active_by_bureau],
        "overlaps": [dict(r) for r in overlaps],
        "stats": dict(stats_row) if stats_row else {},
    }
