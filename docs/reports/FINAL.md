# CaseNexus Stage 7–10 & Round 2 Handover

All original feature implementations (Stages 7–10, T01 to T70, reviews R1 and R2) are merged to `main`.
Additionally, Round 2 priority tasks **F90 (Frontend Redesign)** and **B80 (Data Import Adapter)** are completed, verified, and merged.

The latest gate passed **114 backend tests**, TypeScript compilation (`tsc -b`), and the production build (`vite build` in 3.5s).

---

## Task Status

### Round 1: Stages 7–10 & Integration

| Task | Description | Status |
|---|---|---|
| **T01** | Recon, baseline and pre-wiring | **DONE** |
| **T10** | Coordination API (atomic link/dismiss, lead bureau, hold) | **DONE** |
| **T11** | Coordination UI (decision dialog, overlap review) | **DONE** |
| **T20** | Alerts API and screen (real-time notification, unread bell) | **DONE** |
| **T30** | SLA risk service and scan (dynamic risk calculation) | **DONE** |
| **T31** | SLA worker & case risk badge (background job, UI badge) | **DONE** |
| **T40** | Reports API (scoped aggregates, Excel & PDF exports) | **DONE** |
| **T41** | Reports page (4 Recharts visualisations, data tables, download controls) | **DONE** |
| **T50** | Privacy mode backend (air-gap router, egress ledger, policy) | **DONE** |
| **T51** | Privacy mode UI (ModeBar, policy controls, ledger inspector) | **DONE** |
| **T60** | Evaluation backend (metrics, tuning, shadow, promote, model card) | **DONE** |
| **T61** | Model card and evaluation UI (telemetry diagnostics, active switch) | **DONE** |
| **R1** | Cross-review of coordination, alerts and SLA | **DONE** |
| **R2** | Cross-review of reports, privacy and evaluation | **DONE** |
| **T70** | Integration, demo reset and README | **DONE** |

### Round 2: Post-Round 1 Hardening & Adapters

| Task | Description | Status |
|---|---|---|
| **F90** | Frontend redesign: Quiet Government Dashboard (high-contrast, dense, 4-6px radii) | **DONE** |
| **B80** | Data import adapter: CSV/XLSX column mapping, resolution holding, dry run, overlap scan | **DONE** |
| **B81** | Case status machine and workflow actions (transfer, escalate, audit trail) | **OPEN** (Next) |
| **B82** | Admin management & SLA rule editing | **OPEN** |
| **B83** | Sensitive flag, edit rescan, retrain trigger | **OPEN** |
| **B84** | Email channel through router | **OPEN** |
| **B85** | Audit log API | **OPEN** |
| **B86** | Security hardening (prototype level, honest) | **OPEN** |
| **B87** | Packaging | **OPEN** |
| **B88** | Performance and indexes | **OPEN** |
| **B89** | Test and CI pass | **WAIT** (Depends on B80-B88) |
| **F91** | Frontend states and polish pass | **OPEN** |
| **F92** | Frontend: new screens for round-2 backend (workflow dialogs, sensitivity lock) | **WAIT** (Depends on B80, B81, F90) |

---

## Verified Results & Capabilities

### 1. Quiet Government Dashboard Aesthetic (F90)
- Eradicated generic AI glassmorphism, glowing shadows, and oversized radii.
- Established dense neutral palette: `#090d16` canvas, `#0e1526` solid panels, `#1e293b` crisp borders, `#2563eb` primary actions, and tabular monospace numerals.
- Overlap Card redesigned as an analyst console with side-by-side comparison (Anchor vs Candidate), word-level diff highlights, and a large 6-foot projector-readable statistical confidence meter (`94%`).
- Unified layout with functional navigation groups: Operations, Analytics, Administration.

### 2. Batch Data Ingestion Adapter (B80)
- Migration 070: Added `source` and `source_case_id` to `cases` with partial unique index enforcing batch idempotency.
- Ingestion engine supports both CSV and XLSX with automatic delimiter sniffing.
- Data-driven column mapping persists per source (`rb`, `pgrc`, `regional`).
- Institution resolution holds ambiguous or low-confidence institutions into `import_held_rows` for manual review (no blind guessing).
- Safe Dry-Run mode validates and previews without modifying the database.
- Live ingestion computes `fastembed` vectors, registers cases, and executes immediate cross-bureau overlap scans.
- Verified on sample datasets (`sample_rb.csv`, `sample_pgrc.csv`, `sample_regional.csv`), successfully detecting cross-bureau overlaps across RB, PGRC, and Regional offices for identical underlying issues.

### 3. Test Evidence

```text
Backend Test Suite:
$ uv run pytest -q
........................................................................ [ 63%]
..........................................                               [100%]
114 passed, 644 warnings in 106.89s (0:01:46)

Frontend Production Build:
$ npm run build
> tsc -b && vite build
✓ 2643 modules transformed.
dist/index.html                   0.47 kB │ gzip:   0.30 kB
dist/assets/index-DFXKFrFK.css   40.10 kB │ gzip:   7.48 kB
dist/assets/index-3cLjWVos.js   937.29 kB │ gzip: 266.87 kB
✓ built in 3.50s
```

### 4. Ingestion Verification Run (`scripts.verify_ingestion`)

```text
>>> Importing Source: RB from sample_rb.csv -> 3 imported, 1 new overlap flagged
>>> Importing Source: PGRC from sample_pgrc.csv -> 3 imported, 2 new overlaps flagged
>>> Importing Source: REGIONAL from sample_regional.csv -> 2 imported, 3 new overlaps flagged

Cross-Bureau Overlaps Flagged:
  Overlap #3499 [HIGH - 84%]: Case CASE-000740 (RB) <-> Case CASE-000746 (ROC-N) [Hostel Ragging]
  Overlap #3497 [HIGH - 86%]: Case CASE-000740 (RB) <-> Case CASE-000743 (PGRC)  [Hostel Ragging]
  Overlap #3501 [HIGH - 80%]: Case CASE-000741 (RB) <-> Case CASE-000747 (ROC-N) [Excess Fee]
```

---

## How to Run & Demo

1. **Start Services:**
   - Database: Docker Postgres container running on port 5432 (or port 5433 for isolated lane).
   - Backend:
     ```bash
     cd backend
     uv run uvicorn app.main:app --reload
     ```
   - Frontend:
     ```bash
     cd frontend
     npm run dev
     ```
   - Access web UI at `http://localhost:5173`.
2. **Demo Accounts:**
   - `admin` / `demo123` (Administrator, full system & policy access)
   - `rb1` / `demo123` (Regulation Bureau Officer)
   - `pgrc1` / `demo123` (Public Grievance Redressal Cell Officer)
   - `south1` / `demo123` (Southern Regional Officer, scoped to South region)
   - `mgmt1` / `demo123` (Management Executive, cross-bureau oversight)
3. **Key Demonstration Flows:**
   - **Data Ingestion:** Navigate to `/import`, upload `data/samples/sample_rb.csv`, review column mapping, run dry-run preview, execute live ingestion.
   - **Cross-Bureau Overlap Detection:** Navigate to `/overlaps`, inspect high-confidence overlap links with side-by-side text comparisons and feature contribution bars.
   - **Coordinated Action:** Click "Link Cases" to assign a lead bureau, hold redundant candidate cases, and record audit actions.
   - **Reports & Analytics:** Navigate to `/reports` to view live Recharts and download Excel/PDF reports.
   - **Statutory Administration:** Navigate to `/admin` to inspect Privacy Boundary Controls, Model Calibration Telemetry, and Model Cards.

---

## Human Checks & Known Limits

- **Synthetic Seed Data:** All complaint data is synthetic. Planted test pairs evaluate cross-bureau detection accuracy.
- **Air-Gapped Privacy Mode:** Local provider runs without outbound internet calls. Online mode requires configured LLM API keys.
- **File Upload Limits:** Supported batch formats are CSV and XLSX up to 10 MB. Corrupted rows are held in an error log without interrupting valid rows.
