# CaseNexus verified integration status

All MUST and SHOULD feature implementations are completed, verified through gates, and merged to `main`. Cross-reviews R1 and R2 are complete and verified. Evaluation backend (T60) is currently claimed and active.

| Task | Priority | State | Description |
|---|---|---|---|
| T01 | MUST | DONE | Recon, baseline and pre-wiring |
| T10 | MUST | DONE | Coordination API |
| T11 | MUST | DONE | Coordination UI |
| T20 | MUST | DONE | Alerts API and screen |
| T30 | SHOULD | DONE | SLA risk service and scan |
| T31 | SHOULD | DONE | SLA worker, risk badge |
| T40 | SHOULD | DONE | Reports API |
| T41 | SHOULD | DONE | Reports page |
| T50 | MUST | DONE | Privacy mode backend (router, egress, policy) |
| T51 | MUST | DONE | Privacy mode UI |
| T60 | NICE | CLAIMED | Evaluation backend (metrics, tuning, shadow, promote, model card) [L4/CX] |
| T61 | NICE | WAITING | Model card and evaluation UI (unblocked once T60 merges) |
| R1 | SHOULD | DONE | Cross-review of coordination, alerts and SLA |
| R2 | NICE | DONE | Cross-review of reports, privacy and evaluation |
| T70 | MUST | DONE | Integration, demo reset and README |

---

## Demo Results & Verification
- **Authentication & Dashboard:** Login for all roles (`admin`, `rb1`, `pgrc1`, `ro_north`), live KPIs, regional and bureau-filtered views.
- **Coordination & Overlap Reviews:** Level-ranked overlap suggestions, breakdown bars with confidence indicators, atomic link decisions with lead nomination, parallel case holds (`hold_parallel=true`), timeline actions on both cases, and scoped dual alerts.
- **Alerts Subsystem:** Header notification bell with live polling (15s), read/unread counters, kind filtering (`overlap_high`, `overlap_medium`, `sla_risk`, `sla_breach`, `escalation`, `system`).
- **SLA Engine & Background Worker:** Empirical survival breach risk calculations with deadline-only fallbacks, dynamic thresholds (`get_param`), daily alert deduplication, scheduled 15-minute background scanning worker (`app.worker`), and Case detail `CaseRiskBadge`.
- **Grievance Analytics & Reports:** Full reports screen (`/reports`) featuring 4 interactive Recharts charts (Bureau distribution, Ageing cohorts, Intake vs Disposal trend, Overlap severity), detailed summary tables, date-range filtering, and authenticated binary exports for Excel (`bureau.xlsx`) and PDF (`bureau.pdf`).
- **Privacy & Mode Control:** ModeBar with live status polling (10s), fail-closed local routing, PII redaction (email/phone), independent session transactional egress ledger, and Admin Privacy tab.
- **Test Integrity:** Full backend test suite passing with 103/103 tests green; TypeScript and production Vite build passing with 0 errors.

---

## Human checks

### T11 (Coordination UI)
- Open `/overlaps`, review suggested overlap cards, verify probability breakdown bar.
- Perform a "Link" action: nominate lead bureau, toggle parallel hold, verify updates on case detail timeline.
- Perform a "Dismiss" action: verify fixed-list dropdown options with required notes for `other`.

### T20 (Alerts UI)
- Verify header bell badge count reflects unread alerts.
- Open `/alerts`, filter by kind, click "Mark All Read".

### T31 (SLA Worker & Badge)
- Open any case on `/cases/:id`: observe `CaseRiskBadge` displaying breach probability and sample size (or fallback deadline indicator).

### T41 (Reports Page)
- Open `/reports`: verify all 4 charts (Bureau distribution, Ageing cohorts, Monthly trend, Overlap severity) and their data tables.
- Test date-range filter with Start/End dates.
- Click "Download Excel" and "Download PDF", verifying the downloaded files open cleanly.

### T51 (Privacy Mode)
- In Admin `/admin`, open Privacy tab.
- Observe policy settings and paginated egress audit ledger.
