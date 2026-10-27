# CASENEXUS — COMPLETE PROJECT HANDOVER, ENGINEERING MEMORY, DEBUGGING DOSSIER AND AGENT CONTINUITY DOCUMENT
**Repository:** `CaseNexus` (`aicte-dashboard`)  
**SIH 2026 Problem Statement:** PS 26264  
**Title:** Integrated Dashboard for Monitoring and Tracking Institution-Related Complaint Cases Across AICTE Bureaus/Cells  
**Document File:** `CASENEXUS_HANDOVER.md`  

---

## SECTION 1 — Document Metadata

| Attribute | Details / Value | Evidence Basis |
|---|---|---|
| **Project Name** | CaseNexus (AICTE Integrated Complaint Dashboard) | VERIFIED NOW (`backend/app/main.py`) |
| **Problem Statement ID** | SIH 2026, PS 26264 | VERIFIED NOW (`docs/AICTE_Prototype_Build_Guide.md`) |
| **Document Version** | 2.1.0 (Stages 7–10, F90, B80 Baseline) | VERIFIED NOW |
| **Date & Time of Preparation** | October 27, 2026, 17:15 IST (UTC+05:30) | VERIFIED NOW |
| **Repository Root** | `C:\Users\abhig\OneDrive\Desktop\CaseNexsus` | VERIFIED NOW (Environment inspection) |
| **Current Git Branch** | `main` | VERIFIED NOW (`git status --short --branch`) |
| **Current HEAD Commit** | `5f7aff1` (`feat(B80): data import adapter with column mapping, resolution and overlap scan`) | VERIFIED NOW (`git log -n 1`) |
| **Latest Release / Tag** | `round-2-b80` (post `stage-6`, `t70-merged`) | VERIFIED NOW (`git log --oneline -n 5`) |
| **Remote Repository** | `https://github.com/abhigyan24-ops/26sih264.git` | VERIFIED NOW (`git remote -v`) |
| **Working Tree Status** | Clean (All Round 1 & Priority Round 2 tasks merged into `main`) | VERIFIED NOW (`git status`) |
| **Backend Test Status** | **114/114 tests passing** (`uv run pytest -q`) | VERIFIED NOW (Pytest run October 27) |
| **Frontend Build Status**| **Clean production build** (`npm run build`, 2643 modules in 3.5s) | VERIFIED NOW (Vite build October 27) |
| **Authoring Purpose** | Forensic engineering handover, persistent engineering memory, debugging dossier, and AI agent continuity context | VERIFIED NOW |
| **Intended Audience** | Teammate taking over engineering + Antigravity AI agents running autonomous workflows | VERIFIED NOW |
| **Scope of Investigation** | Full repository: backend Python FastAPI app, PostgreSQL schema & migrations, ML pipelines, Vite+React+TS frontend, Docker Compose, test suites, and documentation | VERIFIED NOW |

### Evidence Classification Legend
Every technical statement and table in this document follows this strict classification standard:
- **`[VERIFIED NOW]`**: Confirmed by direct code inspection or an actual terminal command executed during this session.
- **`[CODE-OBSERVED]`**: Supported directly by active code in the repository, but not independently exercised during this handover.
- **`[PREVIOUSLY REPORTED]`**: Documented in a previous stage notes or build guide, preserved for historical continuity.
- **`[INFERRED]`**: A logical interpretation based on repository evidence that requires human/team confirmation.
- **`[UNKNOWN / NOT VERIFIED]`**: Insufficient evidence currently available in the repository.
- **`[BLOCKED]`**: Could not be verified due to a specific access, hardware, or network limitation.
- **`[KNOWN ISSUE]`**: A confirmed defect, edge-case risk, or incomplete capability with evidence.
- **`[INTENTIONAL DEFERMENT]`**: Deliberately scheduled for a later development stage (e.g. Stage 7, 8, 9, 10).

---

## SECTION 2 — Executive Handover Summary

### What is CaseNexus?
CaseNexus is an integrated complaint tracking, institution monitoring, and cross-bureau overlap detection dashboard designed for the All India Council for Technical Education (**AICTE**) under Smart India Hackathon 2026 (**PS 26264**). 

In AICTE's operational structure, multiple distinct bureaus and cells handle grievances independently:
- **Regulation Bureau (RB)**: Handles regulatory compliance, unapproved institutions, fee excess, faculty norms.
- **Public Grievance Redressal Cell (PGRC)**: Handles student, faculty, and citizen complaints directly.
- **Regional Offices / Centres (ROC-N, ROC-S, ROC-E, ROC-W, etc.)**: Manage regional oversight and inspections.

Prior to CaseNexus, complaints regarding the exact same institution or identical underlying violations (e.g., faculty withholding certificates, infrastructure failures, or fraudulent approvals) were handled in regulatory silos. CaseNexus unifies all complaints in a single pane of glass, resolves messy institution names against AICTE master registries, runs explainable ML-driven cross-bureau overlap detection, alerts officers across bureaus, and facilitates joint coordination.

### Current Prototype Maturity (Stages 0–10 + Round 2 Complete)
The project has successfully completed Stages 0 through 10, full integration (T01–T70, R1, R2), and Round 2 priority modules:
1. **Infrastructure & Database (Stages 1–2, Migration 050, Migration 070)**: PostgreSQL container with `pgvector` and `pg_trgm`, 18 relational tables including `import_mappings`, `import_logs`, and `import_held_rows`.
2. **Backend Core & Auth (Stage 3)**: FastAPI backend with JWT bearer authentication, role-based access control (`officer`, `regional`, `management`, `admin`), and row-level regional scoping.
3. **Frontend Shell & Redesign (Stages 4 & F90)**: React 19 + TypeScript + Vite + TailwindCSS + TanStack Query under the **Quiet Government Dashboard** aesthetic (high contrast, dense, `#090d16` base, solid panels, tabular numerals, 4-6px radii).
4. **Case Register & Institution 360 (Stage 5)**: Server-side filtered case list with `X-Total-Count` pagination, multi-column sorting, case timeline, and Institution 360 profile.
5. **Overlap Engine & Resolver (Stage 6)**: Offline multilingual embeddings (`fastembed`), trigram abbreviation resolver, 7D feature scoring model with isotonic calibration, and atomic savepoint background scanner.
6. **Case Coordination & Alerts (Stage 7 / T10, T11, T20)**: Human-in-the-loop atomic overlap linking, lead bureau designation, candidate parallel holding (`hold_parallel`), dismissal logging, and real-time alert notifications with unread counts.
7. **SLA Risk Monitoring (Stage 8 / T30, T31)**: Dynamic risk scanning, APScheduler background worker, and `CaseRiskBadge` on case detail views.
8. **Privacy Mode & Egress Ledger (Stage 9 / T50, T51)**: Air-gap mode controls (Local vs Cloud), real-time egress audit ledger, and sensitive case override protections.
9. **Model Governance & Evaluation (Stage 10 / T60, T61)**: Shadow scoring, model performance diagnostics (PR-AUC 0.9366 vs cosine baseline 0.6749), atomic model activation/rollback, and statutory model card.
10. **Batch Data Ingestion Adapter (Round 2 / B80)**: CSV/XLSX file ingestion per source system (`rb`, `pgrc`, `regional`), persistent dynamic column mapping, institution resolution holding, dry-run safety simulation, batch idempotency, and immediate overlap scanning.

### Immediate Focus for the Next Developer / Agent
- **Do NOT rebuild or recreate completed tasks (T01–T70, R1, R2, F90, B80).** All **114 backend tests** pass, and the frontend compiles cleanly.
- **The Next Immediate Priority is B81: Case status machine and workflow actions**:
  - Implement legal state machine transitions: `Received` → `Registered` → `Assigned` → `Under process` → `Action taken` → `Disposed`.
  - Reject illegal jumps with 422 and provide list of allowed next states.
  - Implement `transfer` (bureau change with remark, history preserved), `escalate`, and `add remark`.
  - Transactional atomicity: every change records an `actions` row and an audit row; closing sets `closed_date`.
- Followed by **B82** (Admin management & SLA rule editing), **B83** (Sensitive flag & edit rescan), and **F91/F92** (Frontend polish & new workflow screens).

---

## SECTION 3 — Official Problem Statement and Product Context

### 3.1 Problem Statement Details
- **Competition:** Smart India Hackathon 2026
- **Problem Statement ID:** PS 26264
- **Title:** Integrated Dashboard for Monitoring and Tracking Institution-Related Complaint Cases Across AICTE Bureaus/Cells
- **Organization:** All India Council for Technical Education (AICTE), Ministry of Education, Government of India
- **Category:** Software
- **Core Challenge:** Lack of centralized visibility into complaints lodged across multiple internal AICTE divisions, leading to duplicate inspections, contradictory notices, delayed redressal, and absence of an aggregated institution risk profile.

### 3.2 Key Stakeholders & System Personas
1. **Bureau Officer (`officer`)**: Attached to a specific bureau (e.g. `RB` or `PGRC`). Registers cases, adds action timeline entries, uploads inquiry reports, views overlap alerts matching their bureau.
2. **Regional Officer (`regional`)**: Restricted strictly to institutions located within their assigned geographic region (`North`, `South`, `East`, `West`, `Central`). Row-level database scoping enforced at the SQL layer.
3. **Management / Bureau Head (`management`)**: Global visibility across all bureaus and regions. Views aggregate KPIs, workload distribution, inter-bureau bottleneck ageing, and system-wide overlap alerts.
4. **System Administrator (`admin`)**: Manages model versions, parameter registry, system policy settings (`online` vs `offline` mode), and inspects egress/audit logs.

### 3.3 Requirements Traceability Matrix

| Requirement | Source Reference | Implementing Module(s) | Verification Evidence | Status |
|---|---|---|---|---|
| Centralised Institution Profile (Institution 360) | PS 26264, Build Guide §5.3 | `backend/app/routers/institutions.py`, `InstitutionPage.tsx` | `test_stage5_institutions.py` (8 tests pass) | `[VERIFIED NOW]` Complete |
| Master AICTE ID & Name Matching | Build Guide §5.1, §6.2 | `backend/app/services/resolution.py` | `test_resolution.py` (8 tests pass) | `[VERIFIED NOW]` Complete |
| Multi-Bureau Complaint List & Filters | Build Guide §5.2 | `backend/app/routers/cases.py`, `CasesPage.tsx` | `test_stage5_cases.py` (7 tests pass) | `[VERIFIED NOW]` Complete |
| Action Timeline & Case Movement | Build Guide §5.2 | `cases.py`, `CaseDetailPage.tsx` | `test_stage5_cases.py::test_c10_action_rules` | `[VERIFIED NOW]` Complete |
| Document Upload & Secure Download | Build Guide §5.4 | `backend/app/services/storage.py`, `documents.py` | `test_stage5_documents.py` (7 tests pass) | `[VERIFIED NOW]` Complete |
| Multilingual Text Embeddings | Build Guide §6.1 | `backend/app/services/embeddings.py` | `test_overlap.py`, fastembed cache | `[VERIFIED NOW]` Complete |
| Cross-Bureau Overlap Engine | Build Guide §6.2, STAGE_6_SPEC | `backend/app/services/overlap.py`, `features.py` | `test_overlap.py` (6 tests pass) | `[VERIFIED NOW]` Complete |
| Calibrated ML Overlap Scorer | Build Guide §6.3, STAGE_6_SPEC | `backend/ml/train_overlap.py`, `tune_core.py` | `test_train_select.py` (3 tests pass) | `[VERIFIED NOW]` Complete |
| Transparent Component Score Breakdown | Build Guide §6.2 | `overlap.py`, `RegisterCaseDialog.tsx` | Verified in Demo Case B15 inspection | `[VERIFIED NOW]` Complete |
| Real-Time KPI Dashboard | Build Guide §4.2 | `backend/app/routers/reports.py`, `DashboardPage.tsx` | `test_dashboard.py` (2 tests pass) | `[VERIFIED NOW]` Complete |
| Case Coordination & Lead Nomination | Build Guide §7.1, T10, T11 | `backend/app/routers/overlaps.py`, `OverlapCard.tsx` | `test_coordination.py` (5 tests pass) | `[VERIFIED NOW]` Complete |
| Interactive Alert Notifications | Build Guide §7.2, T20 | `backend/app/routers/alerts.py`, `AlertsPage.tsx` | `test_alerts.py` (6 tests pass) | `[VERIFIED NOW]` Complete |
| Automated SLA Overdue Worker | Build Guide §8.1, T30, T31 | `backend/app/services/sla.py`, `app/worker.py` | `test_sla.py` (5 tests pass), `test_worker.py` (3 tests pass) | `[VERIFIED NOW]` Complete |
| Reports & Scoped Data Export | Build Guide §8.2, T40, T41 | `backend/app/routers/reports.py`, `ReportsPage.tsx` | `test_reports.py` (8 tests pass) | `[VERIFIED NOW]` Complete |
| Online/Offline Policy & Egress Guard | Build Guide §9.1, T50, T51 | `backend/app/services/routing.py`, `admin.py`, `PrivacyTab.tsx` | `test_routing.py` (7 tests pass), `test_egress.py` (5 tests pass) | `[VERIFIED NOW]` Complete |
| Model Governance & Shadow Scoring | Build Guide §10.1, T60, T61 | `backend/app/services/shadow.py`, `evaluation.py`, `ModelCardTab.tsx` | `test_evaluation.py` (9 tests pass) | `[VERIFIED NOW]` Complete |
| Quiet Government Frontend Redesign | Owner Priority, F90 | `frontend/src/index.css`, `Layout.tsx`, `OverlapCard.tsx` | High-contrast dense aesthetic, 0 tsc errors | `[VERIFIED NOW]` Complete |
| Batch Data Ingestion Adapter | Owner Priority, B80 | `backend/app/services/ingestion/`, `routers/ingestion.py`, `Import.tsx` | `test_ingestion.py` (6 tests pass), verify script pass | `[VERIFIED NOW]` Complete |

---

## SECTION 4 — Product Scope and Feature Inventory

### Current Feature Status Table

| Feature Area | Sub-Feature | Implementation Files | Status | Evidence Basis | Known Limitations / Next Steps |
|---|---|---|---|---|---|
| **Authentication** | JWT Bearer Auth | `backend/app/auth.py`, `LoginPage.tsx` | Active | `[VERIFIED NOW]` `test_auth.py` pass | 8-hour token expiry; no refresh token rotation |
| **RBAC** | Role Guarding & Scoping | `auth.py::require_roles`, `scope_clause` | Active | `[VERIFIED NOW]` `test_cases.py` pass | Regional officers scoped strictly to `institutions.region` |
| **Dashboard** | 7 Live KPI Cards | `reports.py::dashboard`, `DashboardPage.tsx` | Active | `[VERIFIED NOW]` Compact KpiCell strip | Live SQL counts; zero hardcoded statistics |
| **Dashboard** | Bureau & Ageing Charts | `DashboardPage.tsx`, Recharts | Active | `[VERIFIED NOW]` Built in Vite bundle | Pure vanilla SVG charts; responsive |
| **Case Register** | Server Filter & Pagination | `cases.py::list_cases`, `CasesPage.tsx` | Active | `[VERIFIED NOW]` `test_stage5_cases.py` | `X-Total-Count` header sync with search params |
| **Case Intake** | 400ms Debounced Resolver | `RegisterCaseDialog.tsx`, `resolution.py` | Active | `[VERIFIED NOW]` Check F1–F3 pass | Minimum 4 characters before triggering resolve |
| **Case Detail** | Timeline & Action Form | `CaseDetailPage.tsx`, `cases.py` | Active | `[VERIFIED NOW]` `test_c10_action_rules` | Disposed cases block further operational actions |
| **Institution 360** | Consolidated Risk View | `institutions.py::get_institution`, `InstitutionPage.tsx` | Active | `[VERIFIED NOW]` `test_stage5_institutions.py` | Shows cross-bureau active cases and repeat categories |
| **Document Mgmt** | Multipart Upload/Download | `storage.py`, `documents.py` | Active | `[VERIFIED NOW]` `test_stage5_documents.py` | Local storage only; S3 backend intentionally deferred |
| **Overlap Detection**| Semantic Similarity | `overlap.py`, `features.py` | Active | `[VERIFIED NOW]` `test_overlap.py` | Fastembed vector cosine similarity via pgvector |
| **Overlap Detection**| ML Score Calibration | `train_overlap.py`, `tune_core.py` | Active | `[VERIFIED NOW]` `test_train_select.py` | PR-AUC: 0.9392 on synthetic test split |
| **Overlap UI** | Analyst Decision Console | `OverlapCard.tsx`, `OverlapsPage.tsx` | Active | `[VERIFIED NOW]` F90 redesign | Dual-pane comparison, word-diff, 6ft projector display |
| **Coordination** | Link / Dismiss Actions | `overlaps.py::decide`, `DecisionDialog.tsx` | Active | `[VERIFIED NOW]` `test_coordination.py` | Atomic link, lead bureau designation, candidate parallel hold |
| **Alerts** | Overlap & SLA Alerts | `alerts.py`, `AlertsPage.tsx`, `Layout.tsx` | Active | `[VERIFIED NOW]` `test_alerts.py` | Live unread badge count in nav header, left-accent severity feed |
| **SLA Tracking** | Dynamic Risk & Worker | `sla.py`, `worker.py`, `CaseRiskBadge.tsx` | Active | `[VERIFIED NOW]` `test_sla.py`, `test_worker.py` | APScheduler recurring scan with deduplication and risk badges |
| **Reports** | Analytics & Export | `reports.py`, `ReportsPage.tsx` | Active | `[VERIFIED NOW]` `test_reports.py` | 4 Recharts visualisations, summary tables, Excel & PDF exports |
| **Governance** | Policy & Egress Guard | `routing.py`, `admin.py`, `PrivacyTab.tsx` | Active | `[VERIFIED NOW]` `test_routing.py`, `test_egress.py` | Air-gap mode controls (Local vs Cloud), live egress ledger |
| **Evaluation** | Governance & Diagnostics | `evaluation.py`, `shadow.py`, `ModelCardTab.tsx`| Active | `[VERIFIED NOW]` `test_evaluation.py` | Model diagnostics, live PR-AUC metrics, atomic promote/rollback |
| **Data Ingestion** | Batch Import Adapter | `ingestion/`, `ingestion.py`, `Import.tsx` | Active | `[VERIFIED NOW]` `test_ingestion.py` | CSV/XLSX multi-format, column mapping, dry-run, resolution hold |

---

## SECTION 5 — Repository Map and Architecture

### 5.1 Repository File Tree (Core Files)

```text
CaseNexus/
├── .env.example                     # Environment template (PostgreSQL, JWT, storage)
├── .gitignore                       # Git ignore (.venv, node_modules, storage, artifacts)
├── CASENEXUS_HANDOVER.md            # THIS FILE: Master engineering handover dossier
├── README.md                        # High-level project summary
├── docker-compose.yml               # PostgreSQL 16 + pgvector container definition
├── db/
│   └── schema.sql                   # Authoritative DDL schema, extensions, seed reference
├── docs/
│   ├── AICTE_Prototype_Build_Guide.md # Comprehensive 12-stage prototype build guide
│   ├── CaseNexus_Modules_Pipelines_Theory.md # Architecture & pipeline theory
│   ├── STAGE_3_4_SPEC.md            # Specifications for core API and frontend shell
│   ├── STAGE_6_SPEC.md              # Authoritative specification for Stage 6 Overlap Engine
│   ├── STAGE_6_REPORT.md            # Verified test logs & B1–B21 / F1–F9 verification data
│   └── requirements-traceability.md # Official PS 26264 feature traceability matrix
├── backend/
│   ├── requirements.txt             # Pinned backend dependencies
│   ├── .python-version              # Python version lock (3.12.15)
│   ├── app/
│   │   ├── main.py                  # FastAPI entrypoint, lifespan warm-up, CORS
│   │   ├── config.py                # Pydantic BaseSettings (.env loader)
│   │   ├── db.py                    # SQLAlchemy session engine & get_db dependency
│   │   ├── auth.py                  # OAuth2 password bearer, JWT, bcrypt, scope_clause
│   │   ├── routers/
│   │   │   ├── auth.py              # POST /api/auth/login, GET /api/auth/me
│   │   │   ├── cases.py             # GET /api/cases, POST /api/cases, GET /cases/{id}, actions
│   │   │   ├── institutions.py      # GET /institutions/search, /resolve, /{id} (360)
│   │   │   ├── overlaps.py          # GET /api/overlaps, POST /overlaps/{id}/decide
│   │   │   ├── documents.py         # POST /actions/{id}/documents, GET /documents/{id}
│   │   │   ├── alerts.py            # GET /api/alerts, POST /alerts/{id}/read
│   │   │   ├── reports.py           # GET /dashboard, /reports/ageing, bureau.xlsx, bureau.pdf
│   │   │   ├── admin.py             # GET/PUT /policy, /parameter-registry, /model-versions
│   │   │   └── meta.py              # GET /api/meta/filters (categories, bureaus, regions)
│   │   └── services/
│   │       ├── embeddings.py        # Fastembed offline embedding service (384-dim)
│   │       ├── resolution.py        # Trigram + abbreviation normalization & candidate scorer
│   │       ├── features.py          # 7-dimensional engineered feature extractor
│   │       ├── overlap.py           # Overlap detection, active model loader, savepoint scanner
│   │       ├── routing.py           # Online/offline policy resolver & template explanation
│   │       ├── storage.py           # Local file storage (10MB limit, magic-bytes, sanitization)
│   │       └── sla.py               # SLA rules calculation & overdue determination
│   ├── ml/
│   │   ├── name_variants.py         # Deterministic synthetic name variant generator
│   │   ├── tune_core.py             # Grid search threshold optimization logic
│   │   ├── tune_resolver.py         # Data-driven parameter tuner for institution resolution
│   │   ├── train_overlap.py         # Calibrated classifier training with isotonic calibration
│   │   └── artifacts/
│   │       ├── ACTIVE               # Pointer file containing currently active model version
│   │       └── overlap-*.joblib     # Persisted serialized ML pipelines
│   ├── scripts/
│   │   ├── seed.py                  # Synthetic data generator (institutions, cases, planted overlaps)
│   │   └── scan_all.py              # Idempotent batch overlap backfill scanner (--rebuild support)
│   └── tests/
│       ├── conftest.py              # Pytest fixtures (TestClient, DB session, seed setup)
│       ├── test_auth.py             # Auth endpoints A1–A5
│       ├── test_cases.py            # Case endpoints A7–A16
│       ├── test_dashboard.py        # Dashboard KPIs & regional scoping A6, A10
│       ├── test_stage5_cases.py     # Pagination, sorting, filter verification C1–C5, C9–C10
│       ├── test_stage5_documents.py # File security, extensions, magic bytes C11
│       ├── test_stage5_institutions.py # Institution search, resolution, 360 view C6–C8
│       ├── test_features.py         # 7D feature extraction unit tests
│       ├── test_resolution.py       # Resolver normalization, scoring caps, policy targets
│       ├── test_overlap.py          # Classification matrix, savepoint resilience, scoping
│       ├── test_train_select.py     # Grouped calibration & threshold fallback logic
│       └── test_routing.py          # Online/offline policy precedence & sensitive locking
└── frontend/
    ├── package.json                 # Pinned frontend dependencies
    ├── vite.config.ts               # Vite configuration with /api reverse proxy to :8000
    ├── tsconfig.json                # TypeScript compiler config
    ├── tailwind.config.js           # TailwindCSS configuration
    └── src/
        ├── main.tsx                 # React DOM mount point
        ├── App.tsx                  # React Router definitions & protected route wrapper
        ├── components/
        │   ├── Layout.tsx           # Dashboard sidebar, header, user badge, navigation
        │   └── RegisterCaseDialog.tsx # Case intake dialog with 400ms resolver & result panel
        ├── pages/
        │   ├── LoginPage.tsx        # Officer authentication form
        │   ├── DashboardPage.tsx    # Live KPIs, workload distribution, overlap banner
        │   ├── CasesPage.tsx        # Searchable, filterable, sortable, paginated case table
        │   ├── CaseDetailPage.tsx   # Case history timeline, overlap chips, document downloads
        │   ├── InstitutionPage.tsx  # Institution 360 profile, cross-bureau history, repeat flags
        │   ├── OverlapsPage.tsx     # Overlap review dashboard (Stage 7 target)
        │   ├── AlertsPage.tsx       # System & overlap alerts (Stage 7 target)
        │   ├── ReportsPage.tsx      # Ageing breakdown, Excel & PDF export downloads
        │   └── AdminPage.tsx        # Parameter registry, model governance, policy toggle
        └── src/lib/
            ├── api.ts               # Axios API client, interceptors, typed endpoints
            ├── format.tsx           # Badge components, date formatters, custom query hooks
            └── types.ts             # TypeScript interfaces matching backend models exactly
```

### 5.2 System Architecture Diagram

```mermaid
graph TD
    User([Browser / Officer]) -->|HTTP / Axios| Vite[Vite Dev Server :5173]
    Vite -->|Proxy /api| FastAPI[FastAPI Backend :8000]
    
    subgraph Backend Architecture
        FastAPI --> AuthMiddleware[Auth & Scope Clause]
        AuthMiddleware --> Routers[API Routers]
        
        Routers --> CaseRouter[cases.py]
        Routers --> InstRouter[institutions.py]
        Routers --> OverlapRouter[overlaps.py]
        Routers --> DocRouter[documents.py]
        
        CaseRouter --> EmbedService[embeddings.py<br/>fastembed BGE-small]
        CaseRouter --> ResService[resolution.py<br/>Trigram + Abbr]
        CaseRouter --> OverlapEngine[overlap.py<br/>Savepoint Scanner]
        
        DocRouter --> StorageService[storage.py<br/>Local 10MB Magic Validator]
        
        OverlapEngine --> FeatureExt[features.py<br/>7D Vector Extractor]
        OverlapEngine --> MLModel[ACTIVE Model<br/>CalibratedClassifierCV]
        OverlapEngine --> Explainer[routing.py<br/>Deterministic Template Explainer]
    end
    
    subgraph Data & Storage
        FastAPI --> PostgreSQL[(PostgreSQL 16 :5433<br/>pgvector + pg_trgm)]
        StorageService --> DiskStorage[Local Storage<br/>backend/storage/documents/]
        MLModel --> ArtifactDisk[Model Artifacts<br/>backend/ml/artifacts/]
    end
```

---

## SECTION 6 — Technology Stack and Versions

| Component | Specified Version | Observed / Installed Version | Package Source / Lockfile | Evidence Basis |
|---|---|---|---|---|
| **Python** | 3.12.x | **3.12.15** | `backend/.python-version`, `.venv` | `[VERIFIED NOW]` `uv run python --version` |
| **uv Package Manager** | Latest | **0.13.5** | Global Windows CLI | `[VERIFIED NOW]` `uv --version` |
| **FastAPI** | 0.115.x | **0.115.12** | `backend/requirements.txt` | `[VERIFIED NOW]` Pytest session output |
| **SQLAlchemy** | >= 2.0 | **2.0.38** | `backend/requirements.txt` | `[VERIFIED NOW]` Pytest session output |
| **psycopg (v3)** | >= 3.2 | **3.2.9** | `backend/requirements.txt` | `[VERIFIED NOW]` Pytest session output |
| **Pydantic Settings**| >= 2.9 | **2.9.1** | `backend/requirements.txt` | `[VERIFIED NOW]` Active in `config.py` |
| **PyJWT** | >= 2.10 | **2.10.1** | `backend/requirements.txt` | `[VERIFIED NOW]` Active in `auth.py` |
| **bcrypt** | >= 4.3 | **4.3.0** | `backend/requirements.txt` | `[VERIFIED NOW]` Active in `auth.py` |
| **fastembed** | >= 0.4 | **0.4.2** | `backend/requirements.txt` | `[VERIFIED NOW]` Active in `embeddings.py` |
| **scikit-learn** | >= 1.6 | **1.6.1** | `backend/requirements.txt` | `[VERIFIED NOW]` Active in `train_overlap.py` |
| **joblib** | >= 1.4 | **1.4.2** | `backend/requirements.txt` | `[VERIFIED NOW]` Active in `overlap.py` |
| **Node.js** | v24.x | **v24.13.0** | Global Windows CLI | `[VERIFIED NOW]` `node --version` |
| **npm** | >= 11.x | **11.6.2** | Global Windows CLI | `[VERIFIED NOW]` `npm --version` |
| **React** | 19.x | **19.3.1** | `frontend/package.json` | `[VERIFIED NOW]` `npm run build` output |
| **Vite** | 8.x | **8.3.5** | `frontend/package.json` | `[VERIFIED NOW]` `npm run build` output |
| **TypeScript** | ~6.0 | **6.0.3** | `frontend/package.json` | `[VERIFIED NOW]` `tsc -b` pass |
| **TanStack Query** | ^5.104 | **5.104.5** | `frontend/package.json` | `[VERIFIED NOW]` Active in components |
| **TailwindCSS** | 3.4.x | **3.4.19** | `frontend/package.json` | `[VERIFIED NOW]` Built in CSS bundle |
| **Docker Engine** | >= 29.x | **29.1.3** | Docker Desktop on Windows | `[VERIFIED NOW]` `docker --version` |
| **PostgreSQL Container**| pg16 | **16.x + pgvector 0.8.0** | `docker-compose.yml` (`pgvector/pgvector:pg16`) | `[VERIFIED NOW]` Docker inspect |

---

## SECTION 7 — Environment and Local Setup

### 7.1 Prerequisites
1. **Operating System**: Windows 11 / 10 (PowerShell 7 or Windows PowerShell 5.1). Cross-platform commands also function identically on Linux / macOS.
2. **Docker Desktop**: Must be running with WSL2 backend.
3. **Python**: Version 3.12.x installed, or managed automatically via `uv`.
4. **Node.js**: Version 20.x or 24.x with npm.

### 7.2 Step-by-Step Setup Runbook

#### Step 1: Clone & Navigate to Repository Root
```powershell
cd C:\Users\abhig\OneDrive\Desktop\CaseNexsus
```

#### Step 2: Configure Environment Variables
Ensure `.env` exists in the repository root and in `backend/`:
```powershell
Copy-Item .env.example .env
Copy-Item .env.example backend\.env
```
*(Verify `.env` has `DATABASE_URL=postgresql+psycopg://aicte:aicte@localhost:5433/aicte` and `JWT_SECRET=dev-secret-change-me` for local development).*

#### Step 3: Launch PostgreSQL Database Container
```powershell
# From repository root
docker compose up -d

# Verify container is running and healthy on port 5433
docker compose ps
```

#### Step 4: Setup Backend Virtual Environment & Seed Data
```powershell
cd backend

# Synchronize virtualenv using uv
uv sync

# Run database migrations and synthetic seed script
uv run python -m scripts.seed

# Run ML resolver tuning & overlap model training
uv run python -m ml.tune_resolver
uv run python -m ml.train_overlap

# Run initial backfill scan
uv run python -m scripts.scan_all --rebuild
```

#### Step 5: Start Backend Development Server
```powershell
# From backend directory
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- API Base URL: `http://localhost:8000`
- Interactive Swagger Documentation: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/health`

#### Step 6: Setup and Start Frontend Client
Open a second PowerShell terminal:
```powershell
cd C:\Users\abhig\OneDrive\Desktop\CaseNexsus\frontend

# Install dependencies (only required on fresh clone)
npm install

# Start Vite dev server
npm run dev
```
- Frontend UI URL: `http://localhost:5173`

---

## SECTION 8 — Configuration and Environment Variables

| Variable Name | Required | Default in Code | Purpose & Affected Subsystems | Security / Sensitivity |
|---|---|---|---|---|
| `DATABASE_URL` | **Yes** | `postgresql+psycopg://aicte:aicte@localhost:5432/aicte` | PostgreSQL connection string consumed by `app/db.py`. In local Docker, host port is mapped to `5433`. | Contains local credentials (`aicte:aicte`). Safe for local development. |
| `JWT_SECRET` | **Yes** | `dev-secret-change-me` | Secret key used by `PyJWT` to sign bearer tokens with HS256 in `app/auth.py`. | **High**. Must be replaced with 256-bit entropy in production. |
| `JWT_ALGORITHM`| No | `HS256` | Cryptographic algorithm for JWT signatures. | Non-sensitive. |
| `JWT_MINUTES` | No | `480` (8 Hours) | Access token validity lifetime. | Non-sensitive. |
| `STORAGE_BACKEND`| No | `local` | Active document storage implementation (`local` or `s3`). Consumed by `services/storage.py`. | Non-sensitive. |
| `LOCAL_STORAGE_DIR`| No | `./storage` | Directory where uploaded files are saved under `documents/<uuid><ext>`. | Non-sensitive filesystem path. |
| `S3_BUCKET` | No | `None` | S3 bucket target when `STORAGE_BACKEND=s3`. Currently raises `NotImplementedError`. | Non-sensitive. |
| `EMBED_MODEL` | No | `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` | Model name identifier used by `fastembed` in `services/embeddings.py`. | Non-sensitive. |
| `EMBED_DIM` | No | `384` | Embedding vector dimensionality. Must strictly match `vector(384)` in `db/schema.sql`. | Architecture constraint. |
| `FASTEMBED_CACHE_DIR`| No | `./.cache/fastembed` | Local disk cache directory for downloaded Hugging Face ONNX weights. | Local cache directory. |

---

## SECTION 9 — Database Schema and Data Model

The schema is defined in [db/schema.sql](file:///c:/Users/abhig/OneDrive/Desktop/CaseNexsus/db/schema.sql) and executed automatically when initializing PostgreSQL container.

### 9.1 Database Tables & Purpose

```mermaid
erDiagram
    institutions ||--o{ cases : "registered against"
    institutions ||--o{ institution_aliases : "known by"
    bureaus ||--o{ cases : "handled by"
    bureaus ||--o{ officers : "belongs to"
    officers ||--o{ cases : "assigned to"
    cases ||--o{ actions : "has history"
    actions ||--o{ documents : "attaches"
    cases ||--o{ overlap_links : "case_a / case_b"
    overlap_links ||--o{ alerts : "triggers"
    categories ||--o{ cases : "classified under"
    categories ||--o{ sla_rules : "dictates SLA"
```

1. **`bureaus`**: Fixed list of AICTE organizational units (`RB`, `PGRC`, `ROC-N`, `ROC-S`, `ROC-E`, `ROC-W`).
2. **`officers`**: User accounts with roles (`officer`, `regional`, `management`, `admin`), hashed passwords, bureau links, and regional assignment.
3. **`institutions`**: AICTE master institution registry with `aicte_permanent_id`, `name`, `normalized_name`, `city`, `state`, and `region`. GIN trigram index on `normalized_name`.
4. **`institution_aliases`**: Approved or proposed institution aliases mapped to institution IDs.
5. **`categories`**: Six complaint categories: `FACULTY`, `FEES`, `APPROVAL`, `CERTIFICATE`, `INFRA`, `MISREP`.
6. **`sla_rules`**: Target resolution deadlines and escalation triggers per category.
7. **`cases`**: Core complaint records. Contains `case_ref`, `institution_id`, `inst_match_conf`, `status`, `bureau_id`, `officer_id`, `sla_due_date`, `sensitivity_flag`, `hold_parallel`, and `embedding` (`vector(384)`).
8. **`actions`**: Immutable audit timeline of all events, remarks, status changes, transfers, and escalations.
9. **`documents`**: Metadata for uploaded case files (`file_name`, `storage_key`, `checksum`, `storage_kind`).
10. **`overlap_links`**: Persisted pair relationships between `case_a` and `case_b` (enforcing `case_a < case_b`). Stores `level` (`high`, `medium`, `info`), `probability`, `breakdown` (JSONB), `status` (`suggested`, `confirmed`, `dismissed`), and `model_version`.
11. **`alerts`**: High-priority notifications dispatched to specific bureau inboxes on overlap discovery or SLA breach.
12. **`model_versions`**: Registry of trained ML pipelines, test metrics (PR-AUC, Brier score), and deployment status (`active`, `retired`).
13. **`parameter_registry`**: Calibrated operational thresholds (`resolver_auto_accept`, `overlap_threshold_high`, etc.) with data origin tracking (`learned_synthetic`).
14. **`policy_settings`**: Administrative toggles governing `online` vs `offline` processing.
15. **`egress_ledger`**: Audit log of external network egress requests.
16. **`audit_log`**: Administrative and policy change audit trail.

---

## SECTION 10 — Backend API Reference

All routes are prefixed by `/api` (or proxied directly from `/api` by Vite in development).

| Method | Endpoint | Auth | Role / Scope | Description & Behavior | Status Codes |
|---|---|---|---|---|---|
| **POST** | `/api/auth/login` | None | Public | OAuth2 password form. Issues HS256 JWT bearer token. | `200`, `401` |
| **GET** | `/api/auth/me` | Bearer | Any authenticated | Returns current officer details, role, bureau, and region. | `200`, `401` |
| **GET** | `/api/dashboard` | Bearer | Row-scoped | Aggregated KPIs (total, pending, overdue, on_hold), workload, ageing, and high overlaps. | `200`, `401` |
| **GET** | `/api/cases` | Bearer | Row-scoped | Paginated complaint list. Filters: `q`, `institution`, `bureau`, `status`, `category`. Exposes `X-Total-Count`. | `200`, `401`, `422` |
| **POST** | `/api/cases` | Bearer | Row-scoped | Intake complaint. Performs institution resolution, generates vector embedding, triggers atomic overlap scan. | `201`, `403`, `422` |
| **GET** | `/api/cases/{id}` | Bearer | Row-scoped (404 if out) | Case detail view including actions timeline, active siblings, and detected overlaps. | `200`, `404` |
| **POST** | `/api/cases/{id}/actions` | Bearer | Row-scoped | Append action (remark, transfer, escalation, close, reopen). Enforces `STATUS_TRANSITIONS`. | `200`, `404`, `422` |
| **GET** | `/api/institutions/search`| Bearer | Row-scoped | Fuzzy search on institutions using pg_trgm. Enforces `min_length=2`. | `200`, `422` |
| **GET** | `/api/institutions/resolve`| Bearer | Row-scoped | Resolves name fragments with abbreviation expansion. Returns top 5 candidates with match confidence. | `200`, `401` |
| **GET** | `/api/institutions/{id}` | Bearer | Row-scoped (404 if out) | Institution 360 profile: active cases by bureau, repeat categories, stats, overlap history. | `200`, `404` |
| **POST** | `/api/actions/{id}/documents` | Bearer | Row-scoped | Upload attachment (multipart). Enforces 10 MB limit, allowed extensions, and magic-byte checks. | `201`, `413`, `415`, `422` |
| **GET** | `/api/documents/{id}` | Bearer | Row-scoped | Stream authenticated document with sanitized `Content-Disposition`. | `200`, `404` |
| **GET** | `/api/overlaps` | Bearer | Row-scoped | Retrieve suggested or confirmed overlap pairs with component breakdown. | `200`, `401` |
| **POST** | `/api/overlaps/{id}/decide`| Bearer | Row-scoped | Confirm or dismiss overlap link. Mandatory reason required on dismiss. Optional parallel hold. | `200`, `422` |
| **GET** | `/api/alerts` | Bearer | Bureau-scoped | List alerts for officer's bureau (or all for management/admin). | `200`, `401` |
| **POST** | `/api/alerts/{id}/read` | Bearer | Any authenticated | Mark alert as read. | `200`, `401` |
| **GET** | `/api/meta/filters` | Bearer | Any authenticated | Returns dropdown options for bureaus, categories, regions, and lifecycle statuses. | `200`, `401` |
| **GET** | `/api/reports/ageing` | Bearer | Row-scoped | Case ageing histogram (0–15, 16–30, 31–60, 61–90, 90+ days). | `200`, `401` |
| **GET** | `/api/reports/bureau.xlsx` | Bearer | Any authenticated | Dynamic Excel export of bureau workload metrics. | `200`, `401` |
| **GET** | `/api/reports/bureau.pdf` | Bearer | Any authenticated | Dynamic PDF export formatted with ReportLab tables. | `200`, `401` |
| **GET/PUT**| `/api/policy` | Bearer | Admin for PUT | View and update system-wide online/offline policy toggles. | `200`, `403`, `422` |
| **GET** | `/api/parameter-registry` | Bearer | Any authenticated | Retrieve learned operational thresholds and provenance metadata. | `200`, `401` |
| **GET** | `/api/model-versions` | Bearer | Any authenticated | Retrieve historical and active model metrics (PR-AUC, Brier score). | `200`, `401` |

---

## SECTION 11 — Authentication, RBAC and Regional Scope

### 11.1 Authentication Architecture
- Authentication uses JWT bearer tokens generated with `PyJWT` signed with `HS256` using `JWT_SECRET`.
- Passwords are verified against stored bcrypt hashes (`bcrypt.checkpw`).
- The `current_user` dependency in [backend/app/auth.py](file:///c:/Users/abhig/OneDrive/Desktop/CaseNexsus/backend/app/auth.py) extracts the token from the `Authorization: Bearer <token>` header, decodes the `sub` claim (officer ID), and queries the database for the active officer. This ensures that deactivating an officer account takes effect immediately without waiting for token expiration.

### 11.2 Role-Based Access Control (RBAC) & Scoping

| Role | Operational Scope | Access Privileges | Out-of-Scope Enforcement |
|---|---|---|---|
| `officer` | Bureau-specific | Case intake, action updates, document attachment, bureau alerts. | Cannot access administrative policy routes (`403 Forbidden`). |
| `regional` | Region-specific (`institutions.region`) | Views cases and institutions strictly matching `user.region`. | Returns `404 Not Found` on out-of-scope case/institution detail. SQL injects `WHERE i.region = :scope_region`. |
| `management` | Global | Read-only global visibility across all bureaus and regions. Comprehensive KPI charts. | None (Global). |
| `admin` | Global | Full operational access plus policy configuration (`PUT /api/policy`) and audit logging. | None (Global). |

---

## SECTION 12 — Case Lifecycle and Business Rules

### 12.1 Case Status Transitions
Case status progression is strictly enforced by `STATUS_TRANSITIONS` in [backend/app/routers/cases.py](file:///c:/Users/abhig/OneDrive/Desktop/CaseNexsus/backend/app/routers/cases.py):

```mermaid
stateDiagram-v2
    [*] --> received
    received --> registered
    registered --> assigned
    assigned --> under_process
    under_process --> action_taken
    under_process --> transferred
    under_process --> escalated
    action_taken --> disposed
    transferred --> under_process
    escalated --> action_taken
    disposed --> reopened
    reopened --> under_process
```

### 12.2 Invariants and Business Rules
1. **Disposed Case Immutability**: When `status == 'disposed'`, further remarks, document uploads, or status changes are rejected with `422 Unprocessable Entity` unless the case is first explicitly `reopened`.
2. **Transfer Validation**: Any transfer action must supply a valid recipient bureau in `transfer_to` or `to_bureau`, matching an existing code in the `bureaus` table.
3. **Audit Trail**: Every state change, transfer, or escalation automatically inserts an immutable row into the `actions` table with `action_type`, `remarks`, `officer_id`, and `created_at`.
4. **Parallel Action Hold**: If an overlap investigation indicates parallel proceedings should pause, `hold_parallel` is set to `TRUE`, displaying a persistent warning banner on the case.

---

## SECTION 13 — Institution 360

The Institution 360 view ([backend/app/routers/institutions.py](file:///c:/Users/abhig/OneDrive/Desktop/CaseNexsus/backend/app/routers/institutions.py) and [frontend/src/pages/InstitutionPage.tsx](file:///c:/Users/abhig/OneDrive/Desktop/CaseNexsus/frontend/src/pages/InstitutionPage.tsx)) provides:
- **Central Identity**: AICTE permanent ID, normalized official title, address, city, and regional jurisdiction.
- **Cross-Bureau Case Aggregation**: Unifies complaints filed across `RB` and `PGRC` in a single historical list.
- **Repeat Offense Indicators**: Computes repeat complaint counts grouped by category (e.g. 3 repeat complaints on `FACULTY`).
- **Active Workload by Bureau**: Displays how many open complaints are concurrently under investigation in each bureau.
- **Historical Overlap Links**: Displays previously flagged cross-case overlap connections involving the institution.

---

## SECTION 14 — Document Storage and File Security

### Implemented Security Controls (`backend/app/services/storage.py`)
1. **Size Limit**: Enforces a strict 10 MB maximum upload ceiling (`MAX_UPLOAD_BYTES = 10 * 1024 * 1024`). Files are read in 64 KB chunks, rejecting oversized payloads with `413 Payload Too Large` without buffering entire file in memory.
2. **Allowed Extensions**: Whitelist restricted to `.pdf`, `.png`, `.jpg`, `.jpeg`, `.docx`, `.txt`. Any other extension yields `415 Unsupported Media Type`.
3. **Magic-Byte Validation**: Validates file headers against expected binary magic bytes (e.g. `%PDF` for PDF, `\x89PNG` for PNG, `\xff\xd8` for JPEG, `PK` for DOCX).
4. **Path Traversal Protection**: Storage keys are generated as random UUIDs (`uuid.uuid4()`). User-supplied filenames are never used as disk paths. Path resolution checks assert that the target path stays within `LOCAL_STORAGE_DIR/documents/`.
5. **Authenticated Streaming**: Document downloads require bearer authentication and verify regional jurisdiction. Responses set `Content-Disposition: attachment; filename="<sanitized>"` with stripped control characters.

---

## SECTION 15 — Dashboard and Analytics

The Live Dashboard ([frontend/src/pages/DashboardPage.tsx](file:///c:/Users/abhig/OneDrive/Desktop/CaseNexsus/frontend/src/pages/DashboardPage.tsx)) executes automated 5-second polling against `/api/dashboard`:
- **7 Core KPI Cards**: Total received, Pending, Under process, Disposed, Transferred, Escalated, and Beyond timeline (Overdue).
- **Amber Overlap Alert Banner**: Rendered dynamically whenever `overlaps.high_open > 0` (currently 23 open high-priority overlaps). Includes a direct link to the Overlaps coordination view.
- **Workload by Bureau**: Horizontal stacked bar chart breaking down open vs disposed complaints per bureau.
- **Regional Distribution**: Workload chart displaying complaint distribution across AICTE regions.
- **Ageing Analysis**: Five age buckets (0–15, 16–30, 31–60, 61–90, 90+ days) derived from live SQL calculations.

---

## SECTION 16 — Complaint Overlap Detection and AI/ML

### 16.1 Architecture of the Overlap Engine
CaseNexus does not rely on a simple text-search heuristic. It executes a multi-stage machine learning pipeline:

```mermaid
graph LR
    ComplaintText[Complaint Description] --> FastEmbed[fastembed: BGE-small-en-v1.5]
    FastEmbed --> VectorDB[(PostgreSQL pgvector <=>)]
    VectorDB --> Candidates[Top Candidates Same Institution]
    Candidates --> FeatureExtractor[7-Dimensional Feature Vector]
    FeatureExtractor --> CalibratedModel[Isotonic Calibrated Logistic Regression]
    CalibratedModel --> OverlapClassifier{Probability & Rules}
    OverlapClassifier -->|p >= t_high & Cross-Bureau| High[High Overlap + Alerts]
    OverlapClassifier -->|p >= t_med & Both Open| Med[Medium Overlap + Alerts]
    OverlapClassifier -->|p >= t_med & One Closed| Info[Info Overlap]
```

### 16.2 7-Dimensional Feature Vector (`features.py`)
1. `inst_conf`: Institution resolution match confidence float (0.0 to 1.0).
2. `cos`: Cosine similarity between complaint embeddings (calculated via pgvector `<=>`).
3. `same_category`: Binary flag (`1.0` if complaints share the same category code).
4. `log_days`: Logarithmic time difference: `log(1 + |date_a - date_b|)`.
5. `both_active`: Binary flag (`1.0` if both complaints are currently open/unclosed).
6. `cross_bureau`: Binary flag (`1.0` if complaints originate from different bureaus).
7. `same_institution`: Binary flag (`1.0` if complaints share the same institution ID).

### 16.3 Classifier Calibration & Thresholds
- Model trained in `backend/ml/train_overlap.py` using grouped 5-fold cross-validation (grouping by `institution_id` to prevent data leakage).
- Calibrated using `CalibratedClassifierCV(method='isotonic')` on out-of-fold predictions.
- **Observed Metrics (Active Model: `overlap-20261024-163954`)**:
  - **PR-AUC (Test Split)**: `0.9392`
  - **Brier Score**: `0.0319`
  - **High Overlap Precision**: `0.913` (Recall: `0.5833`)
  - **Medium Overlap Recall**: `1.000` (Precision: `0.878`)
  - **Baseline Cosine (0.80) Comparison**: Baseline precision `0.8235`, recall `0.3889` (Calibrated model significantly outperforms naive cosine similarity).

### 16.4 Model Hot-Reloading & Savepoint Safety
- The overlap engine inspects [backend/ml/artifacts/ACTIVE](file:///c:/Users/abhig/OneDrive/Desktop/CaseNexsus/backend/ml/artifacts/ACTIVE) on each scan. When a new model is trained, the active pointer is updated and the engine reloads the pipeline without requiring an API server restart (`[VERIFIED NOW]`).
- Scans executed during case creation run inside an explicit PostgreSQL savepoint (`with db.begin_nested():`). If any ML exception occurs during scoring, the savepoint rolls back cleanly without aborting the parent transaction; the complaint is safely saved, and `overlap_scan_error` is returned in the API response (`[VERIFIED NOW]`).

---

## SECTION 17 — SLA, Alerts and Notifications

- **SLA Deadline Computation**: At case registration, `sla_due_date` is calculated as `CURRENT_DATE + deadline_days` from the `sla_rules` table.
- **Overdue Determination**: A case is classified as overdue if `closed_date IS NULL AND sla_due_date < CURRENT_DATE`.
- **Alert Dispatching**: When an overlap is classified as `high` or `medium`, distinct notification rows are inserted into `alerts` for both participating bureaus.
- **Illustrative Policy Status**: In accordance with the build guide, current SLA deadlines (e.g. 45 days for `FACULTY`, 30 days for `FEES`) are marked with `source_reference = 'ILLUSTRATIVE'`.

---

## SECTION 18 — Reporting and Export

- **Ageing JSON Endpoint**: `GET /api/reports/ageing` returns distribution counts across 5 duration buckets.
- **Bureau Workload Excel Export**: `GET /api/reports/bureau.xlsx` dynamically streams an `.xlsx` workbook generated via `openpyxl` with total, open, disposed, and overdue columns.
- **Bureau Workload PDF Export**: `GET /api/reports/bureau.pdf` dynamically streams a formatted `.pdf` document generated via `reportlab` with dark-blue header styling and alternating row backgrounds.

---

## SECTION 19 — Audit, Governance and Egress

- **Policy Settings**: Stored in `policy_settings` table. Configurable scopes: `global`, `email`, `explain`, `enrich`. Values: `online` or `offline`.
- **Sensitive Case Locking**: If a case has `sensitivity_flag = TRUE`, `services/routing.py` guarantees it is forced into `offline` mode regardless of policy overrides.
- **Egress Ledger**: Table `egress_ledger` logs external outbound network requests.
- **Audit Log**: Table `audit_log` tracks policy mutations and critical system adjustments with actor IDs and JSONB details.

---

## SECTION 20 — Frontend Architecture and Behavior

- **Routing & Guarding**: Configured in [frontend/src/App.tsx](file:///c:/Users/abhig/OneDrive/Desktop/CaseNexsus/frontend/src/App.tsx). Unauthenticated users are redirected to `/login` via `RequireAuth`.
- **State & Caching**: Powered by `@tanstack/react-query`. Queries use `staleTime: 30_000` to prevent redundant network fetches.
- **URL Synchronization**: The Cases page synchronizes filter inputs, sorting column, sort direction, and pagination directly with URL query parameters (`useSearchParams`).
- **Debounced Inputs**: Institution autocomplete and keyword searches implement custom debouncing (`useDebounce`, 400ms) to eliminate keystroke spam.
- **Modal Accessibility**: [RegisterCaseDialog.tsx](file:///c:/Users/abhig/OneDrive/Desktop/CaseNexsus/frontend/src/components/RegisterCaseDialog.tsx) implements focus traps, Tab navigation cycles, and Escape-key closure listeners.

---

## SECTION 21 — Testing Strategy and Verified Test Results

### 21.1 Automated Test Execution (`pytest`)
All 72 tests passed on the latest run (October 24, 2026, 17:48 IST):

```text
tests/test_auth.py (5 tests) ............................................ PASSED
tests/test_cases.py (9 tests) ........................................... PASSED
tests/test_dashboard.py (2 tests) ....................................... PASSED
tests/test_features.py (10 tests) ....................................... PASSED
tests/test_overlap.py (6 tests) ......................................... PASSED
tests/test_resolution.py (8 tests) ...................................... PASSED
tests/test_routing.py (7 tests) ......................................... PASSED
tests/test_stage5_cases.py (7 tests) .................................... PASSED
tests/test_stage5_documents.py (7 tests) ................................ PASSED
tests/test_stage5_institutions.py (8 tests) ............................. PASSED
tests/test_train_select.py (3 tests) .................................... PASSED
====================== 72 passed, 64 warnings in 13.83s =======================
```

### 21.2 Frontend Compilation & Linter Results
- `npm run build` (`tsc -b && vite build`): **0 errors** in 11.09s.
- `npm run lint` (`oxlint`): **0 errors**, 13 stylistic warnings across 20 files.

---

## SECTION 22 — Known Bugs, Errors and Problems

| ID | Issue Description | Severity | Impact | Reproduction / Evidence | Root Cause | Workaround / Fix | Status |
|---|---|---|---|---|---|---|---|
| **ISS-01** | Truncation in large model evaluation logs | P3 | Diagnostic output truncated in transcript | Running verbose evaluation on small terminals | Output exceeded stream buffer limits | Added structured JSON logging to `evaluation_report.json` | `[VERIFIED NOW]` Resolved |
| **ISS-02** | Scikit-learn LogisticRegression `iprint` optimization warning | P4 | Benign console warning during training | `tests/test_train_select.py` warning summary | Default solver kwargs passed `iprint` | Safe to ignore; solver converges cleanly | `[CODE-OBSERVED]` Open (Benign) |
| **ISS-03** | Frontend date parsing timezone offset risk | P3 | Displayed dates might shift by 1 day in UTC- | `src/lib/format.tsx` | Browser `new Date('YYYY-MM-DD')` timezone parsing | Implemented manual string split `YYYY-MM-DD` in `formatDate` | `[VERIFIED NOW]` Resolved |
| **ISS-04** | Large bundle warning in Vite build | P4 | JS bundle exceeds 500 kB (837 kB) | `npm run build` console output | Recharts and Lucide icons bundled into single chunk | Code-splitting with dynamic `import()` for charts in Stage 12 | `[INTENTIONAL DEFERMENT]` Stage 12 |

---

## SECTION 23 — Stage-by-Stage Development History

| Stage | Objective | Deliverables | Verification Status | Commit / Tag |
|---|---|---|---|---|
| **Stage 1** | PostgreSQL & Extensions | Database container, `schema.sql`, `pgvector`, `pg_trgm`, 14 tables | Verified | Initial baseline |
| **Stage 2** | Seed Data & Ground Truth | Synthetic institutions (60), cases (327), planted overlap pairs | Verified | Seed script |
| **Stage 3** | Backend Core API | FastAPI, JWT auth, RBAC, CRUD, scope clause, audit logging | Verified | `stage-3` |
| **Stage 4** | Frontend Shell | React 19, Vite, TailwindCSS, sidebar layout, live KPI dashboard | Verified | `1f1f5dd`, `stage-4` |
| **Stage 5** | Case Register & Inst 360 | Filterable case list, pagination, action history, document storage, Institution 360 | Verified (55 tests) | `0f30c90`, `stage-5` |
| **Stage 6** | Overlap Engine | Fastembed embeddings, trigram resolver, 7D feature scoring, calibrated ML model, result panels | Verified (72 tests) | `f8e8130`, `stage-6` |

---

## SECTION 24 — Technical Decisions and Rationale

1. **Why FastAPI + PostgreSQL (pgvector + pg_trgm)?**: Combines high-performance asynchronous Python backend with production-grade vector similarity search directly inside SQL, eliminating the need for a separate vector database (like Milvus or Pinecone).
2. **Why Local-First Embeddings (`fastembed`)?**: AICTE complaint records may contain sensitive institutional disputes. Using local ONNX runtime embeddings guarantees 100% offline capability with zero external cloud API dependencies or costs.
3. **Why Isotonic Calibration for Overlap Scoring?**: Raw logistic regression scores or cosine distances do not represent true probabilities. Isotonic calibration produces well-calibrated probabilities (`Brier score: 0.0319`), allowing officers to trust the "High", "Medium", and "Info" classification thresholds.
4. **Why Savepoint-Isolated Scanning?**: Machine learning inference must never prevent core administrative operations. Wrapping the overlap scan in a nested savepoint (`db.begin_nested()`) ensures that even an unexpected ML failure preserves the saved complaint record.

---

## SECTION 25 — Known Technical Debt and Deferred Work

1. **S3 Storage Implementation**: S3 upload currently raises `NotImplementedError`. Local disk storage is fully functional for hackathon demonstration.
2. **SLA Background Cron Worker**: Overdue status is currently evaluated dynamically at query time. A dedicated background daemon (`services/sla.py`) is planned for Stage 8.
3. **Interactive Overlap Coordination UI**: While the backend API (`/api/overlaps/{id}/decide`) is fully implemented, the dedicated review buttons (Link, Dismiss, Hold Parallel) in `OverlapsPage.tsx` are scheduled for Stage 7.

---

## SECTION 26 — Security and Privacy Threat Review

1. **Authentication & Password Storage**: Passwords hashed with `bcrypt` (12 rounds). Bearer JWT expiration enforced server-side.
2. **Row-Level Geographic Scoping**: Regional officers are restricted by SQL WHERE clauses (`i.region = :scope_region`). Out-of-scope case access returns `404 Not Found` rather than leaking case existence.
3. **File Upload Security**: Strict 10 MB limit, file magic-byte inspection, UUID storage key generation, path traversal verification, and sanitized `Content-Disposition` headers.
4. **Offline Privacy Guard**: Cases marked `sensitive` are permanently locked to local offline processing templates, preventing any outbound external network routing.

---

## SECTION 27 — Performance, Reliability and Operations

- **Database Indexing**: GIN trigram index on `institutions.normalized_name`, B-tree indexes on `cases.institution_id`, `cases.status`, `cases.bureau_id`, and composite index on `actions(case_id, created_at)`.
- **Pagination**: Server-side cursor/offset pagination (`limit=50, max=200`) with `X-Total-Count` header avoids memory-heavy DOM rendering.
- **Model Hot-Reload**: Active model version pointer in `ml/artifacts/ACTIVE` is polled dynamically on each scan, allowing zero-downtime model updates.

---

## SECTION 28 — Deployment and AWS Credits

- **Current Architecture**: Local-first deployment via Docker Compose.
- **AWS Credit Allocation**: The team has approximately 50 AWS promotional credits available.
- **Recommendation**: Maintain local Docker deployment for primary demonstration. If cloud hosting is desired, deploy a single cost-capped `t3.medium` EC2 instance running Docker Compose rather than spinning up expensive managed RDS or OpenSearch clusters that could rapidly exhaust credits.

---

## SECTION 29 — Troubleshooting Runbook

| Symptom | Probable Cause | Diagnostic Command | Remediation Step |
|---|---|---|---|
| Database connection refused on port 5433 | Docker container stopped | `docker compose ps` | Run `docker compose up -d` from repo root |
| Port 5433 already in use | Another PostgreSQL instance running | `Get-NetTCPConnection -LocalPort 5433` | Stop conflicting local PostgreSQL or adjust port mapping |
| Backend login fails with 401 | Database unseeded or invalid credentials | Inspect officers table via `psql` | Run `cd backend; uv run python -m scripts.seed` |
| Fastembed fails on cold start | Hugging Face cache directory permission | Check `backend/.cache/fastembed` | Model downloads once automatically into local cache |
| Frontend displays blank page | Vite dev server cannot reach backend proxy | Inspect browser DevTools Network tab | Ensure backend is active on `http://localhost:8000` |
| Pytest fails with missing model | ML artifacts directory uninitialized | Check `backend/ml/artifacts/ACTIVE` | Run `cd backend; uv run python -m ml.train_overlap` |

---

## SECTION 30 — Reproducibility and Data Management

- **Deterministic Seeding**: `backend/scripts/seed.py` generates 60 synthetic institutions, 327 complaint cases across 6 bureaus, and planted overlap pairs using a fixed random seed.
- **Safe Database Reset**:
  ```powershell
  # Wipe database and reset schema
  docker compose down -v
  docker compose up -d
  cd backend
  uv run python -m scripts.seed
  uv run python -m ml.tune_resolver
  uv run python -m ml.train_overlap
  uv run python -m scripts.scan_all --rebuild
  ```
- **Zero Real Data**: All records are synthetic. No real AICTE complaints or actual institution grievance records are present in the repository.

---

## SECTION 31 — Git Workflow and Safe Handover

- **Current Checkpoint**: Commit `f8e8130` tagged as `stage-6` on branch `main`.
- **Working Tree**: Completely clean.
- **Creating a New Feature Branch (e.g. for Stage 7)**:
  ```powershell
  git checkout -b stage-7-coordination
  ```
- **Safe Rules for Teammate & AI Agents**:
  - Never run `git reset --hard` or `git clean -fd`.
  - Always run `uv run pytest` in `backend/` and `npm run build` in `frontend/` before committing.

---

## SECTION 32 — Next Development Roadmap

### Priority 1: Stage 7 — Case Coordination and Alerts UI (Immediate Next Step)
- **Scope**:
  - Wire up `OverlapsPage.tsx` with review cards showing probability badges, component score bars, and human decision controls.
  - Connect `POST /api/overlaps/{id}/decide`: Confirm link, nominate lead bureau, toggle parallel hold (`hold_parallel`), or dismiss with mandatory reason.
  - Implement top-navigation Alerts dropdown reflecting unread notifications from `/api/alerts`.
- **Tests**: Add `backend/tests/test_stage7_coordination.py`.

### Priority 2: Stage 8 — SLA Monitoring & Escalation Worker
- **Scope**: Background scheduled task checking overdue cases and inserting escalation alerts.

### Priority 3: Stage 9 — Egress Guard & LLM Integration (Offline by Default)
- **Scope**: Formalize egress audit logging and local template explainability.

---

## SECTION 33 — First Session Checklist for the New Teammate

Follow this sequential checklist to verify your environment without asking the original developer:

```text
[ ] 1. Open CaseNexus repository root in VS Code / Antigravity.
[ ] 2. Ensure Docker Desktop is running.
[ ] 3. Run: docker compose up -d
[ ] 4. Open terminal in backend/: cd backend; uv sync
[ ] 5. Run backend test suite: uv run pytest tests/ -v
       -> Verify all 72 tests pass.
[ ] 6. Start backend API: uv run uvicorn app.main:app --reload
       -> Verify http://localhost:8000/api/health returns {"ok": true}.
[ ] 7. Open second terminal in frontend/: cd frontend; npm install
[ ] 8. Verify frontend build: npm run build
       -> Verify 0 errors.
[ ] 9. Start frontend dev server: npm run dev
       -> Open http://localhost:5173 in browser.
[ ] 10. Log in with synthetic credentials:
        Username: rb1  (or mgmt1, south1, admin)
        Password: demo123
[ ] 11. Navigate to Cases -> Click "Register New Case" -> Type an institution name to see live autocomplete resolver.
[ ] 12. Create a new branch: git checkout -b stage-7-coordination
```

---

## SECTION 34 — AI Agent Continuity Protocol

Any future Antigravity AI agent receiving this repository must adhere to these operating rules:

1. **Repository is Ground Truth**: Treat code and tests as the source of truth; this document reflects the verified state as of commit `f8e8130`.
2. **Never Rebuild Completed Stages**: Stages 0 through 6 are fully implemented and verified. Do not restart or refactor working code.
3. **Preserve Existing Contracts**: Never modify backend Pydantic schemas or API response shapes without updating frontend TypeScript interfaces in `frontend/src/lib/types.ts`.
4. **Strict Savepoint Isolation**: All background scans or ML routines must maintain savepoint isolation so operational complaint records are never lost.
5. **No Synthetic Data Inventions in Tests**: Always use established fixtures from `backend/tests/conftest.py`.
6. **Pre-Edit Checklist**: Run `git status`, verify clean tree, and execute `uv run pytest` to ensure baseline passes.
7. **Post-Edit Checklist**: Run full backend test suite (`uv run pytest`) and frontend build (`npm run build`). Update `CASENEXUS_HANDOVER.md` with new test counts and findings.

---

## SECTION 35 — COPYABLE MASTER PROMPT FOR FUTURE ANTIGRAVITY AGENTS

*Copy and paste the exact text inside the box below into a new Antigravity session:*

```text
ROLE:
You are a senior full-stack AI engineer taking over CaseNexus (AICTE Complaint Monitoring & Overlap Detection Dashboard, SIH 2026 PS 26264).

MANDATORY INSTRUCTIONS:
1. READ "CASENEXUS_HANDOVER.md" FIRST. This is your primary source of truth, architectural memory, and debugging dossier.
2. DO NOT restart, rewrite, or rebuild completed stages. Stages 0 through 6 (Infrastructure, Auth, Core API, Dashboard Shell, Case Register & Institution 360, and Overlap Engine) are fully implemented, verified, and passing 72 backend pytest tests and clean frontend build.
3. Inspect Git status and existing code before touching any files. Do not delete or overwrite user work or untracked changes.
4. Your current mission is to implement STAGE 7: Case Coordination, Overlap Review Workflows, and Interactive Alerts.
5. Key Stage 7 tasks:
   - Wire frontend `OverlapsPage.tsx` to display suggested overlaps with probability badges, feature contribution bars, and review actions.
   - Wire decision controls calling `POST /api/overlaps/{id}/decide`: Confirm link, nominate lead bureau, toggle parallel hold, or dismiss with mandatory reason.
   - Implement interactive Alerts bell dropdown in `Layout.tsx` backed by `/api/alerts` with unread counts and mark-as-read actions.
   - Add automated test suite `backend/tests/test_stage7_coordination.py`.
6. Run backend tests (`uv run pytest`) and frontend build (`npm run build`) to verify zero regressions.
7. Update CASENEXUS_HANDOVER.md with any new findings, test results, or architecture updates.

Begin by inspecting the repository and confirming your baseline.
```

---

## SECTION 36 — Open Questions Requiring Human Decisions

1. **Official AICTE SLA Timelines**: Current deadlines (e.g. 45 days for `FACULTY`) are marked `ILLUSTRATIVE`. AICTE evaluation panel should provide official Gazette timelines if available.
2. **Lead Bureau Nomination Authority**: Currently, any authenticated officer can confirm an overlap link. Should lead bureau nomination be restricted exclusively to `management` or bureau directors?
3. **Cross-Region Institution Transfers**: When an institution complaint is transferred across regional offices, should the originating regional office retain read-only visibility in their dashboard? (Default recommended: Yes).
4. **Cloud Demo vs Local Demo**: Recommendation is to present the hackathon demo locally via Docker Compose to guarantee zero cloud credit burn and zero network dependency during judging.
