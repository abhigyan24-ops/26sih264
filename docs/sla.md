# CaseNexus SLA Monitoring & Background Worker

## 1. Overview
The SLA monitoring subsystem continuously evaluates grievance cases against institutional Service Level Agreements (SLAs) defined in `sla_rules`. It tracks deadlines, computes empirical breach risk from resolution histories, escalates delinquent cases, and issues scoped alerts to officers and administrators.

---

## 2. Running the Worker

From the `backend/` directory:

```bash
# Using uv (recommended)
uv run python -m app.worker

# Or with virtualenv active
python -m app.worker
```

### Worker Behavior
- **Immediate Initial Scan:** Runs an initial scan cycle on startup (`run_once()`) to ensure timely detection.
- **Periodic Interval:** Executes scans every **15 minutes** using APScheduler (`BlockingScheduler(timezone="Asia/Kolkata")`).
- **Resilience:** Errors during individual scan cycles are caught, logged with tracebacks, and swallowed so the process remains active across database hiccups or transient timeouts.
- **Idempotency:** Utilizes `dedupe_key = f"{kind}_{case_id}"` ensuring only one alert of a given kind per case per calendar day is inserted into `alerts`. Repeated worker cycles on the same day increment `skipped_dupes` without creating spam.

---

## 3. SLA Alert Kinds

| Alert Kind | Description | Trigger Condition |
| :--- | :--- | :--- |
| `sla_risk` | **Breach Risk Warning** | Open case exhibits statistical risk $\ge$ `sla_risk_threshold` (default 60%) based on historical closure durations for the grievance category. If closed case sample size is $< 15$, applies fallback deadline proximity rule ($80\%$ of elapsed SLA window). |
| `sla_breach` | **SLA Deadline Breached** | Case has surpassed its resolution target date (`CURRENT_DATE > sla_due_date`, i.e., `overdue_days > 0`) but has not yet hit escalation threshold. |
| `escalation` | **Supervisor Escalation** | Case remains unresolved past the permitted grace window (`overdue_days > escalate_after`). Alerts both regional and bureau supervisors. |

---

## 4. Dynamic Parameters

Parameters are fetched dynamically via `get_param(db, ...)` with a 60-second in-memory cache:

- `sla_risk_threshold`: Probability threshold above which an `sla_risk` alert fires (default: `0.6`).
- `sla_min_history`: Minimum sample size of closed cases required in a category to activate empirical survival risk scoring (default: `15`).
