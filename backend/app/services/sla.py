"""
SLA Monitoring and Risk Estimation Service (Stage 8 / T30).

Provides:
- Pure mathematical survival risk estimation: risk_from_counts(...)
- Historical survival breach risk calculation: breach_risk(...)
- SLA batch scanning with daily deduplication: scan_sla(...)
- Case risk inspection for UI badge: get_case_risk(...)
"""
from typing import Any
from sqlalchemy import text

from .params import get_param
from .alerts import create_alert

DEFAULT_RISK_THRESHOLD = 0.6
DEFAULT_MIN_HISTORY = 15


def risk_from_counts(n: int, still_open: int, breached: int, min_history: int) -> float | None:
    """
    Pure arithmetic function for P(breach | still open at age a).
    Formula: count(T > D) / count(T > a) among closed cases of category.
    Returns None when n < min_history or still_open == 0.
    """
    if n < min_history or still_open <= 0:
        return None
    return float(breached) / float(still_open)


def breach_risk(db, category: str, age_days: int, deadline_days: int) -> tuple[float | None, int]:
    """
    Estimate P(breach | case still open at age_days) from closed-case history.
    Returns (risk_or_None, n_closed_history).
    """
    min_history = int(get_param(db, "sla_min_history", DEFAULT_MIN_HISTORY))

    r = db.execute(
        text(
            """
            WITH d AS (
              SELECT (closed_date - received_date) AS dur FROM cases
              WHERE category = :c AND closed_date IS NOT NULL
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

    n = int(r.n)
    still_open = int(r.still_open)
    breached = int(r.breached)

    risk = risk_from_counts(n, still_open, breached, min_history)
    return risk, n


def get_case_risk(db, case_id: int) -> dict[str, Any]:
    """
    Fetch SLA risk status for a specific open or closed case.
    Returns dict: {"risk": float | None, "basis": "history" | "deadline_only", "n_history": int}
    """
    case = db.execute(
        text(
            """
            SELECT c.id, c.case_ref, c.category, c.received_date, c.sla_due_date,
                   s.deadline_days,
                   (CURRENT_DATE - c.received_date) AS age,
                   (CURRENT_DATE - c.sla_due_date) AS overdue_days
            FROM cases c
            JOIN sla_rules s ON s.category = c.category
            WHERE c.id = :id
            """
        ),
        {"id": case_id},
    ).mappings().first()

    if not case:
        return {"risk": None, "basis": "deadline_only", "n_history": 0}

    age = int(case["age"])
    deadline = int(case["deadline_days"])
    risk, n = breach_risk(db, case["category"], age, deadline)

    if risk is not None:
        return {"risk": round(risk, 4), "basis": "history", "n_history": n}

    # Fallback to deadline-only calculation if history is insufficient
    overdue = int(case["overdue_days"])
    if overdue > 0:
        return {"risk": 1.0, "basis": "deadline_only", "n_history": n}
    elif age >= deadline * 0.75:
        # 75%+ of deadline passed without enough history
        est_risk = min(1.0, round(float(age) / float(deadline), 2))
        return {"risk": est_risk, "basis": "deadline_only", "n_history": n}

    return {"risk": None, "basis": "deadline_only", "n_history": n}


def scan_sla(db) -> dict[str, Any]:
    """
    Scan all open cases, calculate overdue/risk status, and generate alerts.
    Idempotent: uses create_alert with dedupe_key per calendar day.
    Returns summary dict:
      {"created": int, "by_kind": {"escalation": int, "sla_breach": int, "sla_risk": int}, "skipped_dupes": int}
    """
    risk_threshold = float(get_param(db, "sla_risk_threshold", DEFAULT_RISK_THRESHOLD))

    open_cases = db.execute(
        text(
            """
            SELECT c.id, c.case_ref, c.category, c.bureau_id, c.received_date,
                   c.sla_due_date, s.deadline_days, s.escalate_after,
                   (CURRENT_DATE - c.received_date) AS age,
                   (CURRENT_DATE - c.sla_due_date)  AS overdue_days
            FROM cases c
            JOIN sla_rules s ON s.category = c.category
            WHERE c.closed_date IS NULL
            """
        )
    ).mappings().all()

    created = 0
    skipped_dupes = 0
    by_kind: dict[str, int] = {"escalation": 0, "sla_breach": 0, "sla_risk": 0}

    for c in open_cases:
        kind = None
        msg = None
        age = int(c["age"])
        overdue = int(c["overdue_days"])
        deadline = int(c["deadline_days"])
        escalate_after = int(c["escalate_after"])

        if overdue > escalate_after:
            kind = "escalation"
            msg = f"{c['case_ref']} is {overdue} days past deadline: escalate"
        elif overdue > 0:
            kind = "sla_breach"
            msg = f"{c['case_ref']} has breached its timeline ({overdue} days overdue)"
        else:
            risk, n = breach_risk(db, c["category"], age, deadline)
            if risk is not None and risk >= risk_threshold:
                kind = "sla_risk"
                msg = f"{c['case_ref']}: {risk:.0%} historical breach risk for {c['category']} cases at this age"
            elif risk is None and deadline > 0 and age >= int(deadline * 0.8):
                # Fallback alert: history is insufficient, deadline rule applied
                kind = "sla_risk"
                days_left = deadline - age
                msg = f"{c['case_ref']}: {days_left} days remaining until SLA deadline (insufficient history: {n} closed cases, deadline rule applied)"

        if kind:
            dedupe_key = f"{kind}_{c['id']}"
            inserted = create_alert(
                db=db,
                kind=kind,
                case_id=c["id"],
                bureau_id=c["bureau_id"],
                message=msg,
                dedupe_key=dedupe_key,
            )
            if inserted:
                created += 1
                by_kind[kind] = by_kind.get(kind, 0) + 1
            else:
                skipped_dupes += 1

    db.commit()
    return {"created": created, "by_kind": by_kind, "skipped_dupes": skipped_dupes}
