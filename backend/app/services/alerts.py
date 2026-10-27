"""
Alert creation helper.

create_alert inserts a row into alerts using the real column names.
It does NOT commit — the caller owns the transaction.

Real alerts columns (from \d+ alerts):
  id          bigint (identity)
  kind        text NOT NULL  CHECK (kind IN ('overlap_high','overlap_medium','pending',
                                             'escalation','sla_risk','sla_breach','system'))
  case_id     bigint  (FK → cases.id ON DELETE CASCADE)
  overlap_id  bigint  (FK → overlap_links.id ON DELETE CASCADE)
  bureau_id   bigint  (FK → bureaus.id)
  message     text NOT NULL
  read        boolean NOT NULL DEFAULT false
  created_at  timestamptz NOT NULL DEFAULT now()

Allowed kind values (CHECK constraint):
  overlap_high, overlap_medium, pending, escalation, sla_risk, sla_breach, system
"""
from sqlalchemy import text

ALLOWED_KINDS = frozenset(
    ("overlap_high", "overlap_medium", "pending", "escalation", "sla_risk", "sla_breach", "system")
)


def create_alert(
    db,
    kind: str,
    case_id: int | None,
    bureau_id: int | None,
    message: str,
    overlap_id: int | None = None,
    dedupe_key: str | None = None,
) -> None:
    """
    Insert a row into alerts.
    Does NOT commit — caller must commit after all writes.

    When dedupe_key is set, skips the insert if an identical
    (kind, case_id, bureau_id) alert already exists today.
    When dedupe_key is None, always inserts (legacy behaviour unchanged).

    Args:
        db:         SQLAlchemy session
        kind:       one of ALLOWED_KINDS (validated at runtime)
        case_id:    FK to cases; may be None for non-case alerts
        bureau_id:  FK to bureaus; may be None for global alerts
        message:    human-readable alert text
        overlap_id: FK to overlap_links; may be None
        dedupe_key: when set, suppresses duplicate (kind,case_id,bureau_id) alerts
                    on the same calendar day
    """
    if kind not in ALLOWED_KINDS:
        raise ValueError(f"Invalid alert kind: {kind!r}. Must be one of {sorted(ALLOWED_KINDS)}")

    if dedupe_key is not None:
        exists = db.execute(
            text(
                """
                SELECT 1 FROM alerts
                WHERE kind = :kind
                  AND (case_id = :case_id OR (:case_id IS NULL AND case_id IS NULL))
                  AND (bureau_id = :bureau_id OR (:bureau_id IS NULL AND bureau_id IS NULL))
                  AND created_at::date = CURRENT_DATE
                LIMIT 1
                """
            ),
            {"kind": kind, "case_id": case_id, "bureau_id": bureau_id},
        ).first()
        if exists:
            return   # deduplicated — skip insert

    db.execute(
        text(
            """
            INSERT INTO alerts (kind, case_id, overlap_id, bureau_id, message)
            VALUES (:kind, :case_id, :overlap_id, :bureau_id, :message)
            """
        ),
        {
            "kind": kind,
            "case_id": case_id,
            "overlap_id": overlap_id,
            "bureau_id": bureau_id,
            "message": message,
        },
    )
