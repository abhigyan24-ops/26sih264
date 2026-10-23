"""
SLA monitoring service.

For each open case:
  - If overdue > escalate_after days: generate escalation alert
  - If overdue > 0: generate sla_breach alert
  - Otherwise: estimate breach risk from historical closed cases
               and generate sla_risk alert if above threshold

Breach risk formula:
  P(breach | still open at age a) = count(T > D) / count(T > a)
  where T = actual resolution time of historically closed cases.

This is a survival-conditional estimate. It ignores still-open cases,
so it can be optimistic. Kaplan-Meier is the proper upgrade when data grows.
Requires MIN_HISTORY closed cases of the same category; falls back to
simple deadline logic otherwise.

Alert generation is idempotent: one alert per (case, kind) per calendar day.
"""
from sqlalchemy import text

RISK_THRESHOLD = 0.6  # parameter_registry: default_pending_data
MIN_HISTORY = 15       # minimum historical cases to use survival estimate


def breach_risk(db, category: str, age_days: int, deadline_days: int) -> float | None:
    """
    Estimate P(breach | case still open at age_days).
    Returns None if insufficient history.
    """
    r = db.execute(
        text(
            """
            WITH d AS (
              SELECT (closed_date - received_date) AS dur FROM cases
              WHERE category=:c AND closed_date IS NOT NULL
            )
            SELECT
              count(*) FILTER (WHERE dur > :a) AS still_open,
              count(*) FILTER (WHERE dur > :D) AS breached,
              count(*) AS n
            FROM d
            """
        ),
        {"c": category, "a": age_days, "D": deadline_days},
    ).one()

    if r.n < MIN_HISTORY or r.still_open == 0:
        return None
    return r.breached / r.still_open


def scan_sla(db) -> int:
    """
    Scan all open cases and generate SLA alerts where needed.
    Returns number of new alerts created.
    """
    open_cases = db.execute(
        text(
            """
            SELECT c.id, c.case_ref, c.category, c.bureau_id, c.received_date,
                   c.sla_due_date, s.deadline_days, s.escalate_after,
                   (CURRENT_DATE - c.received_date) AS age,
                   (CURRENT_DATE - c.sla_due_date)  AS overdue_days
            FROM cases c
            JOIN sla_rules s ON s.category=c.category
            WHERE c.closed_date IS NULL
            """
        )
    ).mappings().all()

    created = 0
    for c in open_cases:
        kind = msg = None
        age = int(c["age"])
        overdue = int(c["overdue_days"])

        if overdue > int(c["escalate_after"]):
            kind = "escalation"
            msg = (
                f"{c['case_ref']} is {overdue} days past deadline — "
                "escalation required"
            )
        elif overdue > 0:
            kind = "sla_breach"
            msg = f"{c['case_ref']} has breached its SLA timeline ({overdue} days overdue)"
        else:
            risk = breach_risk(db, c["category"], age, int(c["deadline_days"]))
            if risk is not None and risk >= RISK_THRESHOLD:
                kind = "sla_risk"
                msg = (
                    f"{c['case_ref']}: {risk:.0%} historical breach probability "
                    f"for {c['category']} cases at age {age} days"
                )

        if kind:
            # Idempotency: only one alert per case per kind per calendar day
            exists = db.execute(
                text(
                    "SELECT 1 FROM alerts "
                    "WHERE case_id=:c AND kind=:k AND created_at::date=CURRENT_DATE"
                ),
                {"c": c["id"], "k": kind},
            ).first()
            if not exists:
                db.execute(
                    text(
                        "INSERT INTO alerts (kind, case_id, bureau_id, message) "
                        "VALUES (:k, :c, :b, :m)"
                    ),
                    {"k": kind, "c": c["id"], "b": c["bureau_id"], "m": msg},
                )
                created += 1

    db.commit()
    return created
