import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from ..db import get_db
from ..auth import current_user, scope_clause

router = APIRouter(prefix="/api/overlaps", tags=["overlaps"])


@router.get("")
def list_overlaps(
    status: str = "suggested",
    level: str | None = None,
    db=Depends(get_db),
    user=Depends(current_user),
):
    sc, sp = scope_clause(user, table_alias="i")
    where_clauses = ["l.status = :s"]
    params = {"s": status}
    if level:
        where_clauses.append("l.level = :lvl")
        params["lvl"] = level
    if sc:
        where_clauses.append(sc.replace("AND ", "", 1).strip())
    params.update(sp)

    where_sql = " AND ".join(where_clauses)
    sql = f"""
      SELECT l.id, l.level, l.probability, l.breakdown, l.status,
             l.lead_bureau_id, l.explanation, l.explanation_src,
             l.model_version, l.decision_reason,
             i.id AS institution_id, i.name AS institution, i.region,
             ca.id AS a_id, ca.case_ref AS a_ref, ca.category AS a_cat,
             ba.code AS a_bureau, ca.description AS a_desc, ca.status AS a_status,
             cb.id AS b_id, cb.case_ref AS b_ref, cb.category AS b_cat,
             bb.code AS b_bureau, cb.description AS b_desc, cb.status AS b_status
      FROM overlap_links l
      JOIN cases ca ON ca.id=l.case_a
      JOIN cases cb ON cb.id=l.case_b
      JOIN institutions i ON i.id=ca.institution_id
      JOIN bureaus ba ON ba.id=ca.bureau_id
      JOIN bureaus bb ON bb.id=cb.bureau_id
      WHERE {where_sql}
      ORDER BY (l.level='high') DESC, l.probability DESC
      LIMIT 100
    """
    return [dict(r) for r in db.execute(text(sql), params).mappings()]


class Decision(BaseModel):
    decision: str                   # link | dismiss
    lead_bureau: str | None = None  # bureau code for the lead
    hold_other: bool = False        # set hold_parallel on the non-lead case
    reason: str | None = None       # required for dismiss; optional for link


@router.post("/{overlap_id}/decide")
def decide(
    overlap_id: int,
    body: Decision,
    db=Depends(get_db),
    user=Depends(current_user),
):
    sc, sp = scope_clause(user, table_alias="i")
    l = db.execute(
        text(f"""
            SELECT l.* FROM overlap_links l
            JOIN cases ca ON ca.id=l.case_a
            JOIN institutions i ON i.id=ca.institution_id
            WHERE l.id=:i {sc}
        """),
        {"i": overlap_id, **sp},
    ).mappings().first()
    if not l:
        raise HTTPException(404, "Overlap not found")
    if l["status"] != "suggested":
        raise HTTPException(422, "This overlap has already been decided")

    if body.decision == "dismiss":
        if not body.reason:
            raise HTTPException(422, "A reason is required to dismiss an overlap")
        db.execute(
            text(
                "UPDATE overlap_links SET status='dismissed', decided_by=:u, "
                "decision_reason=:r WHERE id=:i"
            ),
            {"u": user["id"], "r": body.reason, "i": overlap_id},
        )

    elif body.decision == "link":
        lead_bureau_id = None
        if body.lead_bureau:
            lead_bureau_id = db.execute(
                text("SELECT id FROM bureaus WHERE code=:c"), {"c": body.lead_bureau}
            ).scalar()
            if not lead_bureau_id:
                raise HTTPException(422, f"Unknown bureau: {body.lead_bureau}")

        db.execute(
            text(
                "UPDATE overlap_links SET status='confirmed', lead_bureau_id=:b, "
                "decided_by=:u, decision_reason=:r WHERE id=:i"
            ),
            {
                "b": lead_bureau_id,
                "u": user["id"],
                "r": body.reason,
                "i": overlap_id,
            },
        )

        if body.hold_other and lead_bureau_id:
            # Set hold_parallel on the case NOT owned by the lead bureau
            db.execute(
                text(
                    "UPDATE cases SET hold_parallel=TRUE "
                    "WHERE id IN (:a, :b) AND bureau_id<>:lead"
                ),
                {"a": l["case_a"], "b": l["case_b"], "lead": lead_bureau_id},
            )

        # Update timelines on BOTH cases
        for cid in (l["case_a"], l["case_b"]):
            db.execute(
                text(
                    "INSERT INTO actions "
                    "(case_id, bureau_id, officer_id, action_type, remarks, meta) "
                    "VALUES (:c, :b, :o, 'link', :r, CAST(:m AS jsonb))"
                ),
                {
                    "c": cid,
                    "b": user.get("bureau_id"),
                    "o": user["id"],
                    "r": body.reason or "Cases linked as related",
                    "m": json.dumps(
                        {
                            "overlap_id": overlap_id,
                            "lead": body.lead_bureau,
                            "hold": body.hold_other,
                        }
                    ),
                },
            )
    else:
        raise HTTPException(422, "decision must be 'link' or 'dismiss'")

    # Audit log
    db.execute(
        text(
            "INSERT INTO audit_log (actor_id, action, entity, entity_id, detail) "
            "VALUES (:u, :a, 'overlap', :i, CAST(:d AS jsonb))"
        ),
        {
            "u": user["id"],
            "a": body.decision,
            "i": str(overlap_id),
            "d": json.dumps(body.model_dump()),
        },
    )
    db.commit()
    return {"ok": True}
