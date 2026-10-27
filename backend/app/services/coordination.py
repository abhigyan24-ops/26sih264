"""Transactional overlap decisions; no helper commits the caller session."""
import json
from fastapi import HTTPException
from sqlalchemy import text
from .audit import write_audit
from .alerts import create_alert

DISMISS_REASONS = ("different_issue", "already_handled_elsewhere", "data_error", "other")


def overlap_scope(user):
    if user["role"] == "regional":
        return " AND ia.region=:region AND ib.region=:region", {"region": user.get("region")}
    if user["role"] == "officer":
        return " AND (ca.bureau_id=:bureau OR cb.bureau_id=:bureau)", {"bureau": user.get("bureau_id")}
    return "", {}


JOINS = """FROM overlap_links l
JOIN cases ca ON ca.id=l.case_a JOIN cases cb ON cb.id=l.case_b
JOIN institutions ia ON ia.id=ca.institution_id JOIN institutions ib ON ib.id=cb.institution_id
JOIN bureaus ba ON ba.id=ca.bureau_id JOIN bureaus bb ON bb.id=cb.bureau_id"""
FIELDS = """l.id, l.level, l.probability, l.breakdown, l.status, l.lead_bureau_id,
l.explanation, l.explanation_src, l.model_version, l.decision_reason,
ia.id AS institution_id, ia.name AS institution, ia.region,
ca.id AS a_id, ca.case_ref AS a_ref, ca.category AS a_cat, ba.code AS a_bureau,
ca.description AS a_desc, ca.status AS a_status, ca.bureau_id AS a_bureau_id,
cb.id AS b_id, cb.case_ref AS b_ref, cb.category AS b_cat, bb.code AS b_bureau,
cb.description AS b_desc, cb.status AS b_status, cb.bureau_id AS b_bureau_id"""


def get_overlap(db, user, overlap_id, lock=False):
    scope, params = overlap_scope(user)
    row = db.execute(text(f"SELECT {FIELDS} {JOINS} WHERE l.id=:id {scope}" +
                          (" FOR UPDATE OF l" if lock else "")),
                     {"id": overlap_id, **params}).mappings().first()
    if row is None:
        raise HTTPException(404, "Overlap not found")
    return dict(row)


def decide_overlap(db, user, overlap_id, body):
    link = get_overlap(db, user, overlap_id, lock=True)
    if link["status"] != "suggested":
        raise HTTPException(409, "This overlap has already been decided")
    reason = body.reason
    if body.decision == "dismiss":
        if reason not in DISMISS_REASONS:
            raise HTTPException(422, "A valid dismissal reason is required")
        if reason == "other" and not body.note:
            raise HTTPException(422, "Other requires a note")
        stored = reason + (f": {body.note}" if body.note else "")
        db.execute(text("UPDATE overlap_links SET status='dismissed', decided_by=:u, "
                        "decision_reason=:r WHERE id=:id"),
                   {"u": user["id"], "r": stored, "id": overlap_id})
    else:
        choices = {link["a_bureau"]: link["a_bureau_id"], link["b_bureau"]: link["b_bureau_id"]}
        if body.lead_bureau is not None and body.lead_bureau not in choices:
            raise HTTPException(422, "Lead must be one of the two cases' bureaus")
        if body.hold_other and not body.lead_bureau:
            raise HTTPException(422, "Holding the other case requires a lead")
        lead = choices.get(body.lead_bureau)
        db.execute(text("UPDATE overlap_links SET status='confirmed', lead_bureau_id=:lead, "
                        "decided_by=:u, decision_reason=:r WHERE id=:id"),
                   {"lead": lead, "u": user["id"], "r": body.note or reason, "id": overlap_id})
        if body.hold_other:
            db.execute(text("UPDATE cases SET hold_parallel=TRUE WHERE id IN (:a,:b) AND bureau_id<>:lead"),
                       {"a": link["a_id"], "b": link["b_id"], "lead": lead})
        for side in ("a", "b"):
            cid, bureau = link[f"{side}_id"], link[f"{side}_bureau_id"]
            db.execute(text("INSERT INTO actions (case_id,bureau_id,officer_id,action_type,remarks,meta) "
                            "VALUES (:c,:b,:u,'link',:r,CAST(:meta AS jsonb))"),
                       {"c": cid, "b": user.get("bureau_id") or bureau, "u": user["id"],
                        "r": body.note or reason or "Cases linked",
                        "meta": json.dumps({"overlap_id": overlap_id, "lead": body.lead_bureau,
                                            "hold": body.hold_other})})
            create_alert(db, "system", cid, bureau, f"Cases linked, lead: {body.lead_bureau or 'not nominated'}", overlap_id)
    write_audit(db, user["id"], body.decision, "overlap", overlap_id, body.model_dump())
    return {"ok": True}
