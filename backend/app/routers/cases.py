"""
cases router — Stage 5 (BD4, BD5, BD6, BD7, BD8)

BD4: X-Total-Count header on list endpoint; same filter helper for count + data.
BD5: sort/dir parameters (whitelist); ILIKE wildcard escaping.
BD6: case detail excludes issue_key/embedding; adds sla_source, days_open,
     days_remaining; attaches documents to each action.
BD7: add_action returns {ok, action_id}; validates transfer/reopen/link/hold.
BD8: create_case also returns case_ref.
"""
from datetime import date, timedelta
import json

from fastapi import APIRouter, Depends, HTTPException, Query, Response
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

# BD5: whitelist for sort column → SQL expression (never interpolated from user)
SORT_MAP = {
    "received_date": "c.received_date",
    "sla_due_date": "c.sla_due_date",
    "status": "c.status",
    "case_ref": "c.case_ref",
    "institution": "i.name",
    "bureau": "b.code",
    "category": "c.category",
}


def _escape_like(s: str) -> str:
    """Escape ILIKE special chars so user input is treated literally."""
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _build_filter(
    q, institution, aicte_id, bureau, region, category, status,
    date_from, date_to, overdue, user, extra_params: dict
):
    """
    Build (where_clauses, params) shared by the count and data queries.
    Parentheses fix (D1/Stage 3) is preserved: q search uses its own parens.
    """
    where = ["1=1"]
    p = dict(extra_params)

    if q:
        escaped = _escape_like(q)
        where.append(
            "(c.case_ref ILIKE :q ESCAPE '\\' "
            "OR to_tsvector('simple', c.description) @@ plainto_tsquery('simple', :qt))"
        )
        p.update(q=f"%{escaped}%", qt=q)
    if institution:
        escaped_inst = _escape_like(institution)
        where.append(
            "(i.normalized_name % :inst OR i.name ILIKE :instl ESCAPE '\\')"
        )
        p.update(inst=institution.lower(), instl=f"%{escaped_inst}%")
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

    return where, p, sc


_CASE_JOINS = """
  FROM cases c
  JOIN institutions i ON i.id = c.institution_id
  JOIN bureaus b ON b.id = c.bureau_id
  LEFT JOIN officers o ON o.id = c.officer_id
"""


@router.get("")
def list_cases(
    response: Response,
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
    sort: str | None = None,
    dir: str = "desc",
    limit: int = Query(50, le=200),
    offset: int = 0,
    db=Depends(get_db),
    user=Depends(current_user),
):
    # BD5: validate sort column
    if sort is not None and sort not in SORT_MAP:
        raise HTTPException(422, f"Invalid sort column: {sort}. Allowed: {', '.join(SORT_MAP)}")
    dir_sql = "ASC" if dir.lower() == "asc" else "DESC"
    order_expr = f"{SORT_MAP.get(sort, 'c.received_date')} {dir_sql}, c.id DESC"

    where, p, sc = _build_filter(
        q, institution, aicte_id, bureau, region, category,
        status, date_from, date_to, overdue, user, {}
    )

    where_sql = " AND ".join(where)

    # BD4: count query (same joins and filters, no limit/offset)
    count_sql = f"SELECT count(*) {_CASE_JOINS} WHERE {where_sql} {sc}"
    total = db.execute(text(count_sql), p).scalar()
    response.headers["X-Total-Count"] = str(total)

    # Data query
    p.update(limit=limit, offset=offset)
    data_sql = f"""
      SELECT c.id, c.case_ref, c.category, c.status, c.received_date,
             c.sla_due_date, c.closed_date, c.priority,
             c.sensitivity_flag, c.hold_parallel, c.next_action,
             i.id AS institution_id, i.name AS institution,
             i.aicte_permanent_id, i.region,
             b.code AS bureau, b.name AS bureau_name,
             o.full_name AS officer,
             (c.closed_date IS NULL AND c.sla_due_date < CURRENT_DATE) AS overdue,
             (SELECT count(*) FROM overlap_links l
               WHERE (l.case_a=c.id OR l.case_b=c.id)
                 AND l.status='suggested' AND l.level='high') AS open_high_overlaps
      {_CASE_JOINS}
      WHERE {where_sql} {sc}
      ORDER BY {order_expr}
      LIMIT :limit OFFSET :offset
    """
    rows = db.execute(text(data_sql), p).mappings()
    return [dict(r) for r in rows]


@router.get("/{case_id}")
def case_detail(case_id: int, db=Depends(get_db), user=Depends(current_user)):
    sc, sp = scope_clause(user)
    p = {"i": case_id}
    p.update(sp)

    # BD6: explicit columns; no issue_key, no embedding
    c = db.execute(
        text(
            f"""
            SELECT c.id, c.case_ref, c.category, c.status, c.received_date,
                   c.sla_due_date, c.closed_date, c.priority, c.sensitivity_flag,
                   c.hold_parallel, c.next_action, c.inst_match_conf, c.updated_at,
                   c.description,
                   i.id AS institution_id, i.name AS institution,
                   i.aicte_permanent_id, i.city, i.region,
                   b.id AS bureau_id, b.code AS bureau, b.name AS bureau_name,
                   o.full_name AS officer,
                   -- SLA fields (BD6)
                   sr.source_reference AS sla_source,
                   (CURRENT_DATE - c.received_date)::int AS days_open,
                   CASE
                     WHEN c.closed_date IS NOT NULL THEN NULL
                     ELSE (c.sla_due_date - CURRENT_DATE)::int
                   END AS days_remaining
            FROM cases c
            JOIN institutions i ON i.id = c.institution_id
            JOIN bureaus b ON b.id = c.bureau_id
            LEFT JOIN officers o ON o.id = c.officer_id
            LEFT JOIN sla_rules sr ON sr.category = c.category
            WHERE c.id = :i {sc}
            """
        ),
        p,
    ).mappings().first()

    if not c:
        raise HTTPException(404, "Case not found")

    c = dict(c)

    # BD6: fetch actions with their documents (no storage_key, no checksum)
    actions_raw = db.execute(
        text(
            """
            SELECT a.id, a.action_type, a.remarks, a.meta, a.created_at,
                   b.code AS bureau, o.full_name AS officer
            FROM actions a
            LEFT JOIN bureaus b ON b.id = a.bureau_id
            LEFT JOIN officers o ON o.id = a.officer_id
            WHERE a.case_id = :i ORDER BY a.created_at
            """
        ),
        {"i": case_id},
    ).mappings().all()

    docs_raw = db.execute(
        text(
            """
            SELECT d.id, d.action_id, d.file_name, d.uploaded_at, d.uploaded_by
            FROM documents d
            JOIN actions a ON a.id = d.action_id
            WHERE a.case_id = :i
            """
        ),
        {"i": case_id},
    ).mappings().all()

    docs_by_action: dict[int, list] = {}
    for doc in docs_raw:
        docs_by_action.setdefault(doc["action_id"], []).append({
            "id": doc["id"],
            "file_name": doc["file_name"],
            "uploaded_at": doc["uploaded_at"].isoformat() if doc["uploaded_at"] else None,
            "uploaded_by": doc["uploaded_by"],
        })

    actions = []
    for a in actions_raw:
        row = dict(a)
        row["documents"] = docs_by_action.get(a["id"], [])
        actions.append(row)

    overlaps = [
        dict(r)
        for r in db.execute(
            text(
                """
                SELECT l.id, l.level, l.probability, l.status,
                       l.explanation, l.model_version,
                       CASE WHEN l.case_a=:i THEN l.case_b ELSE l.case_a END AS other_case_id,
                       CASE WHEN l.case_a=:i THEN cb.case_ref ELSE ca.case_ref END AS other_case_ref
                FROM overlap_links l
                JOIN cases ca ON ca.id = l.case_a
                JOIN cases cb ON cb.id = l.case_b
                WHERE l.case_a=:i OR l.case_b=:i
                ORDER BY l.probability DESC
                """
            ),
            {"i": case_id},
        ).mappings()
    ]

    # Pre-action banner siblings
    siblings = [
        dict(r)
        for r in db.execute(
            text(
                """
                SELECT c2.id, c2.case_ref, c2.category, c2.status, b.code AS bureau
                FROM cases c2
                JOIN bureaus b ON b.id = c2.bureau_id
                WHERE c2.institution_id = :inst AND c2.id <> :i AND c2.closed_date IS NULL
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
    if not body.description or not body.description.strip():
        raise HTTPException(422, "Description cannot be empty or whitespace only")

    bureau_id = db.execute(
        text("SELECT id FROM bureaus WHERE code=:c"), {"c": body.bureau_code}
    ).scalar()
    if not bureau_id:
        raise HTTPException(422, f"Unknown bureau code: {body.bureau_code}")

    sla_days = db.execute(
        text("SELECT deadline_days FROM sla_rules WHERE category=:c"),
        {"c": body.category},
    ).scalar()
    if sla_days is None:
        raise HTTPException(422, f"Unknown category: {body.category}")

    inst_id, conf, needs_review = resolve_institution(
        db, body.aicte_id, body.institution_name, body.city
    )
    if inst_id is None:
        raise HTTPException(
            422,
            f"Institution could not be resolved (best score: {conf:.2f}). "
            "Provide the AICTE Permanent ID or pick from the search list.",
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

    # BD8: fetch the case_ref we just set
    case_ref = db.execute(
        text("SELECT case_ref FROM cases WHERE id=:i"), {"i": cid}
    ).scalar()

    db.commit()

    return {
        "id": cid,
        "case_ref": case_ref,          # BD8: additive
        "institution_review_needed": needs_review,
        "overlaps": overlaps,
        "overlaps_found": overlaps,
    }


class ActionIn(BaseModel):
    action_type: str
    remarks: str | None = None
    new_status: str | None = None
    transfer_to: str | None = None   # bureau code


@router.post("/{case_id}/actions", status_code=201)
def add_action(
    case_id: int,
    body: ActionIn,
    db=Depends(get_db),
    user=Depends(current_user),
):
    # BD7: reject link and hold (reserved for Stage 7)
    if body.action_type in ("link", "hold"):
        raise HTTPException(422, f"action_type '{body.action_type}' is reserved for Stage 7")

    sc, sp = scope_clause(user)
    p = {"i": case_id}
    p.update(sp)
    case = db.execute(
        text(
            f"SELECT c.bureau_id, c.status FROM cases c "
            f"JOIN institutions i ON i.id=c.institution_id WHERE c.id=:i {sc}"
        ),
        p,
    ).mappings().first()
    if not case:
        raise HTTPException(404, "Case not found")

    bureau_id = user.get("bureau_id") or case["bureau_id"]
    meta: dict = {}

    # BD7: transfer validation
    if body.action_type == "transfer":
        if not body.transfer_to:
            raise HTTPException(422, "transfer requires transfer_to bureau code")
        tb = db.execute(
            text("SELECT id, code FROM bureaus WHERE code=:c"), {"c": body.transfer_to}
        ).mappings().first()
        if not tb:
            raise HTTPException(422, f"Unknown bureau: {body.transfer_to}")
        # Verify not same bureau
        current_bureau_code = db.execute(
            text("SELECT code FROM bureaus WHERE id=:i"), {"i": case["bureau_id"]}
        ).scalar()
        if body.transfer_to == current_bureau_code:
            raise HTTPException(422, "Cannot transfer to the same bureau")
        db.execute(
            text(
                "UPDATE cases SET bureau_id=:b, status='transferred', updated_at=now() "
                "WHERE id=:i"
            ),
            {"b": tb["id"], "i": case_id},
        )
        meta["transferred_to"] = body.transfer_to

    # BD7: reopened validation
    elif body.action_type == "reopened":
        if case["status"] != "disposed":
            raise HTTPException(422, "Can only reopen a disposed case")
        db.execute(
            text(
                "UPDATE cases SET status='reopened', closed_date=NULL, updated_at=now() "
                "WHERE id=:i"
            ),
            {"i": case_id},
        )

    # BD7: closed → default new_status to disposed
    elif body.action_type == "closed":
        resolved_status = body.new_status or "disposed"
        if resolved_status not in VALID_STATUSES:
            raise HTTPException(422, f"Invalid status: {resolved_status}")
        db.execute(
            text(
                "UPDATE cases SET status=:s, closed_date=CURRENT_DATE, updated_at=now() "
                "WHERE id=:i"
            ),
            {"s": resolved_status, "i": case_id},
        )
        body = ActionIn(
            action_type=body.action_type,
            remarks=body.remarks,
            new_status=resolved_status,
            transfer_to=body.transfer_to,
        )

    elif body.new_status:
        if body.new_status not in VALID_STATUSES:
            raise HTTPException(422, f"Invalid status: {body.new_status}")
        closed_clause = (
            ", closed_date=CURRENT_DATE"
            if body.new_status == "disposed"
            else (", closed_date=NULL" if body.new_status == "reopened" else "")
        )
        db.execute(
            text(
                f"UPDATE cases SET status=:s{closed_clause}, updated_at=now() WHERE id=:i"
            ),
            {"s": body.new_status, "i": case_id},
        )

    action_id = db.execute(
        text(
            "INSERT INTO actions (case_id, bureau_id, officer_id, action_type, remarks, meta) "
            "VALUES (:c, :b, :o, :t, :r, CAST(:m AS jsonb)) RETURNING id"
        ),
        {
            "c": case_id,
            "b": bureau_id,
            "o": user["id"],
            "t": body.action_type,
            "r": body.remarks,
            "m": json.dumps(meta),
        },
    ).scalar()

    db.commit()
    return {"ok": True, "action_id": action_id}   # BD7: return action_id
