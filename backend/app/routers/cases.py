from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text

from ..db import get_db
from ..auth import current_user, scope_clause
from ..services.embeddings import embed_one, vec_literal
from ..services.resolution import resolve_institution
from ..services.overlap import scan_overlaps
from ..config import settings

router = APIRouter(prefix="/api/cases", tags=["cases"])

VALID_STATUSES = {
    "received", "registered", "assigned", "under_process",
    "transferred", "escalated", "action_taken", "disposed", "reopened",
}
# Permitted transitions (None means current status is not checked for source)
STATUS_TRANSITIONS: dict[str, set[str]] = {
    "received":       {"registered"},
    "registered":     {"assigned", "disposed"},
    "assigned":       {"under_process", "transferred", "escalated"},
    "under_process":  {"action_taken", "transferred", "escalated", "disposed"},
    "transferred":    {"under_process", "assigned"},
    "escalated":      {"under_process", "action_taken", "disposed"},
    "action_taken":   {"disposed", "reopened"},
    "disposed":       {"reopened"},
    "reopened":       {"assigned", "under_process"},
}


@router.get("")
def list_cases(
    q: str | None = None,
    institution: str | None = None,
    aicte_id: str | None = None,
    bureau: str | None = None,
    region: str | None = None,
    category: str | None = None,
    status: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    overdue: bool = False,
    limit: int = Query(50, le=200),
    offset: int = 0,
    db=Depends(get_db),
    user=Depends(current_user),
):
    where, p = ["1=1"], {"limit": limit, "offset": offset}

    if q:
        where.append(
            "(c.case_ref ILIKE :q "
            "OR to_tsvector('simple', c.description) @@ plainto_tsquery('simple', :qt))"
        )
        p.update(q=f"%{q}%", qt=q)
    if institution:
        where.append(
            "(i.normalized_name % :inst OR i.name ILIKE :instl)"
        )
        p.update(inst=institution.lower(), instl=f"%{institution}%")
    if aicte_id:
        where.append("i.aicte_permanent_id = :aid")
        p["aid"] = aicte_id
    if bureau:
        where.append("b.code = :bureau")
        p["bureau"] = bureau
    if region:
        where.append("i.region = :region")
        p["region"] = region
    if category:
        where.append("c.category = :cat")
        p["cat"] = category
    if status:
        where.append("c.status = :status")
        p["status"] = status
    if date_from:
        where.append("c.received_date >= :df")
        p["df"] = date_from
    if date_to:
        where.append("c.received_date <= :dt")
        p["dt"] = date_to
    if overdue:
        where.append("c.closed_date IS NULL AND c.sla_due_date < CURRENT_DATE")

    sc, sp = scope_clause(user)
    p.update(sp)

    sql = f"""
      SELECT c.id, c.case_ref, c.category, c.status, c.received_date,
             c.sla_due_date, c.closed_date, c.priority,
             c.sensitivity_flag, c.hold_parallel, c.next_action,
             i.id AS institution_id, i.name AS institution,
             i.aicte_permanent_id, i.region,
             b.code AS bureau, o.full_name AS officer,
             (c.closed_date IS NULL AND c.sla_due_date < CURRENT_DATE) AS overdue,
             (SELECT count(*) FROM overlap_links l
               WHERE (l.case_a=c.id OR l.case_b=c.id)
                 AND l.status='suggested' AND l.level='high') AS open_high_overlaps
      FROM cases c
      JOIN institutions i ON i.id=c.institution_id
      JOIN bureaus b ON b.id=c.bureau_id
      LEFT JOIN officers o ON o.id=c.officer_id
      WHERE {' AND '.join(where)} {sc}
      ORDER BY c.received_date DESC
      LIMIT :limit OFFSET :offset
    """
    return [dict(r) for r in db.execute(text(sql), p).mappings()]


@router.get("/{case_id}")
def case_detail(case_id: int, db=Depends(get_db), user=Depends(current_user)):
    c = db.execute(
        text(
            """
            SELECT c.id, c.case_ref, c.category, c.status, c.received_date,
                   c.sla_due_date, c.closed_date, c.priority, c.sensitivity_flag,
                   c.hold_parallel, c.next_action, c.inst_match_conf, c.updated_at,
                   i.id AS institution_id, i.name AS institution,
                   i.aicte_permanent_id, i.city, i.region,
                   b.id AS bureau_id, b.code AS bureau, b.name AS bureau_name,
                   o.full_name AS officer
            FROM cases c
            JOIN institutions i ON i.id=c.institution_id
            JOIN bureaus b ON b.id=c.bureau_id
            LEFT JOIN officers o ON o.id=c.officer_id
            WHERE c.id=:i
            """
        ),
        {"i": case_id},
    ).mappings().first()

    if not c:
        raise HTTPException(404, "Case not found")
    # Never expose issue_key (ground-truth label) or embedding in API
    c = dict(c)

    actions = [
        dict(r)
        for r in db.execute(
            text(
                """
                SELECT a.id, a.action_type, a.remarks, a.meta, a.created_at,
                       b.code AS bureau, o.full_name AS officer
                FROM actions a
                LEFT JOIN bureaus b ON b.id=a.bureau_id
                LEFT JOIN officers o ON o.id=a.officer_id
                WHERE a.case_id=:i ORDER BY a.created_at
                """
            ),
            {"i": case_id},
        ).mappings()
    ]

    overlaps = [
        dict(r)
        for r in db.execute(
            text(
                """
                SELECT l.id, l.level, l.probability, l.status, l.explanation,
                       l.explanation_src, l.model_version, l.breakdown,
                       l.lead_bureau_id, l.decision_reason,
                       CASE WHEN l.case_a=:i THEN l.case_b ELSE l.case_a END AS other_case_id
                FROM overlap_links l
                WHERE l.case_a=:i OR l.case_b=:i
                ORDER BY l.probability DESC
                """
            ),
            {"i": case_id},
        ).mappings()
    ]

    # Pre-action banner: other active cases on the same institution
    siblings = [
        dict(r)
        for r in db.execute(
            text(
                """
                SELECT c2.id, c2.case_ref, c2.category, c2.status, b.code AS bureau
                FROM cases c2
                JOIN bureaus b ON b.id=c2.bureau_id
                WHERE c2.institution_id=:inst AND c2.id<>:i AND c2.closed_date IS NULL
                """
            ),
            {"inst": c["institution_id"], "i": case_id},
        ).mappings()
    ]

    return {"case": c, "actions": actions, "overlaps": overlaps, "active_siblings": siblings}


class CaseIn(BaseModel):
    institution_name: str
    aicte_id: str | None = None
    city: str | None = None
    category: str
    description: str
    bureau_code: str
    sensitive: bool = False
    priority: str = "normal"


@router.post("", status_code=201)
def create_case(body: CaseIn, db=Depends(get_db), user=Depends(current_user)):
    inst_id, conf, needs_review = resolve_institution(
        db, body.aicte_id, body.institution_name, body.city
    )
    if inst_id is None:
        raise HTTPException(
            422,
            f"Institution could not be resolved (best score: {conf:.2f}). "
            "Provide the AICTE Permanent ID or pick from the search list.",
        )

    bureau_id = db.execute(
        text("SELECT id FROM bureaus WHERE code=:c"), {"c": body.bureau_code}
    ).scalar()
    if not bureau_id:
        raise HTTPException(422, f"Unknown bureau code: {body.bureau_code}")

    sla_days = (
        db.execute(
            text("SELECT deadline_days FROM sla_rules WHERE category=:c"),
            {"c": body.category},
        ).scalar()
        or 30
    )

    vec = embed_one(body.description)
    cid = db.execute(
        text(
            """
            INSERT INTO cases
              (institution_id, inst_match_conf, category, description,
               received_date, status, bureau_id, officer_id,
               sla_due_date, sensitivity_flag, priority,
               embedding, embedding_model)
            VALUES
              (:i, :conf, :cat, :d, CURRENT_DATE, 'registered', :b, :o,
               :due, :sens, :pri,
               CAST(:v AS vector), :m)
            RETURNING id
            """
        ),
        {
            "i": inst_id,
            "conf": conf,
            "cat": body.category,
            "d": body.description,
            "b": bureau_id,
            "o": user["id"],
            "due": date.today() + timedelta(days=sla_days),
            "sens": body.sensitive,
            "pri": body.priority,
            "v": vec_literal(vec),
            "m": settings.embed_model,
        },
    ).scalar()

    db.execute(
        text("UPDATE cases SET case_ref='CASE-'||lpad(id::text,6,'0') WHERE id=:i"),
        {"i": cid},
    )
    db.execute(
        text(
            "INSERT INTO actions (case_id, bureau_id, officer_id, action_type, remarks) "
            "VALUES (:c, :b, :o, 'registered', 'Case registered')"
        ),
        {"c": cid, "b": bureau_id, "o": user["id"]},
    )

    overlaps = scan_overlaps(db, cid)
    db.commit()

    return {
        "id": cid,
        "institution_review_needed": needs_review,
        "overlaps_found": overlaps,
    }


class ActionIn(BaseModel):
    action_type: str
    remarks: str | None = None
    new_status: str | None = None
    transfer_to: str | None = None  # bureau code


@router.post("/{case_id}/actions", status_code=201)
def add_action(
    case_id: int,
    body: ActionIn,
    db=Depends(get_db),
    user=Depends(current_user),
):
    case = db.execute(
        text("SELECT bureau_id, status FROM cases WHERE id=:i"), {"i": case_id}
    ).mappings().first()
    if not case:
        raise HTTPException(404, "Case not found")

    bureau_id = user.get("bureau_id") or case["bureau_id"]
    import json
    meta: dict = {}

    if body.transfer_to:
        tb = db.execute(
            text("SELECT id FROM bureaus WHERE code=:c"), {"c": body.transfer_to}
        ).scalar()
        if not tb:
            raise HTTPException(422, f"Unknown bureau: {body.transfer_to}")
        db.execute(
            text(
                "UPDATE cases SET bureau_id=:b, status='transferred', updated_at=now() "
                "WHERE id=:i"
            ),
            {"b": tb, "i": case_id},
        )
        meta["transferred_to"] = body.transfer_to

    if body.new_status:
        if body.new_status not in VALID_STATUSES:
            raise HTTPException(422, f"Invalid status: {body.new_status}")
        current = case["status"]
        allowed = STATUS_TRANSITIONS.get(current, set())
        if body.new_status not in allowed:
            raise HTTPException(
                422,
                f"Transition from '{current}' to '{body.new_status}' is not permitted. "
                f"Allowed: {sorted(allowed)}",
            )
        closed_clause = (
            ", closed_date=CURRENT_DATE" if body.new_status == "disposed" else ""
        )
        db.execute(
            text(
                f"UPDATE cases SET status=:s{closed_clause}, updated_at=now() WHERE id=:i"
            ),
            {"s": body.new_status, "i": case_id},
        )

    db.execute(
        text(
            "INSERT INTO actions (case_id, bureau_id, officer_id, action_type, remarks, meta) "
            "VALUES (:c, :b, :o, :t, :r, CAST(:m AS jsonb))"
        ),
        {
            "c": case_id,
            "b": bureau_id,
            "o": user["id"],
            "t": body.action_type,
            "r": body.remarks,
            "m": json.dumps(meta),
        },
    )
    db.commit()
    return {"ok": True}
