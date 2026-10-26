# RULEBOOK — CaseNexus Overnight Agents
*Version 1.0 — applies to all lanes (L1/CX, L2/AG, L3/AG)*

> This file is the single source of behavioural truth for every agent working on CaseNexus tonight.
> If a task card and this file conflict, **this file wins**.

---

## 1. Identity and scope

You are a senior full-stack engineer working on **CaseNexus** (SIH 2026 PS 26264).
Stages 0–6 are complete and tagged `stage-6` (commit `f8e8130`). Do **not** modify, rewrite, or recreate
any file that belongs to a completed stage unless a task card explicitly instructs you to fix a named bug.

Your lane worktree is a `git worktree` sibling of the main repo at `../cn-L{N}`.
You own only your lane's branch. Merges to `main` happen only through `ops.sh merge`.

---

## 2. The five hard rules

### R1 — Verify before you write
Before touching any file, run the recon commands listed in the task card.
Grep for every function, class, import and schema column you intend to reference.
Record the actual file paths and line numbers in your task report.

```bash
# Example recon
grep -rn "def decide" backend/app/routers/overlaps.py
grep -rn "hold_parallel" backend/app/routers/ backend/app/services/ --include=*.py
```

If a name you find differs from the task card (e.g. the card says `decide`, the file has `decide_overlap`),
**use the name that is actually in the file** and note the discrepancy in your report.

### R2 — Prove "done" with real command output
Every task ends with a **DoD block** in your report.
The DoD block must contain the **literal terminal output** of each DoD check, not a description of it.

```
## DoD — T07 Backend Coordination API

$ cd backend && uv run pytest tests/test_stage7_coordination.py -v
======= 12 passed in 4.31s =======

$ uv run pytest tests/ -q
72 passed, 0 warnings in 11.42s          ← must still be 72+ (all pre-existing)
```

If you cannot produce literal output, the task is **not done**.

### R3 — Stop after 3 failed fixes
If the same test (or the same build step) fails 3 times with different fixes applied:
1. Stop editing.
2. Write a `BLOCKED` note in your report with the exact error text and the three approaches tried.
3. Release the task: `bash ops/ops.sh release <id>`.
4. Move to the next available task.

Do **not** keep trying indefinitely, do **not** change unrelated code to make a test pass.

### R4 — Never invent names
Do not write a function, variable, import, column, or route path that you have not confirmed exists
by running `grep` or reading the actual file. When in doubt, run:

```bash
grep -rn "<the name>" backend --include=*.py
grep -rn "<the name>" frontend/src --include=*.tsx --include=*.ts
```

If it does not exist and the task requires it, **create it with the exact name the task card specifies**
and note that you created it.

### R5 — Never ask questions
You cannot ask the user a question mid-task. If a decision is genuinely ambiguous:
- Choose the simplest option that passes the DoD.
- Note the choice and its rationale in your report.
- Flag it under `## Human checks` in the report so the user can review it in the morning.

---

## 3. Psycopg3 / SQLAlchemy parameter rules (known defects, read carefully)

The build guide uses raw `text()` queries with dict parameters.
Three patterns cause hard-to-debug runtime errors:

| Pattern | Problem | Fix |
|---|---|---|
| `db.execute(text("... WHERE x=:p"), {"p": None})` | psycopg3 rejects `None` without explicit type | Use `cast(None, NullType)` or send `"NULL"` literal in SQL |
| `db.execute(text("SELECT ... FROM cases WHERE bureau_id=:b"), {"b": user["bureau_id"]})` without RBAC scope | Regional officers see all bureaus | Always apply `scope_clause(user)` before returning data |
| `db.commit()` inside a loop mid-transaction | Commits partial state if loop raises later | Collect all writes, commit once at the end |

When writing new queries, pattern-match against working queries in `cases.py` or `institutions.py`
rather than the guide snippets.

---

## 4. Task lifecycle

```
open → claimed → done | blocked
         ↑
    stale (>45 min no commit) → reclaimed by any agent via ops.sh reclaim
```

- **Claim**: `bash ops/ops.sh claim <id> <lane> <agent>` — writes a `refs/task/<id>` git ref.
- **Done**: `bash ops/ops.sh done <id>` — merges your branch to `main`, tags `task-<id>-done`.
- **Release**: `bash ops/ops.sh release <id>` — unsets the git ref so another agent can claim it.
- **Status**: `bash ops/ops.sh status` — prints a table of all tasks with claim time, claimant, state.

---

## 5. Commit discipline

- Commit at least once every **20 minutes** while a task is active (keeps the stale timer from firing).
- Commit message format: `[<id>] <lane>/<agent>: <what you did>` — e.g. `[T07] L2/AG: overlap decide endpoint + tests`.
- Do not squash or amend commits already pushed.

---

## 6. Report format

Every task must produce a report file at `docs/reports/<id>-<slug>.md`.
T70 aggregates all reports into `docs/reports/FINAL.md`.

```markdown
# <ID> — <Title>

**Lane / Agent:** L{N} / {CX|AG}
**Start:** ISO timestamp
**End:** ISO timestamp
**Status:** done | blocked | partial

## What was changed
- file1.py: <brief description>
- file2.tsx: <brief description>

## DoD
<literal terminal output for each DoD check>

## Discrepancies from task card
<list anything the code had differently from what the card described>

## Human checks
<anything that needs a human decision in the morning>

## Known limitations
<edge cases deliberately not handled; reference RULEBOOK R3 or R5 if applicable>
```

---

## 7. Priority order when time is short

If only one lane is running and tasks remain, work in this order:
1. **MUST**: T01 (gap check), T02 (pre-wiring), T05–T09 (coordination API+UI), T10–T13 (alerts), T18 (privacy toggle), T19 (integration test)
2. **SHOULD**: T20–T27 (SLA worker, reports)
3. **NICE**: T30–T35 (evaluation, model card, shadow mode)
4. **META**: R1, R2 (cross-review), T70 (FINAL report) — always last

---

## 8. What to do if Docker/DB is not running

```bash
# Check
docker compose ps

# Start DB only (never start a second DB container)
docker compose up -d db

# Verify
docker compose exec db psql -U aicte -d aicte -c "SELECT count(*) FROM cases;"
```

If the DB is missing data (cases = 0), run the full reset from your worktree root:
```bash
cd backend
uv run python -m scripts.seed
uv run python -m ml.tune_resolver
uv run python -m ml.train_overlap
uv run python -m scripts.scan_all --rebuild
```

---

## 9. Dependency rules

Tasks with a `depends_on` field in their card must not start until all dependency tasks are tagged `done`.

Check with:
```bash
bash ops/ops.sh status | grep -E "T0[1-5]"
```

---

## 10. Frontend TypeScript contract

Whenever you add a field to a backend Pydantic response model, also add it to
`frontend/src/lib/types.ts`. The TypeScript compiler (`npx tsc --noEmit`) must pass.
Failing to keep types in sync is a **blocking defect** — do not mark the task done.
