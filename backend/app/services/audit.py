"""
Audit log helper.

write_audit inserts a row into audit_log using the real column names.
It does NOT commit — the caller owns the transaction.

Real audit_log columns (from \d+ audit_log):
  id         bigint (identity)
  actor_id   bigint (FK → officers.id)
  action     text   NOT NULL
  entity     text   NOT NULL
  entity_id  text
  detail     jsonb  NOT NULL DEFAULT '{}'
  created_at timestamptz NOT NULL DEFAULT now()
"""
import json

from sqlalchemy import text


def write_audit(
    db,
    officer_id: int | None,
    action: str,
    entity: str,
    entity_id: str | int | None,
    detail: dict,
) -> None:
    """
    Insert a row into audit_log.
    Does NOT commit — caller must commit after all writes.

    Args:
        db:         SQLAlchemy session
        officer_id: acting officer's id (actor_id); may be None for system actions
        action:     short verb, e.g. 'link', 'dismiss', 'policy_update'
        entity:     entity type, e.g. 'overlap', 'policy', 'case'
        entity_id:  string or int id of the affected entity (stored as text)
        detail:     arbitrary dict stored as JSONB
    """
    db.execute(
        text(
            """
            INSERT INTO audit_log (actor_id, action, entity, entity_id, detail)
            VALUES (:actor_id, :action, :entity, :entity_id, CAST(:detail AS jsonb))
            """
        ),
        {
            "actor_id": officer_id,
            "action": action,
            "entity": entity,
            "entity_id": str(entity_id) if entity_id is not None else None,
            "detail": json.dumps(detail),
        },
    )
