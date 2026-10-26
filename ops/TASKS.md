# TASKS — CaseNexus Stage 7 to 10 (feature-wise)

Format rules for the coordinator: each task starts with `## <ID> <title>`; `Prefer:` (CX, AG or ANY), `Depends:` (ids or none) are single-line fields. Guide line numbers refer to `docs/AICTE_Prototype_Build_Guide.md`.

**Assumption:** Stage 6 (overlap engine: resolver, embeddings, training, scan, backfill, `routing.py` stub) is already merged on `main`. T01 verifies this and, if it is missing, records `STAGE 6 MISSING` and implements the minimum from `docs/STAGE_6_SPEC.md` first.

**Cut order if time runs out** (drop from the bottom): MUST = T01, T10, T11, T20, T50, T51, T70. SHOULD = T30, T31, T40, T41, R1. NICE = T60, T61, R2.

Common to every card: read `ops/RULEBOOK.md`; work only in the files under `Owns`; create `docs/reports/<ID>.md`; finish with `ops/ops.sh finish`.

---

## T01 Recon, baseline and pre-wiring
Prefer: CX
Depends: none
Priority: MUST
Migration: 001
Owns: shared wiring only (list below), `db/migrations/README.md`, `db/migrations/001_prewire.sql` (if any), `docs/reports/T01.md`
Read: `ops/RULEBOOK.md`; guide Stages 7 to 9 headings (lines 1571 to 2000); `db/schema.sql`; `backend/app/main.py`; `frontend/src/components/Layout.tsx`; the routers folder.

Do:
1. **Recon.** Report in the report file: git log (last 15), test baseline (`pytest -q`, `npx tsc --noEmit`), and a table of what exists for each of: `services/routing.py` (stub?), `services/overlap.py`, `ml/artifacts/ACTIVE`, `overlap_links` row count, `cases` embedded count, tables `alerts, actions, audit_log, policy_settings, egress_ledger, parameter_registry, model_versions, sla_rules` with their **real column names and CHECK constraints** (`\d+ <table>`). Every later task must use these real names, so copy them into the report.
2. If Stage 6 pieces are missing (`ACTIVE` pointer, overlap rows, scan, `routing.py`), write `STAGE 6 MISSING: <list>` at the top of the report and implement the minimum from `docs/STAGE_6_SPEC.md` sections 5 and 6 so the later tasks can run; otherwise write `STAGE 6 OK`.
3. **Pre-wire** (placeholders and contracts only; no feature logic):
   - `services/audit.py`: `write_audit(db, officer_id, action, entity, entity_id, detail: dict)`; inserts into `audit_log` using its real columns; does **not** commit (caller commits).
   - `services/alerts.py`: `create_alert(db, kind, case_id, bureau_id, message, overlap_id=None, dedupe_key=None)`; inserts into `alerts`; no commit. Check the table's allowed `kind` values (CHECK constraint); document them in the report.
   - `services/params.py`: `get_param(db, name, default)` reads the newest `parameter_registry` value as float (fall back to `default`), cached 60 seconds. If a similar helper already exists, wrap or reuse it.
   - `services/shadow.py`: `shadow_score(db, case_a, case_b, feats)` no-op; make `services/overlap.py` call it (guarded, after the visible write) so Stage 10 only fills it. If scan already has a hook, keep it.
   - Empty routers `routers/{overlaps,alerts,sla,reports,privacy,evaluation}.py` (skip any that already exist and work) registered in `main.py`; each exposes `router = APIRouter(prefix=..., tags=[...])` only.
   - Frontend: nav items in `Layout.tsx` (Review overlaps, Alerts, Reports, Admin) and placeholder pages/routes; Admin page with tab slots `Privacy` and `Evaluation` (empty components); `src/api/` one empty file per feature.
   - `db/migrations/README.md`: number ranges (010 Stage 6, 030 coordination, 040 alerts/SLA, 050 evaluation, 060 privacy).
4. **Known Stage 3 bug check:** in `list_cases`, the institution filter is appended as `i.normalized_name % :inst OR i.name ILIKE :instl` without parentheses, which breaks the AND chain and can bypass the regional scope clause. If still present, wrap it in parentheses and add a regression test (regional user + institution filter returns only in-region rows). This is the one allowed edit outside the shared wiring; record it in the report.
5. Do not edit `ops/`.

Checks: backend starts; `/docs` lists the new empty routers; frontend builds; all existing tests still pass; each contract function imports.
Not yours: any feature logic.

---

## T10 Coordination API
Prefer: CX
Depends: T01
Priority: MUST
Migration: 030 (only if a column/constraint is genuinely needed)
Owns: `backend/app/routers/overlaps.py`, `backend/app/services/coordination.py`, `backend/tests/test_coordination.py`
Read: guide lines 1571 to 1633 (7.1) and 1717 to 1719 (DoD); T01 report (real column names); Stage 5 region-scoping helper (`scope_clause`).

Known defects in the guide code (fix them):
- `:lvl IS NULL` with an untyped parameter can raise a datatype error with psycopg3. Use `CAST(:lvl AS text) IS NULL` or build the WHERE conditionally. Same pattern anywhere else.
- No region/bureau scoping: a regional user must only see/decide overlaps whose cases are in their scope (use the same scoping helper Stage 5 uses).
- A link can be decided twice. Allow a decision only while `status='suggested'`; otherwise 409.
- `lead_bureau` unknown or not one of the two cases' bureaus silently becomes NULL: reject with 422. `hold_other` without a lead: 422.
- Dismiss reasons must come from a **fixed list** (`different_issue`, `already_handled_elsewhere`, `data_error`, `other`) plus an optional note; store `decision_reason` as `<code>` or `<code>: <note>`. These are training labels, so keep them clean. `other` requires a note.
- `actions.bureau_id` should be the acting officer's bureau, falling back to the case's bureau when the officer has none.
- Each decision runs in **one transaction**: update link, update cases (`hold_parallel`), insert `link` actions on **both** cases, `write_audit`, and `create_alert` to both bureaus (an informational "Cases linked, lead: X" message; use only allowed alert kinds). If any part fails, nothing is saved.

Do:
1. `GET /api/overlaps` with `status`, `level`, `institution_id`, `limit`, `offset`; `X-Total-Count` header; high first, then probability. Never return `issue_key`.
2. `GET /api/overlaps/{id}` (single, same fields).
3. `POST /api/overlaps/{id}/decide` per the defects above. Add `GET /api/overlaps/dismiss-reasons` returning the fixed list.
4. `GET /api/cases/{id}/overlaps` (read-only list for the case page) only if it does not already exist; put it in `overlaps.py` and keep the case router untouched.
5. Tests: decide link sets `status='confirmed'`, `hold_parallel` only on the non-lead case, two `link` actions, an audit row, two alerts; dismiss without reason 422; dismiss with bad code 422; double decision 409; regional user cannot see or decide an out-of-region overlap (404); list with and without `level` filter works.

Checks (run and paste output): the pytest file; `curl` list, decide, and the demo flow (register the RB case from the Stage 6 demo scenario, find the high overlap, link with lead RB, then verify the PGRC case has `hold_parallel=true` via `psql`).
Not yours: the review screen (T11).

---

## T11 Coordination UI
Prefer: AG
Depends: T10
Priority: MUST
Owns: `frontend/src/pages/Overlaps.tsx` (the review page), `frontend/src/components/overlap/*`, `frontend/src/api/overlaps.ts`, additive overlap actions on Case detail via `components/overlap/*` only
Read: guide lines 1635 to 1693 (7.2); T10 report (real response shape); existing UI components (shadcn) and how other pages fetch data (TanStack Query).

Do:
1. Review page: tabs Suggested / Confirmed / Dismissed; level filter (All/High/Medium/Info); list ordered as returned; paging using `X-Total-Count`; loading, empty and error states.
2. `OverlapCard` from the guide, but: use the project's button components (the guide's `btn` classes may not exist); show breakdown bars with a label "Explanation (not the probability itself)"; handle an empty `breakdown` (untrained model) without crashing; show `explanation_src`.
3. Decision UI: "Link" opens a small dialog: choose lead (the two bureaus), checkbox "Hold the other case", optional note. "Not related" opens a dialog with the fixed reasons from `/api/overlaps/dismiss-reasons` (no `prompt()`), note required for `other`. Disable buttons while saving; on success invalidate queries and show a toast; on 409 show "already decided" and refresh.
4. Case detail page: under the existing overlap chips show status and a link to the review item; no decision actions on that page.
5. Regional users see only what the API returns; do not filter client-side.

Checks: `npx tsc --noEmit`; `npm run build`; with a browser tool, open the page, link one overlap and dismiss another, confirm the timeline shows the `link` action on both cases (or list under `## Human checks` if no browser).
Not yours: backend files.

---

## T20 Alerts API and screen
Prefer: AG
Depends: T01
Priority: MUST
Owns: `backend/app/routers/alerts.py`, `backend/tests/test_alerts.py`, `frontend/src/pages/Alerts.tsx`, `frontend/src/components/alerts/*`, `frontend/src/api/alerts.ts`, bell badge area in `Layout.tsx` (marked region only)
Read: guide lines 1695 to 1715 (7.3); T01 report (alerts columns and allowed kinds); `services/alerts.py`.

Known defects (fix): `(a.bureau_id = :b OR :b IS NULL)` has the same untyped-parameter risk and lets a user with no bureau see everything: officers see their bureau's alerts; `regional` see alerts for cases in their scope; `management/admin` see all. `mark_read` has no ownership check (anyone can mark any alert): only alerts the user may see. The column is named `read`; use it exactly as in the real schema.
Do:
1. `GET /api/alerts` (`unread_only`, `kind`, `limit`, `offset`, `X-Total-Count`), `GET /api/alerts/unread-count`, `POST /api/alerts/{id}/read`, `POST /api/alerts/read-all`.
2. Make `services/alerts.py::create_alert` skip an insert when an identical `(kind, case_id, bureau_id)` alert exists the same day **and** `dedupe_key` is set (keep the signature unchanged). Do not change behaviour for callers that pass no `dedupe_key`.
3. Alerts page: list with kind badge, message, case link, time, unread dot; filter by kind; "mark all read"; empty state. Bell icon with unread count in the header polling every 15 seconds.
4. Tests: scoping per role, mark-read ownership (404), unread count, dedupe.
Checks: pytest; `tsc`; `build`; curl as two different bureau users to prove scoping.
Not yours: SLA logic (T30).

---

## T30 SLA risk service and scan
Prefer: CX
Depends: T01
Priority: SHOULD
Owns: `backend/app/services/sla.py`, `backend/app/routers/sla.py`, `backend/tests/test_sla.py`
Read: guide lines 1724 to 1769 (8.1) and 1836 to 1838 (DoD); T01 report (`sla_rules` columns; alert kinds); `services/params.py`.

Known defects (fix): `RISK_THRESHOLD = 0.6` is a constant; read `sla_risk_threshold` via `get_param` (default 0.6, origin stays `default_pending_data` until T60 tunes it). `MIN_HISTORY` must also come from `get_param` (`sla_min_history`, default 15). Split the SQL from the arithmetic: a **pure** function `risk_from_counts(n, still_open, breached, min_history)` that returns `None` when history is insufficient, so it is unit-tested without a DB. The alert text for the fallback case must say plainly that history is insufficient and only the deadline rule applied. Check `escalate_after` semantics against `sla_rules` real columns. Dedupe: once per case, kind and day, and use `create_alert` with `dedupe_key`.
Do:
1. `breach_risk`, `scan_sla` as per the guide with the fixes; return a summary dict `{created, by_kind, skipped_dupes}`.
2. `POST /api/sla/scan` (admin only) runs one scan and returns the summary (for the demo and for T31 UI).
3. `GET /api/sla/risk/{case_id}` returns `{risk: float|None, basis: "history"|"deadline_only", n_history}` for the Case detail badge.
4. Tests: pure function cases (n below minimum, zero still-open, normal), scan creates each of `sla_risk`, `sla_breach`, `escalation` on seeded or inserted fixture cases, running the scan twice the same day creates no duplicates.
Checks: pytest; run the scan via curl and show counts by kind.
Not yours: the scheduler (T31).

---

## T31 SLA worker, risk badge
Prefer: AG
Depends: T30
Priority: SHOULD
Owns: `backend/app/worker.py`, `backend/tests/test_worker.py`, risk badge component `frontend/src/components/sla/*`, a README paragraph under `docs/sla.md`
Read: guide lines 1771 to 1789 (8.2); T30 report.

Known defect: the guide's `s.add_job(job, "interval", minutes=15, next_run_time=None)` creates the job **paused**, so the 15-minute scan never runs; remove `next_run_time=None`. Check this against the installed APScheduler (`python -c "import apscheduler; print(apscheduler.__version__)"` and its docs/source) before changing, and state what you found in the report.
Do:
1. `app/worker.py` with a `run_once()` function and a `main()` that runs once at start and then every 15 minutes; log counts; catch and log exceptions so the loop survives a failed scan.
2. Test: the scheduler has one job with a non-None next run time (build the scheduler without starting it); `run_once()` calls the scan.
3. Badge on Case detail: shows "Breach risk X% (history n)" or "Deadline-only (not enough history)" from T30's endpoint, with colour by level; handle loading/error.
4. `docs/sla.md`: how to run the worker (`python -m app.worker`), what each alert kind means.
Checks: pytest; `tsc`; `build`; run the worker for one cycle and show its log line.
Not yours: SLA maths (T30).

---

## T40 Reports API
Prefer: AG
Depends: T01
Priority: SHOULD
Owns: `backend/app/routers/reports.py`, `backend/app/services/reports.py`, `backend/tests/test_reports.py`
Read: guide lines 1791 to 1838 (8.3); Stage 5 region-scoping helper; T01 report.

Do (all endpoints respect role/region scoping and take optional `date_from`, `date_to`):
1. JSON: `bureau-wise`, `region-wise`, `institution/{id}` history, `ageing` (buckets 0-15, 16-30, 31-60, 61-90, 90+ for open cases), `disposal-rate` (disposed/received per month), `overlaps` (by level and status), `trend?period=month|quarter`.
2. Downloads: `bureau.xlsx` (openpyxl, header row, correct numbers) and `bureau.pdf` (ReportLab `SimpleDocTemplate` + `Table`, title, generated date, a line "Prototype data: synthetic").
3. Validate query parameters (clean 422 for bad dates/period). Empty data returns empty arrays, not errors.
4. Tests: ageing buckets sum equals open-case count; xlsx opens with openpyxl and its totals equal the JSON endpoint; pdf starts with `%PDF`; a regional user's totals are smaller or equal and only include their region.
Checks: pytest; curl each endpoint; open the xlsx with a Python snippet and print its rows.
Not yours: the page (T41).

---

## T41 Reports page
Prefer: AG
Depends: T40
Priority: SHOULD
Owns: `frontend/src/pages/Reports.tsx`, `frontend/src/components/reports/*`, `frontend/src/api/reports.ts`
Read: T40 report (response shapes); existing chart usage (Recharts) on the dashboard.

Do: page with 4 charts (bureau-wise stacked open/disposed/overdue, ageing bars, monthly trend line, overlaps by level), a date-range filter, a table under each chart, and download buttons for xlsx and pdf (use authenticated fetch + blob, since the endpoints need the token). Loading, empty and error states. Label "Synthetic prototype data".
Checks: `tsc`; `build`; downloaded files open (or list under `## Human checks`).
Not yours: backend files.

---

## T50 Privacy mode backend (router, egress, policy)
Prefer: CX
Depends: T01
Priority: MUST
Migration: 060 (only if `policy_settings`/`egress_ledger` need changes)
Owns: `backend/app/services/routing.py`, `backend/app/services/egress.py`, `backend/app/routers/privacy.py`, `backend/tests/test_routing.py`, `backend/tests/test_egress.py`
Read: guide lines 1841 to 1999 (Stage 9); T01 report (`policy_settings`, `egress_ledger`, `audit_log` real columns); how `services/overlap.py` calls `explain_overlap`.

Known defects (fix):
- `egress.send` calls `db.commit()` mid-transaction. The overlap scan runs inside a SAVEPOINT in `create_case`; a commit there commits the whole outer transaction early. Write ledger rows through an **independent short session** (`SessionLocal()` with its own commit) so ledger entries persist even if the caller rolls back, and never commit the caller's session.
- `egress.send` re-reads the policy itself and ignores sensitivity. Route all decisions through `routing.resolve_route(db, capability, sensitive)`; `send` takes `sensitive: bool`; sensitive always blocks.
- The guide's `_fail` circuit breaker never resets (after 3 failures online is dead until restart). Reset after a success or after a cool-down (e.g. 5 minutes); keep it in module state and unit-test it.
- `template_explanation` duplicates the Stage 6 stub and uses `2.718281828 ** days - 1`; keep **one** implementation using `math.expm1` and keep the signature `explain_overlap(db, breakdown, a, b, sensitive=False) -> (text, source)` unchanged.
- Policy audit detail was built with an f-string; use `json.dumps`.
- The guide's integration test says no `sent` rows, but the ledger outcomes are `blocked`/`stub`; assert on `mode='online'` rows instead (use the real column values from the report).
- Validate `scope` against `global/email/explain/enrich`.

Do:
1. `routing.py` with `resolve_route` (strictest wins: sensitive > per-capability > global; default offline; **unknown or missing value means offline**), providers behind one interface (offline template always works; online LLM is a **stub** that goes through egress and returns the template text plus `[LLM stub]`), fail-to-local.
2. `egress.py` with redaction (email, 10-digit phone; extend with names only if cheap), ledger writes as above, `EgressBlocked`.
3. `routers/privacy.py`: `GET /api/policy`, `PUT /api/policy` (admin; audit row; takes effect immediately without restart), `GET /api/egress-ledger` (admin/management; `limit`, `offset`), `GET /api/policy/status` (global, per-capability, `no_external_calls: bool`).
4. Tests: the three routing cases from the guide plus unknown value, sensitive beats everything, breaker reset, send blocked when offline writes a `blocked` row, send never commits the caller's session (use a session and assert a rollback still discards caller data while the ledger row persists), integration: global offline then create 20 cases through the API and assert **zero** ledger rows with `mode='online'`; set global online and verify `explanation_src` changes to `llm` for a normal case and stays `template` for a sensitive case, no restart.
Checks: pytest; curl PUT policy as admin and as non-admin (403); show ledger rows.
Not yours: ModeBar and tabs (T51).

---

## T51 Privacy mode UI
Prefer: AG
Depends: T50
Priority: MUST
Owns: `frontend/src/components/admin/PrivacyTab.tsx`, `frontend/src/components/ModeBar.tsx`, the marked mode-bar region in `Layout.tsx`, `frontend/src/api/privacy.ts`, lock icon component
Read: guide lines 1968 to 1970 (9.5); T50 report.

Do: thin top bar: global mode badge, per-capability badges, "No external calls" indicator when everything is offline; admins get toggles calling `PUT /api/policy` (confirmation on switching to online; optimistic UI with rollback on error); non-admins read-only. Lock icon on any case with `sensitivity_flag` (case list and detail). Privacy tab in Admin: policy table and the egress ledger table (paged), with the mode and outcome columns. Poll status every 10 seconds.
Checks: `tsc`; `build`; with a browser: toggle global to online and back, register a case, confirm the explanation source changes (or `## Human checks`).
Not yours: backend files.

---

## T60 Evaluation backend (metrics, tuning, shadow, promote, model card)
Prefer: CX
Depends: T10, T30
Priority: NICE
Migration: 050
Owns: `backend/ml/evaluate.py`, `backend/ml/tune_sla.py`, `backend/ml/promote.py`, `backend/app/services/shadow.py`, `backend/app/routers/evaluation.py`, `backend/tests/test_evaluation.py`, additive `--shadow` flag in `backend/ml/train_overlap.py` only
Read: guide lines 2002 to 2031 (Stage 10); `docs/STAGE_6_SPEC.md` sections 4.3 and 6.3 if present; T01, T10, T30 reports.

Do:
1. `ml/evaluate.py`: uses the **same institution-grouped held-out split as training** (reuse its function; do not reimplement differently). Report PR-AUC, precision and recall at the High and Medium thresholds, alerts per active case, a baseline (cosine >= 0.80) comparison, the 10 worst false positives and false negatives, and a calibration table. Write `ml/artifacts/<version>_eval.json` and store the metrics in `model_versions.metrics`. Print the warning "synthetic data; not real-world accuracy". If positives are mostly near-identical text, say the data is probably too easy.
2. Resolver thresholds: if `ml/tune_resolver.py` exists use it; otherwise implement the guide's 10.2 rule (auto-accept = lowest score with precision > 0.98; review floor = recall 0.95) on generated name variants. Write registry rows with the real origin (`learned_synthetic` only when targets are met).
3. `ml/tune_sla.py`: replay closed cases to choose `sla_risk_threshold` (earliest warning with an acceptable false-warning rate); report the lead time gained; write the registry row with origin and metrics. If history is too small, keep the default and say so.
4. Shadow mode: migration 050 adds `shadow_scores` (case_a, case_b, model_version, probability, level, created_at) and a **unique partial index so at most one model is `active`**. Check `model_versions.status` allows `shadow`. `shadow_score` scores with the shadow model if one exists and writes a row; **no alerts, no visible output**, and a shadow failure must never break case creation.
5. `ml/promote.py` and endpoints: `GET /api/evaluation/models`, `GET /api/evaluation/shadow-disagreements` (pairs where active and shadow disagree, with counts and a would-be extra alerts per day estimate), `POST /api/evaluation/promote/{version}` and `POST /api/evaluation/rollback` (admin; one transaction; audit; the `ACTIVE` pointer file written atomically after the DB commit).
6. `GET /api/model-card`: every `parameter_registry` row (parameter, value, origin, derived_from, metrics, model version).
7. Tests: promote/rollback keep exactly one active model; the unique index rejects two; shadow failure does not break scanning; model card lists every registry row.
Checks: run `python -m ml.evaluate`, `python -m ml.tune_sla` and show their output; pytest.
Not yours: the pages (T61).

---

## T61 Model card and evaluation UI
Prefer: AG
Depends: T60
Priority: NICE
Owns: `frontend/src/components/admin/EvaluationTab.tsx`, `frontend/src/components/admin/ModelCardTab.tsx`, `frontend/src/api/evaluation.ts`
Read: T60 report (response shapes).

Do: Admin tabs **Evaluation** (metrics table, baseline comparison, calibration table, worst false positives/negatives, a banner "synthetic data") and **Model card** (every registry row with origin badges: learned_synthetic, default_pending_data, policy), shadow disagreements list, promote/rollback buttons for admins with a confirmation dialog. Handle empty states ("no shadow model").
Checks: `tsc`; `build`.
Not yours: backend files.

---

## R1 Cross-review of coordination, alerts and SLA
Prefer: ANY
Depends: T10, T11, T20, T30, T31
Priority: SHOULD
Owns: `docs/reports/R1.md` and small bug fixes in the reviewed files (each fix a separate commit `fix(<task>): ...`)
Read: the reports and diffs of T10, T11, T20, T30, T31 (`git log --stat main`). **If your lane authored any of these (see `Lane:` in their reports), review only the ones you did not author.**

Do: for each task re-run its Checks yourself; read the diff against its card; look specifically for invented names (grep every identifier the diff uses), unscoped queries, double-commit risks, missing empty/error states, tests that assert nothing, and hard-coded values. Fix only clear bugs; list everything else in the report as findings with file and line.

---

## R2 Cross-review of reports, privacy and evaluation
Prefer: ANY
Depends: T40, T41, T50, T51
Priority: NICE
Owns: `docs/reports/R2.md` and small bug fixes in the reviewed files
Read: as R1, for T40, T41, T50, T51 (and T60, T61 if merged). Same rules, including not reviewing your own lane's work.
Extra checks: with global offline, create 20 cases and confirm the ledger has zero online rows; confirm a sensitive case never reaches online even when global is online.

---

## T70 Integration, demo reset and README
Prefer: ANY
Depends: T10, T11, T20, T50, T51
Priority: MUST
Owns: `scripts/reset_demo.py` (create or extend), `README.md`, `docs/reports/FINAL.md`, small integration fixes anywhere (each in its own commit and listed)
Read: guide lines 2141 to 2163 (Stage 12 demo and rehearsal); all merged reports.

Deadline rule: if the machine clock reads 07:00 or later and this task is still blocked, start it with `FORCE=1 ops/ops.sh start T70` and document in the final report which dependencies were incomplete.
Do:
1. On a fresh lane DB: run migrations, seed, train, backfill, start API and web, run the **full** test suite, `tsc`, `build`. Fix integration failures.
2. Walk the 7-minute demo flow from the guide against the running app and record each step as PASS/FAIL with evidence: login, dashboard, register the RB case at ABC Engineering College, high overlap appears, link with lead, hold on the other case, alerts for both bureaus, toggle global offline/online, ledger shows no external call, reports page, model card (if present).
3. `scripts/reset_demo.py`: reseed (and optionally retrain), run the backfill, print the demo steps. `README.md`: setup (uv, Docker, env), run commands (API, web, worker), demo accounts, how to reset, honest limits (synthetic data; Splink only planned).
4. `docs/reports/FINAL.md`: a table of every task with status (DONE/PARTIAL/BLOCKED/NOT STARTED), the demo walkthrough results, known issues, and "what the human must check in the morning" (the union of all `## Human checks`).
