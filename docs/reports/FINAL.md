# CaseNexus verified integration status

MUST feature implementations are merged. API integration passed in disposable aicte_l4. Browser walkthrough remains unverified after the browser helper timed out. T70 is PARTIAL for those checks; remaining SHOULD/NICE tasks are listed below.

| Task | Status |
|---|---|
| T01 Recon, baseline and pre-wiring | DONE |
| T10 Coordination API | DONE |
| T11 Coordination UI | DONE |
| T20 Alerts API and screen | DONE |
| T30 SLA risk service and scan | DONE |
| T31 SLA worker, risk badge | NOT STARTED |
| T40 Reports API | NOT STARTED |
| T41 Reports page | NOT STARTED |
| T50 Privacy mode backend (router, egress, policy) | DONE |
| T51 Privacy mode UI | DONE |
| T60 Evaluation backend (metrics, tuning, shadow, promote, model card) | NOT STARTED |
| T61 Model card and evaluation UI | NOT STARTED |
| R1 Cross-review of coordination, alerts and SLA | NOT STARTED |
| R2 Cross-review of reports, privacy and evaluation | NOT STARTED |
| T70 Integration, demo reset and README | PARTIAL |

## Demo results

Login/dashboard, new RB registration, High overlap, RB lead link, PGRC hold, two timeline actions, two bureau alerts, hard negative, offline/online local stub and sensitive-case isolation: PASS through HTTP/SQL. Report API xlsx/pdf: 200. Model card: 404 pending evaluation. Reports screen: placeholder pending T41. Browser interactions beyond login/dashboard/header: NOT RUN. See T70.md for literal output.

## Known issues

Synthetic metrics do not establish real-world accuracy. Browser helper timed out; full visual/interaction QA remains. Existing large frontend bundle warning. Splink planned. Reset helper requires schema bootstrap and its exact local database argument. Default demo policy is offline.

## What the human must check in the morning

### T01
Visual review of Admin tab slots and navigation. Empty tabs are intentional contracts for later tasks.

### T10
UI link/dismiss flow after T11.

### T11
Link and dismiss through the browser, inspect link timeline on both cases, keyboard navigation and responsive layout. Browser helper failed during T51 confirmation and blocked for over two hours; further browser input was stopped, so no UI mutation is claimed verified. T10 API tests cover transaction behavior and live demo.

### T20
- Verify the header bell badge live count updates when alerts are created.
- Verify kind filter dropdown in Alerts screen.

### T50
Visual mode toggle, indicator and ledger paging after T51.

### T51
Complete online/offline confirmation and case-registration browser flow; verify responsive header layout, non-admin read-only behavior, and ledger paging. Browser helper timed out; do not treat the UI mutation as verified.

### T70
Full seven-minute browser walkthrough; all task Human checks aggregated in FINAL.md. Review responsive layouts, decision dialogs, policy confirmation/rollback, downloads and non-admin views. Automatic approval review initially rejected UI online confirmation due potential external egress; inspected source proves local stub, but subsequent browser helper timed out.
