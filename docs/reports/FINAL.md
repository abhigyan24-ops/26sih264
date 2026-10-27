# CaseNexus Stage 7–10 handover

Original feature implementations are merged to main. The latest feature gate passed **108 backend tests**, TypeScript checking and the production build. Live API smoke checks passed. Full browser interaction/visual QA remains pending after the browser helper timeout, so T70 integration is PARTIAL for those checks.

The user explicitly selected **Finish the original scope**. Newly added Round 2 B80–B89/F90–F92 tasks are outside this session’s scope; their independent lanes/state are preserved.

## Original task status

| Task | Status |
|---|---|
| T01 Recon, baseline and pre-wiring | DONE |
| T10 Coordination API | DONE |
| T11 Coordination UI | DONE |
| T20 Alerts API and screen | DONE |
| T30 SLA risk service and scan | DONE |
| T31 SLA worker, risk badge | DONE |
| T40 Reports API | DONE |
| T41 Reports page | DONE |
| T50 Privacy mode backend (router, egress, policy) | DONE |
| T51 Privacy mode UI | DONE |
| T60 Evaluation backend (metrics, tuning, shadow, promote, model card) | DONE |
| T61 Model card and evaluation UI | DONE |
| R1 Cross-review of coordination, alerts and SLA | DONE |
| R2 Cross-review of reports, privacy and evaluation | DONE |
| T70 Integration, demo reset and README | PARTIAL (browser checks pending) |

## Verified results

- Fresh isolated aicte_l4 schema, synthetic seed, resolver tuning, model training and backfill completed. Scoped reset helper ran successfully and rejects a mismatched database before changes. Reset restores global policy offline.
- API login for admin/rb1/pgrc1 and dashboard passed. Newly created RB/PGRC demo cases produced High overlap at 0.904; RB lead link set the new PGRC hold, wrote both timeline actions and both bureau alerts. Existing seed cases’ holds were preserved. Hard negative produced zero High overlaps.
- Online provider is a local stub with no HTTP dispatch. A sensitive registration added zero online ledger rows; final policy was offline. Ledger rollback isolation is tested.
- Reports JSON and authenticated XLSX/PDF exports pass scoped totals/date validation tests. XLSX rows match JSON for management and regional roles; PDF starts with %PDF. Reports UI has four charts/tables and date/download controls; visual checks remain.
- Evaluation reuses training’s institution holdout and excludes unlabelled live cases. Synthetic PR-AUC 0.9366 vs cosine baseline 0.6749. High precision 0.9375, High recall 0.4167, Medium recall 1.0 on this held-out synthetic set. These are not real-world accuracy claims.
- SLA replay threshold 0.666667 meets a 10% false-warning target (observed 0.08046), but mean warning lead time falls by 1.5 days vs the default. The tradeoff is recorded in T60.
- Shadow training left ACTIVE unchanged. Promotion/rollback tests keep exactly one active model, enforce a unique index, write audit records and atomically replace ACTIVE after DB commit. Retry can repair a pointer after a filesystem publication failure.
- Final live smoke: all listed routes returned 200, including model-card (10 registry rows) and evaluation/models (4 versions); DB active-model count was exactly one.

## Evidence

```text
T61 coordinator gate:
108 passed, 760 warnings in 96.78s (0:01:36)
TypeScript: passed
Production build: 2641 modules transformed; built in 1.28s
```

```text
{"route": "health", "status": 200, "items": null}
{"route": "dashboard", "status": 200, "items": null}
{"route": "overlaps?limit=1", "status": 200, "items": 1}
{"route": "alerts/unread-count", "status": 200, "items": null}
{"route": "policy/status", "status": 200, "items": null}
{"route": "reports/bureau-wise", "status": 200, "items": 6}
{"route": "reports/ageing", "status": 200, "items": 5}
{"route": "reports/trend?period=month", "status": 200, "items": 14}
{"route": "evaluation/models", "status": 200, "items": 4}
{"route": "evaluation/shadow-disagreements", "status": 200, "items": null}
{"route": "model-card", "status": 200, "items": 10}
{"active_models": 1, "active_pointer": "overlap-20261027-124853"}
```

## Run and reset

L4 development servers: API http://127.0.0.1:8300, web http://localhost:5473. L4 uses aicte_l4 inside the existing shared Postgres container. The untracked Vite override in frontend/node_modules proxies to API8300. Default/L1 Vite uses API8000. Keep backend/.env untracked.

Reset from repository root with the backend virtualenv Python: `python scripts/reset_demo.py --database aicte_l4 --retrain`. The configured database must match exactly. On Windows the interpreter is `backend\.venv\Scripts\python.exe`. Set HF_HUB_OFFLINE=1 to use cached weights without network metadata checks. See README for normal setup/run commands.

## Known limits

- Browser helper timed out while accepting the T51 online confirmation; further browser mutations stopped. An automatic approval review initially rejected that UI switch due possible egress. Source inspection proved the provider is a local stub, and API tests verify routing, but the browser interaction itself is not claimed verified.
- Shadow comparison covers active-flagged pairs observed by the existing scan hook. The endpoint states this coverage; it cannot estimate missed unflagged candidates.
- Database commit and filesystem replacement are separate resources; a pointer publication error is surfaced and needs retry.
- Synthetic data only. Splink remains planned. Existing NumPy/joblib/scipy deprecation warnings and a large frontend bundle warning remain. No deployment performed.
- R1/R2 were completed by other lanes before T60/T61 merged; those newer components have automated regression checks but no independent cross-review in those reports.

## What the human must check

### T01
Visual review of Admin tab slots and navigation. Empty tabs are intentional contracts for later tasks.

### T10
UI link/dismiss flow after T11.

### T11
Link and dismiss through the browser, inspect link timeline on both cases, keyboard navigation and responsive layout. Browser helper failed during T51 confirmation and blocked for over two hours; further browser input was stopped, so no UI mutation is claimed verified. T10 API tests cover transaction behavior and live demo.

### T20
- Verify the header bell badge live count updates when alerts are created.
- Verify kind filter dropdown in Alerts screen.

### T30
- Case detail risk badge display after T31.

### T31
- Open a case on Case detail page and observe the `CaseRiskBadge` updating with calculated breach risk or deadline-only status.

### T40
Visual PDF layout and spreadsheet formatting in desktop viewers.

### T41
- Open `/reports` in browser, verify all 4 charts and tables render properly.
- Apply date filter and verify queries refresh.
- Click "Download Excel" and "Download PDF" buttons and verify the generated files open properly.

### T50
Visual mode toggle, indicator and ledger paging after T51.

### T51
Complete online/offline confirmation and case-registration browser flow; verify responsive header layout, non-admin read-only behavior, and ledger paging. Browser helper timed out; do not treat the UI mutation as verified.

### T60
Review synthetic false positives/negatives, calibration and SLA tradeoff before promoting. Exercise model promotion/rollback in Admin after T61. Model DB and pointer cannot be one cross-resource transaction: filesystem failure returns 503; retry current version repairs the pointer.

### T61
Verify model selection, confirmation dialogs, successful promote/rollback, error recovery, mobile tables and read-only management UI. Browser helper timed out during earlier T51; no later browser mutations attempted. Backend promotion/rollback and role checks passed in T60.

### T70
Full seven-minute browser walkthrough; all task Human checks aggregated in FINAL.md. Review responsive layouts, decision dialogs, policy confirmation/rollback, downloads and non-admin views. Automatic approval review initially rejected UI online confirmation due potential external egress; inspected source proves local stub, but subsequent browser helper timed out.

The early T01 placeholder notes are superseded by T51/T61 implementations; visually check the completed tabs rather than expecting empty slots.
