# CaseNexus — AICTE Integrated Complaint Dashboard

**Smart India Hackathon 2026 | PS 26264**
*Integrated Dashboard for Monitoring and Tracking Institution-Related Complaint Cases Across AICTE Bureaus/Cells*

---

## Overview

CaseNexus is a unified complaint-monitoring and coordination platform for authorized AICTE officers and management. Its primary differentiator is **explainable cross-bureau complaint overlap detection**: when two different bureaus are independently handling complaints about the same underlying issue at the same institution, the system detects this, explains why it flagged the pair (feature-by-feature), and enables officers to coordinate — linking cases, nominating a lead bureau, and recording decisions with a full audit trail.

Key capabilities:
- Live KPI dashboard (by bureau/cell, region, status, SLA)
- Institution 360 view (all cases across all bureaus)
- Hybrid overlap detection (institution resolution + semantic embeddings + calibrated scorer)
- Explainable overlap cards with feature contribution bars
- Coordination workflow: link, lead, hold, dismiss (with reason, audited)
- SLA monitoring, breach alerts, and escalation
- Excel and PDF exports
- Online/Offline mode routing with per-case sensitivity and egress ledger
- Role-based access and row-level regional scoping
- Model governance: parameter registry, model cards, shadow evaluation

---

## Quick Start (Development)

### Prerequisites
- Docker Desktop (for PostgreSQL)
- Python 3.12 via `uv` (see below)
- Node.js 20+ and npm

### 1. Clone and configure
```bash
git clone <repo>
cd aicte-dashboard
cp .env.example .env
# Edit .env: set a real JWT_SECRET (any long random string)
```

### 2. Start PostgreSQL
```bash
docker compose up -d db
# First run auto-initialises schema via db/schema.sql
docker compose exec db psql -U aicte -d aicte -c "\dt"
# Verify: 15 tables listed; bureaus shows 6 rows
```

### 3. Backend
```bash
cd backend
# Install uv if not present: https://docs.astral.sh/uv/getting-started/installation/
uv python install 3.12
uv venv --python 3.12
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

uv pip install -r requirements.txt
python -m scripts.seed          # ~400 synthetic cases, embeddings (~2 min first run)
python -m ml.train_overlap      # calibrated scorer from seed labels
uvicorn app.main:app --reload --port 8000
# Docs: http://localhost:8000/docs
```

### 4. Frontend
```bash
cd frontend
npm install
npm run dev
# App: http://localhost:5173
```

### Demo Accounts (all password: `demo123`)
| Username | Role | Scope |
|---|---|---|
| `admin` | Admin | Full access |
| `mgmt1` | Management | All bureaus |
| `rb1`, `rb2` | Officer | Regulation Bureau |
| `pgrc1`, `pgrc2` | Officer | PGRC |
| `south1` | Regional | South region only |

---

## Commands Reference

| Task | Command |
|---|---|
| Start DB | `docker compose up -d db` |
| Stop DB (keep data) | `docker compose stop db` |
| DB shell | `docker compose exec db psql -U aicte -d aicte` |
| DB logs | `docker compose logs -f db` |
| Seed data | `python -m scripts.seed` (from `backend/`) |
| Train overlap scorer | `python -m ml.train_overlap` (from `backend/`) |
| Run SLA worker | `python -m app.worker` (from `backend/`) |
| Run API | `uvicorn app.main:app --reload --port 8000` |
| Run tests | `pytest -q` (from `backend/`) |
| Lint | `ruff check .` (from `backend/`) |
| Frontend dev | `npm run dev` (from `frontend/`) |

> **Data reset (destructive — only for demo reset):**
> `backend\.venv\Scripts\python scripts/reset_demo.py --database aicte --retrain` (from repository root)
> Then re-run seed and train.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Browser (React + Vite + TypeScript)                │
│  TanStack Query · Recharts · shadcn/ui · Tailwind   │
└───────────────────────┬─────────────────────────────┘
                        │ HTTP/JSON (proxied in dev)
┌───────────────────────▼─────────────────────────────┐
│  FastAPI (Python 3.12)                              │
│  JWT auth · RBAC · row-level region scoping         │
│  Services: embeddings · resolution · features ·    │
│            overlap · sla · routing · egress         │
│  APScheduler worker (SLA scans)                     │
└───────────────────────┬─────────────────────────────┘
                        │ SQLAlchemy 2.x + psycopg
┌───────────────────────▼─────────────────────────────┐
│  PostgreSQL 16 (Docker)                             │
│  pgvector (vector(384) embeddings)                  │
│  pg_trgm (institution fuzzy matching)               │
└─────────────────────────────────────────────────────┘
```

---

## Deployment Architecture Note

The build guide has two variants:
1. **Local Docker Compose** (Stages 0–10, zero AWS cost) — this is the active development target.
2. **Single EC2 + RDS PostgreSQL** (Stage 11, optional demo) — same code, same schema, different `DATABASE_URL`.

Stage 11 is **not authorized** until explicitly approved. All development runs locally.

---

## Repository Layout

```
aicte-dashboard/
├── README.md
├── .env.example
├── .gitignore
├── docker-compose.yml          # dev: PostgreSQL only
├── docker-compose.demo.yml     # demo: full stack, network isolation (Stage 11)
├── db/
│   └── schema.sql              # full schema + bootstrap data
├── docs/
│   ├── AICTE_Prototype_Build_Guide.md
│   ├── CaseNexus_Modules_Pipelines_Theory.md
│   └── requirements-traceability.md
├── backend/
│   ├── requirements.txt
│   ├── requirements.lock.txt   # generated; pin exact transitive versions
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── db.py
│   │   ├── auth.py
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── institutions.py
│   │   │   ├── cases.py
│   │   │   ├── overlaps.py
│   │   │   ├── alerts.py
│   │   │   ├── reports.py
│   │   │   └── admin.py
│   │   ├── services/
│   │   │   ├── embeddings.py
│   │   │   ├── resolution.py
│   │   │   ├── features.py
│   │   │   ├── overlap.py
│   │   │   ├── sla.py
│   │   │   ├── routing.py
│   │   │   └── egress.py
│   │   └── worker.py
│   ├── ml/
│   │   ├── train_overlap.py
│   │   ├── evaluate.py
│   │   └── artifacts/          # .joblib models (git-ignored)
│   ├── scripts/
│   │   └── seed.py
│   └── tests/
│       ├── test_auth.py
│       ├── test_routing.py
│       └── test_schema.py
└── frontend/
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── main.tsx
        ├── lib/api.ts
        ├── pages/
        └── components/
```

---

## Missing Documents

The following documents referenced in the build guide were **not found** in this repository:
- `AICTE_Complaint_Dashboard_Guide.md` — design document (companion to the build guide)
- `SIH2026_Team_Handbook.pdf`
- Official SIH 2026 PS 26264 PDF

Implementation proceeds from:
- `docs/AICTE_Prototype_Build_Guide.md` (primary reference, 104 KB)
- `docs/CaseNexus_Modules_Pipelines_Theory.md` (theory and module map)
- The build directive provided at project kickoff

---

## Stage 5 Implementation (Cases, Detail, Institution 360)

Stage 5 is complete with all backend and frontend acceptance criteria satisfied:
- **Cases List (`/cases`)**: Server-side sorting, pagination, and all PS filters (`q`, `institution`, `aicte_id`, `bureau`, `region`, `category`, `status`, `date_from`, `date_to`, `overdue`) bound to the URL query string (`useSearchParams`). Accessible table navigation, total count from `X-Total-Count`, and region scoping for regional officers.
- **Register Case Dialog**: Integrated modal with debounced autocomplete for institutions, auto-filling AICTE ID and city, form validation, and inline resolution error handling.
- **Case Detail (`/cases/:id`)**: Full case overview with SLA tracking, illustrative notice for seed rules, pre-action sibling banner, chronological movement timeline (highlighting transfers, escalations, closures, and reopens), document download links, and action recording form with file attachment. Read-only overlap panel.
- **Institution 360 (`/institutions/:id`)**: Comprehensive institution profile showing address and AICTE ID, summary metrics, "Who is dealing with this institution right now" multi-unit indicator, repeat categories, all-cases historical table across bureaus, and overlap history.
- **Document Storage**: Local storage implementation with SHA-256 integrity verification, 10MB limit, file extension and magic byte validation, and UUID-based secure paths.

### Known Gaps (Stage 5)
1. **Audit Entries for Document Downloads**: Document downloads are authenticated and scope-checked, but audit-log event writes for sensitive case document downloads will be integrated in Stage 9 (Governance & Audit).
2. **S3 Storage Implementation**: Prototype uses the local disk storage provider (`localStorage`); the S3 storage interface raises "not implemented in the prototype" as designed.

---

## Known Limitations and Honest Claims

| Claim | Reality |
|---|---|
| SLA deadlines | ILLUSTRATIVE — AICTE's actual prescribed timelines are not in the PS |
| Overlap detection accuracy | Measured on synthetic data; labelled `learned_synthetic` |
| Egress control | App-layer + Docker network; not VPC-level |
| Embeddings | CPU inference via fastembed/ONNX — no GPU needed |
| LLM explanations | Template-based (offline); LLM stub available for online mode |
| Institution resolution | IDF+trigram blend; Splink upgrade is planned roadmap |
| Document storage | Local disk storage with UUID mapping; S3 backend is stub |

---

## License

Prototype for SIH 2026. All complaint data in this repository is synthetic.


## Lane reset and verified status

From the repository root on Windows: `backend\.venv\Scripts\python scripts/reset_demo.py --database aicte_l1 --retrain`. Use the backend virtualenv Python on other systems. The named database must already have db/schema.sql. The helper applies numbered migrations, reseeds synthetic data, optionally tunes/trains, and backfills overlaps. Its exact configured local database name is checked before changes. Put lane DATABASE_URL in backend/.env (settings load from the backend working directory); never commit it. Install backend dependencies with uv pip install -r requirements.txt (requirements.lock.txt is absent), frontend with npm ci.

API: from backend, `python -m uvicorn app.main:app --port 8000`. Web: from frontend, `npm run dev -- --port 5173`. Worker: from backend, `python -m app.worker`. All lanes share the original checkout's Postgres container. Consult docs/reports/FINAL.md and `bash ops/ops.sh status` for actual verified completion. Target capabilities above are not a completion claim. Synthetic data is not evidence of real-world accuracy; Splink remains planned.
