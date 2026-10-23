# Prototype Build Guide: Integrated Institution Complaint Dashboard
### SIH 2026, PS 26264. Stage-by-stage implementation, with schema, code, setup and tool usage

> Companion to `AICTE_Complaint_Dashboard_Guide.md` (the design document).
> This file is the **build manual**: what to do, in what order, with working code to start from.
> Code is a **starting scaffold**. Library APIs and versions change, so verify against current docs when you install.

---

## 0. Budget-first ground rules (read this before anything else)

You have limited AWS credits and a hard personal cap of **about 50-70 credits**. This guide is built around that.

### 0.1 The rule

| Stages | Where it runs | AWS cost |
|---|---|---|
| **1 to 10** (everything, including AI, scoring, router, SLA, reports) | Your laptop, Docker | **0** |
| **11** (optional hosted demo) | Short-lived AWS demo, with teardown | Target **under 25**, hard cap **50** |

**Do not create an AWS resource until Stage 11.** The prototype is complete and demo-able without AWS.

### 0.2 One deliberate change from the earlier design (please read)

The design doc said "one RDS database and one S3 for both modes, no separate local database". With your budget cap, always-on RDS is the single most expensive item, so for the prototype:

- It is still **one PostgreSQL, one schema, one connection string** (`DATABASE_URL`), never two databases running in parallel.
- During development that one PostgreSQL runs in Docker on your laptop. At Stage 11 you point the **same** `DATABASE_URL` at RDS for a few days. Nothing in the code changes.
- Same idea for files: one storage interface with `STORAGE_BACKEND=local` (default) or `s3`. It is a configuration switch on one interface, not two stores in parallel. Real S3 costs cents at prototype size, but it also means an AWS account, credentials and a bucket, which you said you want to avoid until needed.

In the PPT you can truthfully say: "Same code and schema run on laptop or on RDS and S3 through configuration."

### 0.3 Approximate cost of the optional demo (verify in the AWS Pricing Calculator)

Prices vary by region (Mumbai is usually a little higher than US regions) and change over time. Treat these as rough orders of magnitude, not quotes:

| Item | Rough cost |
|---|---|
| RDS `db.t4g.micro`, single-AZ, 20 GB storage | roughly a few cents per hour, plus a small storage cost |
| EC2 small instance (`t3.micro` or `t4g.micro` class) | roughly a cent per hour |
| Public IPv4 address | roughly half a cent per hour |
| S3 for a few documents | cents per month |
| **7-day demo window, all of the above** | **roughly single-digit credits** if you tear down afterwards |

### 0.4 Things that quietly burn credits (never create these)

- **NAT Gateway** (hourly charge plus data)
- **Application Load Balancer / Network Load Balancer** (hourly charge)
- **Multi-AZ RDS**, **large instance classes**, **provisioned IOPS**
- Forgotten **stopped RDS** instances (AWS can restart a stopped instance automatically after a limited period, so delete rather than stop, and check current behaviour)
- Unattached **Elastic IPs**, old **snapshots**, **CloudWatch** log groups with long retention
- Any **GPU / SageMaker / Bedrock** usage

### 0.5 Cost guardrails (do these on the day you open the AWS console)

1. Turn on **MFA** for the root account. Do not use root for daily work.
2. Create **AWS Budgets** with email alerts at roughly 10, 30 and 50 credits of actual spend, plus a forecast alert.
3. Enable **Cost Anomaly Detection** and free-tier usage alerts in Billing preferences.
4. Check **Billing → Credits** to see how your credits are applied, what they cover, and when they expire. Do not assume 1 credit equals 1 dollar of service without checking.
5. Tag every resource `project=sih-aicte` so you can find and delete everything.
6. Keep a written **teardown checklist** (Stage 11) and run it the day the demo ends.

---

## 1. What we are building (prototype scope)

A web app where AICTE officers (RB, PGRC, Regional, Management, Admin) can:

1. See all complaint cases across Bureaus/Cells with live KPIs
2. Search and filter cases; open a case to see its full action timeline
3. Open an **institution 360 view** with complaints from every Bureau/Cell
4. Get **automatic overlap alerts** (hybrid engine: institution resolution + semantic similarity + calibrated scoring)
5. **Coordinate**: link cases, nominate a lead Bureau/Cell, hold parallel action, dismiss with reason
6. See **SLA risk** warnings and escalation alerts
7. Export reports to Excel/PDF
8. Toggle **Online/Offline mode** (global, per-capability, per-case sensitivity) with an egress ledger

### Prototype boundaries

| In scope | Out of scope (documented as roadmap) |
|---|---|
| Everything above on synthetic data | Real integration with RB/PGRC systems (CSV import adapter only) |
| Local models (embeddings, scikit-learn) | Hosted LLM explanations (template explanations only; stub for later) |
| In-app alerts | Real email sending (SES stub, ledger only) |
| App-layer + Docker-network egress control | VPC-level enforcement, SSO |

---

## 2. Stage map

| Stage | Name | Output | Size |
|---|---|---|---|
| 0 | Accounts, tools, repo | Working dev machine, empty repo | S |
| 1 | Database | Dockerised PostgreSQL with full schema | S |
| 2 | Seed data and ground truth | ~60 institutions, ~400 cases, labelled pairs | M |
| 3 | Backend core API | Auth, institutions, cases, actions, dashboard stats | M |
| 4 | Frontend shell and dashboard | Login, layout, KPI cards, charts | M |
| 5 | Case list, case detail, institution 360 | Filters, timeline, history | M |
| 6 | Overlap engine | Resolution, embeddings, calibrated scorer | L |
| 7 | Coordination and alerts | Overlap review UI, link/lead/hold/dismiss, alerts center | M |
| 8 | SLA worker and reports | Risk scan, escalation, Excel/PDF export | M |
| 9 | Mode router and egress | Online/Offline toggle, sensitivity flag, ledger | M |
| 10 | Evaluation and parameter registry | Metrics, model card, shadow mode | M |
| 11 | Optional AWS demo (cost-capped) | Hosted demo and teardown | S |
| 12 | Demo script and PPT | Rehearsed story | S |

Each stage ends with a **Definition of Done (DoD)**. Do not start the next stage until the DoD passes. Commit to Git at the end of every stage.

---

## 3. Repository layout

```
aicte-dashboard/
├── README.md
├── .env.example
├── .gitignore
├── docker-compose.yml            # dev: PostgreSQL only
├── docker-compose.demo.yml       # demo: full stack with network isolation
├── db/
│   └── schema.sql
├── backend/
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── db.py
│   │   ├── auth.py
│   │   ├── schemas.py
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
│   │   │   ├── egress.py
│   │   │   └── storage.py
│   │   └── worker.py
│   ├── ml/
│   │   ├── train_overlap.py
│   │   ├── evaluate.py
│   │   └── artifacts/            # trained model files (git-ignored)
│   ├── scripts/
│   │   └── seed.py
│   └── tests/
└── frontend/
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── main.tsx
        ├── lib/api.ts
        ├── pages/ (Dashboard, Cases, CaseDetail, Institution, Overlaps, Alerts, Reports, Admin)
        └── components/ (KpiCard, Timeline, OverlapCard, ModeBar, ...)
```

---

## Stage 0: Accounts, tools, repo

### 0.1 Install

| Tool | Why | Check |
|---|---|---|
| Git | Version control | `git --version` |
| Docker Desktop (or Docker Engine + Compose) | Runs PostgreSQL (and demo stack) | `docker compose version` |
| Python 3.11 or 3.12 | Backend and ML | `python --version` |
| Node.js LTS (current) | Frontend | `node -v`, `npm -v` |
| VS Code (or any editor) | Editing | Extensions: Python, Ruff, ESLint, Tailwind CSS IntelliSense, Docker |
| A SQL client | Inspecting data | `psql` (comes with PostgreSQL client tools), or DBeaver / pgAdmin |

### 0.2 Create the repo

```bash
mkdir aicte-dashboard && cd aicte-dashboard
git init
mkdir -p db backend/app/routers backend/app/services backend/ml/artifacts backend/scripts backend/tests frontend
```

`.gitignore`:

```gitignore
.env
__pycache__/
*.pyc
.venv/
node_modules/
dist/
backend/ml/artifacts/
backend/storage/
pgdata/
```

`.env.example` (copy to `.env`):

```bash
DATABASE_URL=postgresql+psycopg://aicte:aicte@localhost:5432/aicte
JWT_SECRET=change-this-to-a-long-random-string
STORAGE_BACKEND=local
LOCAL_STORAGE_DIR=./storage
S3_BUCKET=
EMBED_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
EMBED_DIM=384
```

### 0.3 Backend environment

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate     macOS/Linux: source .venv/bin/activate
```

`backend/requirements.txt`:

```text
fastapi
uvicorn[standard]
sqlalchemy>=2.0
psycopg[binary]
pydantic-settings
pyjwt
bcrypt
python-multipart
fastembed
scikit-learn
numpy
joblib
rapidfuzz
apscheduler
openpyxl
reportlab
boto3
httpx
pytest
```

```bash
pip install -r requirements.txt
pip freeze > requirements.lock.txt   # pin exact versions once it works
```

### 0.5 DoD
`docker compose version`, `python --version`, `node -v` all work; repo initialised; `.env` created.

---

## Stage 1: Database

### 1.1 `docker-compose.yml` (development, PostgreSQL only)

```yaml
services:
  db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: aicte
      POSTGRES_PASSWORD: aicte
      POSTGRES_DB: aicte
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./db/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro
volumes:
  pgdata:
```

> The `pgvector/pgvector` image bundles the `vector` extension. `pg_trgm` ships with PostgreSQL contrib. If you later use RDS, confirm your chosen PostgreSQL version supports `pgvector` and `pg_trgm` before provisioning.

### 1.2 `db/schema.sql`

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

-- ---------- Organisation ----------
CREATE TABLE bureaus (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        TEXT UNIQUE NOT NULL,           -- RB, PGRC, ROC-S ...
    name        TEXT NOT NULL,
    kind        TEXT NOT NULL CHECK (kind IN ('bureau','cell','regional'))
);

CREATE TABLE officers (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username      TEXT UNIQUE NOT NULL,
    full_name     TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('officer','regional','management','admin')),
    bureau_id     BIGINT REFERENCES bureaus(id),
    region        TEXT,                          -- for regional scoping
    active        BOOLEAN NOT NULL DEFAULT TRUE
);

-- ---------- Institutions ----------
CREATE TABLE institutions (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    aicte_permanent_id  TEXT UNIQUE,
    name                TEXT NOT NULL,
    normalized_name     TEXT NOT NULL,
    address             TEXT,
    city                TEXT,
    state               TEXT,
    region              TEXT NOT NULL,           -- e.g. South, North, East, West, Central
    inst_type           TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inst_trgm ON institutions USING gin (normalized_name gin_trgm_ops);
CREATE INDEX idx_inst_region ON institutions (region);

CREATE TABLE institution_aliases (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institution_id  BIGINT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    alias           TEXT NOT NULL,
    source          TEXT NOT NULL DEFAULT 'confirmed_match',
    approved        BOOLEAN NOT NULL DEFAULT FALSE
);

-- ---------- Categories and SLA ----------
CREATE TABLE categories (
    code   TEXT PRIMARY KEY,
    label  TEXT NOT NULL
);

CREATE TABLE sla_rules (
    category          TEXT PRIMARY KEY REFERENCES categories(code),
    deadline_days     INT  NOT NULL,
    escalate_after    INT  NOT NULL,             -- days overdue before escalation
    source_reference  TEXT NOT NULL              -- policy citation, or 'ILLUSTRATIVE'
);

-- ---------- Cases ----------
CREATE TABLE cases (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    case_ref          TEXT UNIQUE,
    institution_id    BIGINT NOT NULL REFERENCES institutions(id),
    inst_match_conf   REAL   NOT NULL DEFAULT 1.0,   -- confidence of institution resolution
    category          TEXT   NOT NULL REFERENCES categories(code),
    description       TEXT   NOT NULL,
    received_date     DATE   NOT NULL,
    status            TEXT   NOT NULL CHECK (status IN
                        ('received','registered','assigned','under_process',
                         'transferred','escalated','action_taken','disposed','reopened')),
    bureau_id         BIGINT NOT NULL REFERENCES bureaus(id),
    officer_id        BIGINT REFERENCES officers(id),
    sla_due_date      DATE   NOT NULL,
    closed_date       DATE,
    priority          TEXT   NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
    sensitivity_flag  BOOLEAN NOT NULL DEFAULT FALSE,
    hold_parallel     BOOLEAN NOT NULL DEFAULT FALSE,
    embedding         vector(384),
    embedding_model   TEXT,
    issue_key         TEXT,                          -- SEED ONLY: ground-truth issue id for evaluation
    next_action       TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cases_inst   ON cases (institution_id);
CREATE INDEX idx_cases_status ON cases (status);
CREATE INDEX idx_cases_bureau ON cases (bureau_id);
CREATE INDEX idx_cases_recv   ON cases (received_date);
CREATE INDEX idx_cases_fts    ON cases USING gin (to_tsvector('simple', description));
-- Optional once data grows: CREATE INDEX idx_cases_vec ON cases USING hnsw (embedding vector_cosine_ops);

-- ---------- Action history ----------
CREATE TABLE actions (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    case_id     BIGINT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    bureau_id   BIGINT REFERENCES bureaus(id),
    officer_id  BIGINT REFERENCES officers(id),
    action_type TEXT NOT NULL,        -- registered, assigned, notice_issued, inspection, transfer, escalation, remark, closed, link, hold ...
    remarks     TEXT,
    meta        JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_actions_case ON actions (case_id, created_at);

CREATE TABLE documents (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    action_id     BIGINT NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
    file_name     TEXT NOT NULL,
    storage_key   TEXT NOT NULL,
    storage_kind  TEXT NOT NULL,      -- local | s3
    checksum      TEXT NOT NULL,
    uploaded_by   BIGINT REFERENCES officers(id),
    uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Overlaps ----------
CREATE TABLE overlap_links (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    case_a           BIGINT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    case_b           BIGINT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    level            TEXT   NOT NULL CHECK (level IN ('high','medium','info')),
    probability      REAL   NOT NULL,
    breakdown        JSONB  NOT NULL,
    status           TEXT   NOT NULL DEFAULT 'suggested'
                     CHECK (status IN ('suggested','confirmed','dismissed')),
    lead_bureau_id   BIGINT REFERENCES bureaus(id),
    decided_by       BIGINT REFERENCES officers(id),
    decision_reason  TEXT,
    model_version    TEXT,
    explanation      TEXT,
    explanation_src  TEXT NOT NULL DEFAULT 'template',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (case_a < case_b),
    UNIQUE (case_a, case_b)
);

-- ---------- Alerts ----------
CREATE TABLE alerts (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    kind        TEXT NOT NULL CHECK (kind IN ('overlap_high','overlap_medium','pending','escalation','sla_risk','sla_breach','system')),
    case_id     BIGINT REFERENCES cases(id) ON DELETE CASCADE,
    overlap_id  BIGINT REFERENCES overlap_links(id) ON DELETE CASCADE,
    bureau_id   BIGINT REFERENCES bureaus(id),
    message     TEXT NOT NULL,
    read        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_alerts_bureau ON alerts (bureau_id, read);

-- ---------- Governance ----------
CREATE TABLE model_versions (
    id          TEXT PRIMARY KEY,                  -- e.g. overlap-2026-10-25-a
    kind        TEXT NOT NULL,                     -- overlap | category
    trained_on  TEXT NOT NULL,                     -- dataset description
    metrics     JSONB NOT NULL,
    status      TEXT NOT NULL CHECK (status IN ('shadow','active','retired')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE parameter_registry (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    parameter    TEXT NOT NULL,
    value        TEXT NOT NULL,
    origin       TEXT NOT NULL CHECK (origin IN ('learned','learned_synthetic','policy','default_pending_data')),
    derived_from TEXT,
    metrics      JSONB,
    model_version TEXT,
    approved_by  BIGINT REFERENCES officers(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE policy_settings (
    scope       TEXT PRIMARY KEY,                  -- 'global' or capability name
    value       TEXT NOT NULL CHECK (value IN ('online','offline')),
    changed_by  BIGINT REFERENCES officers(id),
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE egress_ledger (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    capability    TEXT NOT NULL,
    destination   TEXT NOT NULL,
    payload_kind  TEXT NOT NULL,
    case_ref      TEXT,
    mode          TEXT NOT NULL,
    redacted      BOOLEAN NOT NULL,
    outcome       TEXT NOT NULL,                   -- sent | blocked | stub
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_id    BIGINT REFERENCES officers(id),
    action      TEXT NOT NULL,
    entity      TEXT NOT NULL,
    entity_id   TEXT,
    detail      JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Initial reference data ----------
INSERT INTO policy_settings (scope, value) VALUES ('global','online');

INSERT INTO bureaus (code, name, kind) VALUES
 ('RB',   'Regulation Bureau', 'bureau'),
 ('PGRC', 'Public Grievance Redressal Cell', 'cell'),
 ('ROC-N','Regional Office North', 'regional'),
 ('ROC-S','Regional Office South', 'regional'),
 ('ROC-E','Regional Office East', 'regional'),
 ('ROC-W','Regional Office West', 'regional');

INSERT INTO categories (code, label) VALUES
 ('FACULTY',    'Faculty shortage / fake faculty'),
 ('FEES',       'Fee irregularity'),
 ('APPROVAL',   'Unapproved course or intake'),
 ('CERTIFICATE','Certificate / document withholding'),
 ('INFRA',      'Infrastructure deficiency'),
 ('MISREP',     'Misrepresentation of approval or affiliation');

-- ILLUSTRATIVE deadlines: replace with AICTE-prescribed timelines and cite the source.
INSERT INTO sla_rules (category, deadline_days, escalate_after, source_reference) VALUES
 ('FACULTY',45,7,'ILLUSTRATIVE'),
 ('FEES',30,7,'ILLUSTRATIVE'),
 ('APPROVAL',60,10,'ILLUSTRATIVE'),
 ('CERTIFICATE',21,5,'ILLUSTRATIVE'),
 ('INFRA',60,10,'ILLUSTRATIVE'),
 ('MISREP',45,7,'ILLUSTRATIVE');
```

### 1.3 Run and verify

```bash
docker compose up -d db
docker compose exec db psql -U aicte -d aicte -c "\dt"
docker compose exec db psql -U aicte -d aicte -c "SELECT similarity('Govt Engg College','Government Engineering College');"
```

If the schema changes during development: `docker compose down -v && docker compose up -d db` (this wipes data, then re-seed in Stage 2).

### 1.4 DoD
All tables listed; `similarity()` returns a number; `SELECT * FROM bureaus;` shows 6 rows.

---

## Stage 2: Seed data and ground truth

Goal: realistic synthetic data where we **know** which case pairs are truly related, so Stage 6 can learn from it and Stage 10 can measure it.

### 2.1 Design of the synthetic data

- ~60 institutions with messy name variants for intake testing (for example "Govt. Engg. College, Pune").
- ~400 cases: roughly 300 closed historical cases (for SLA statistics), ~100 active.
- Each case has a latent `issue_key`. **True overlap = same institution AND same issue_key.**
- Planted overlaps: pairs of cases with the same issue_key but handled by RB and PGRC, worded differently.
- **Hard negatives:** same institution, different issue (must NOT be high overlap).
- Complaint text from paraphrase templates in several wordings (add a few Hinglish ones to test the multilingual model).

### 2.2 `backend/scripts/seed.py`

```python
"""Seed synthetic data. Run:  python -m scripts.seed   (from backend/)"""
import random, re, math
from datetime import date, timedelta
import bcrypt
from sqlalchemy import text
from app.db import engine
from app.services.embeddings import embed_many, vec_literal
from app.config import settings

random.seed(42)

PREFIXES = ["Sri Venkateswara","Dr. Ambedkar","Maharana Pratap","Netaji Subhas","Rajiv Gandhi",
            "Sardar Patel","Abdul Kalam","Rabindranath Tagore","Swami Vivekananda","Chhatrapati Shivaji",
            "Jawaharlal Nehru","Mahatma Gandhi","Lal Bahadur Shastri","Visvesvaraya","Homi Bhabha"]
TYPES = ["Institute of Technology","College of Engineering","Engineering College",
         "Institute of Management","College of Pharmacy"]
CITIES = [("Pune","Maharashtra","West"),("Nagpur","Maharashtra","West"),("Bengaluru","Karnataka","South"),
          ("Mysuru","Karnataka","South"),("Chennai","Tamil Nadu","South"),("Coimbatore","Tamil Nadu","South"),
          ("Hyderabad","Telangana","South"),("Jaipur","Rajasthan","North"),("Lucknow","Uttar Pradesh","North"),
          ("Kanpur","Uttar Pradesh","North"),("Bhopal","Madhya Pradesh","Central"),("Indore","Madhya Pradesh","Central"),
          ("Kolkata","West Bengal","East"),("Bhubaneswar","Odisha","East"),("Patna","Bihar","East"),
          ("Ahmedabad","Gujarat","West"),("Surat","Gujarat","West"),("Chandigarh","Chandigarh","North")]

# issue templates: category -> list of (issue_key suffix) -> paraphrases
ISSUES = {
 "FACULTY": {
   "fake_faculty": [
     "Faculty listed on the website at {inst} do not actually teach here, many appear to be fake names.",
     "Inspection indicates that teaching staff at {inst} are not as per AICTE norms and several are on paper only.",
     "{inst} shows faculty on its approval documents who have never taken a class. Please verify.",
     "{inst} ke kai faculty sirf kaagaz par hain, class mein koi padhane nahi aata."],
   "faculty_salary": [
     "Teachers at {inst} have not received salary for several months and some were forced to resign.",
     "Faculty members of {inst} complain of unpaid salaries and arbitrary termination.",
     "{inst} is not paying prescribed pay scales to its teaching staff."]},
 "FEES": {
   "excess_fee": [
     "{inst} is charging fees far above the amount approved by the fee committee.",
     "Students report being forced to pay additional unapproved fees at {inst}.",
     "Fee demanded by {inst} exceeds the sanctioned structure and receipts are not provided.",
     "{inst} mein approved fees se bahut zyada paisa maanga ja raha hai."],
   "refund_denied": [
     "{inst} refuses to refund fees even after the student withdrew before the deadline.",
     "I withdrew my admission from {inst} within the allowed period but the refund is being denied."]},
 "APPROVAL": {
   "extra_intake": [
     "{inst} has admitted more students than the sanctioned intake for the current year.",
     "Intake at {inst} is beyond the approved seats, which risks the validity of degrees.",
     "{inst} is running a new course without AICTE approval and admitting students into it."],
   "closed_course": [
     "{inst} continues to admit students to a programme whose approval was withdrawn.",
     "A course closed by AICTE is still being advertised and run by {inst}."]},
 "CERTIFICATE": {
   "orig_docs": [
     "{inst} is holding my original certificates and refusing to return them after I left.",
     "My original documents are being retained by {inst} until I pay unrelated dues.",
     "{inst} ne mere original certificate rok rakhe hain aur wapas nahi de rahe."]},
 "INFRA": {
   "labs_missing": [
     "{inst} does not have the laboratories and equipment promised at the time of admission.",
     "The labs at {inst} are non-functional and the library is practically empty.",
     "Infrastructure at {inst} is far below AICTE norms: no working labs, inadequate classrooms."]},
 "MISREP": {
   "false_claim": [
     "{inst} advertises AICTE approval and accreditation that it does not actually hold.",
     "Brochures of {inst} falsely claim approval status and placement records.",
     "{inst} misleads applicants about its affiliation and AICTE approval."]},
}

def normalize(s: str) -> str:
    s = s.lower()
    s = re.sub(r"\bgovt\.?\b", "government", s)
    s = re.sub(r"\bengg\.?\b", "engineering", s)
    s = re.sub(r"\binst\.?\b", "institute", s)
    s = re.sub(r"\btech\.?\b", "technology", s)
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()

def hash_pw(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def main():
    with engine.begin() as c:
        c.execute(text("TRUNCATE alerts, overlap_links, documents, actions, cases, institution_aliases, "
                       "institutions, officers RESTART IDENTITY CASCADE"))
        bureaus = {r.code: r.id for r in c.execute(text("SELECT id, code FROM bureaus"))}

        # officers (password for all demo users: demo123)
        pw = hash_pw("demo123")
        users = [("rb1","Asha Verma (RB)","officer","RB",None),("rb2","Ravi Iyer (RB)","officer","RB",None),
                 ("pgrc1","Meera Nair (PGRC)","officer","PGRC",None),("pgrc2","Sanjay Gupta (PGRC)","officer","PGRC",None),
                 ("south1","Kiran Rao (Regional South)","regional","ROC-S","South"),
                 ("mgmt1","Dr. R. Sharma (Management)","management",None,None),
                 ("admin","System Admin","admin",None,None)]
        for u,n,r,b,reg in users:
            c.execute(text("INSERT INTO officers (username,full_name,password_hash,role,bureau_id,region) "
                           "VALUES (:u,:n,:p,:r,:b,:reg)"),
                      {"u":u,"n":n,"p":pw,"r":r,"b":bureaus.get(b) if b else None,"reg":reg})
        officer_by_bureau = {}
        for r in c.execute(text("SELECT id, bureau_id FROM officers WHERE bureau_id IS NOT NULL")):
            officer_by_bureau.setdefault(r.bureau_id, []).append(r.id)

        # institutions
        insts = []
        used = set()
        while len(insts) < 60:
            p, t = random.choice(PREFIXES), random.choice(TYPES)
            city, state, region = random.choice(CITIES)
            name = f"{p} {t}, {city}"
            if name in used: continue
            used.add(name)
            aid = "1-" + "".join(random.choice("0123456789") for _ in range(8))
            iid = c.execute(text(
                "INSERT INTO institutions (aicte_permanent_id,name,normalized_name,address,city,state,region,inst_type) "
                "VALUES (:a,:n,:nn,:ad,:ci,:st,:re,:ty) RETURNING id"),
                {"a":aid,"n":name,"nn":normalize(name),"ad":f"{city}, {state}","ci":city,"st":state,"re":region,"ty":t}).scalar()
            insts.append({"id":iid,"name":name,"short":f"{p} {t}","region":region})

        # cases
        rows = []   # (institution, bureau_code, category, issue_key, status, received, closed)
        today = date.today()
        cats = list(ISSUES.keys())
        slas = {r.category: r.deadline_days for r in c.execute(text("SELECT category, deadline_days FROM sla_rules"))}

        def add_case(inst, bureau, cat, issue, active):
            received = today - timedelta(days=random.randint(3, 100 if active else 400))
            if active:
                status = random.choice(["registered","assigned","under_process","under_process","escalated","action_taken"])
                closed = None
            else:
                status = "disposed"
                # closed-case durations: lognormal-ish around SLA; some breach
                dur = max(3, int(random.lognormvariate(math.log(slas[cat]*0.8), 0.45)))
                closed = received + timedelta(days=dur)
                if closed > today: closed = today
            text_ = random.choice(ISSUES[cat][issue]).format(inst=inst["short"] if random.random()<.7 else inst["name"])
            rows.append((inst, bureau, cat, f'{inst["id"]}:{issue}', status, received, closed, text_))

        for inst in insts:
            # historical closed cases
            for _ in range(random.randint(2, 6)):
                cat = random.choice(cats); issue = random.choice(list(ISSUES[cat]))
                add_case(inst, random.choice(["RB","PGRC","ROC-N","ROC-S","ROC-E","ROC-W"]), cat, issue, False)
            # active cases
            r = random.random()
            if r < 0.40:   # planted TRUE overlap: same issue, RB and PGRC, different wording
                cat = random.choice(cats); issue = random.choice(list(ISSUES[cat]))
                add_case(inst, "PGRC", cat, issue, True)
                add_case(inst, "RB",   cat, issue, True)
            elif r < 0.65: # HARD NEGATIVE: same institution, different issues
                c1, c2 = random.sample(cats, 2)
                add_case(inst, "PGRC", c1, random.choice(list(ISSUES[c1])), True)
                add_case(inst, "RB",   c2, random.choice(list(ISSUES[c2])), True)
            elif r < 0.85: # single active case
                cat = random.choice(cats)
                add_case(inst, random.choice(["RB","PGRC"]), cat, random.choice(list(ISSUES[cat])), True)

        texts = [r[7] for r in rows]
        vecs = embed_many(texts)

        for (inst, bureau, cat, issue_key, status, received, closed, desc), v in zip(rows, vecs):
            bid = bureaus[bureau]
            officer = random.choice(officer_by_bureau.get(bid, [None]))
            due = received + timedelta(days=slas[cat])
            cid = c.execute(text("""
                INSERT INTO cases (institution_id,inst_match_conf,category,description,received_date,status,bureau_id,officer_id,
                                   sla_due_date,closed_date,embedding,embedding_model,issue_key,next_action)
                VALUES (:i,:conf,:cat,:d,:rd,:st,:b,:o,:due,:cd,CAST(:v AS vector),:m,:ik,:na) RETURNING id"""),
                {"i":inst["id"],"conf":round(random.uniform(.9,1.0),3),"cat":cat,"d":desc,"rd":received,"st":status,
                 "b":bid,"o":officer,"due":due,"cd":closed,"v":vec_literal(v),"m":settings.embed_model,
                 "ik":issue_key,"na":None if closed else "Review reply and decide next step"}).scalar()
            c.execute(text("UPDATE cases SET case_ref='CASE-'||lpad(id::text,6,'0') WHERE id=:i"), {"i":cid})
            c.execute(text("INSERT INTO actions (case_id,bureau_id,officer_id,action_type,remarks,created_at) "
                           "VALUES (:c,:b,:o,'registered','Case registered',:t)"),
                      {"c":cid,"b":bid,"o":officer,"t":received})
            if closed:
                c.execute(text("INSERT INTO actions (case_id,bureau_id,officer_id,action_type,remarks,created_at) "
                               "VALUES (:c,:b,:o,'closed','Case disposed',:t)"),
                          {"c":cid,"b":bid,"o":officer,"t":closed})
    print(f"Seeded {len(insts)} institutions and {len(rows)} cases.")

if __name__ == "__main__":
    main()
```

> `seed.py` depends on `app/services/embeddings.py` and `app/db.py` from Stage 3/6. Create those two small files first (shown below), then run the seed. Seed data is **synthetic**, and its parameters must be labelled `learned_synthetic` (Stage 10).

### 2.3 DoD
`SELECT count(*) FROM cases;` is about 350-450; active cases that share an `issue_key` exist; every case has an embedding (`SELECT count(*) FROM cases WHERE embedding IS NULL;` returns 0).

---

## Stage 3: Backend core API

### 3.1 `app/config.py`

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str = "postgresql+psycopg://aicte:aicte@localhost:5432/aicte"
    jwt_secret: str = "dev-secret-change-me"
    jwt_alg: str = "HS256"
    jwt_minutes: int = 480
    storage_backend: str = "local"            # local | s3
    local_storage_dir: str = "./storage"
    s3_bucket: str | None = None
    embed_model: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    embed_dim: int = 384

settings = Settings()
```

### 3.2 `app/db.py`

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### 3.3 `app/services/embeddings.py`

```python
from functools import lru_cache
from fastembed import TextEmbedding
from ..config import settings

@lru_cache(maxsize=1)
def _model() -> TextEmbedding:
    # Downloads the model on first run, then works offline from cache.
    # Verify the model name is supported by your installed fastembed version.
    return TextEmbedding(model_name=settings.embed_model)

def embed_many(texts: list[str]) -> list[list[float]]:
    return [v.tolist() for v in _model().embed(texts)]

def embed_one(text_: str) -> list[float]:
    return embed_many([text_])[0]

def vec_literal(v: list[float]) -> str:
    return "[" + ",".join(f"{x:.6f}" for x in v) + "]"
```

### 3.4 `app/auth.py`

```python
from datetime import datetime, timedelta, timezone
import bcrypt, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import text
from .config import settings
from .db import get_db

oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def make_token(officer_id: int, role: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_minutes)
    return jwt.encode({"sub": str(officer_id), "role": role, "exp": exp}, settings.jwt_secret, settings.jwt_alg)

def current_user(token: str = Depends(oauth2), db=Depends(get_db)):
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_alg])
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    row = db.execute(text(
        "SELECT id, username, full_name, role, bureau_id, region FROM officers WHERE id=:i AND active"),
        {"i": int(payload["sub"])}).mappings().first()
    if not row:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Unknown user")
    return dict(row)

def require_roles(*roles: str):
    def dep(user=Depends(current_user)):
        if user["role"] not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not allowed")
        return user
    return dep

def scope_clause(user: dict) -> tuple[str, dict]:
    """Row-level scoping: regional officers see only their region's institutions."""
    if user["role"] == "regional" and user.get("region"):
        return " AND i.region = :scope_region", {"scope_region": user["region"]}
    return "", {}
```

### 3.5 `app/routers/auth.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import text
from ..db import get_db
from ..auth import verify_password, make_token, current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db=Depends(get_db)):
    row = db.execute(text("SELECT id, password_hash, role FROM officers WHERE username=:u AND active"),
                     {"u": form.username}).first()
    if not row or not verify_password(form.password, row.password_hash):
        raise HTTPException(401, "Invalid credentials")
    return {"access_token": make_token(row.id, row.role), "token_type": "bearer"}

@router.get("/me")
def me(user=Depends(current_user)):
    return user
```

### 3.6 `app/routers/cases.py` (list, detail, create, action)

```python
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text
from ..db import get_db
from ..auth import current_user, scope_clause
from ..services.embeddings import embed_one, vec_literal
from ..services.resolution import resolve_institution
from ..services.overlap import scan_overlaps
from ..config import settings

router = APIRouter(prefix="/api/cases", tags=["cases"])

@router.get("")
def list_cases(
    q: str | None = None, institution: str | None = None, aicte_id: str | None = None,
    bureau: str | None = None, region: str | None = None, category: str | None = None,
    status: str | None = None, date_from: date | None = None, date_to: date | None = None,
    overdue: bool = False, limit: int = Query(50, le=200), offset: int = 0,
    db=Depends(get_db), user=Depends(current_user)):
    where, p = ["1=1"], {"limit": limit, "offset": offset}
    if q:           where.append("(c.case_ref ILIKE :q OR to_tsvector('simple', c.description) @@ plainto_tsquery('simple', :qt))"); p.update(q=f"%{q}%", qt=q)
    if institution: where.append("i.normalized_name % :inst OR i.name ILIKE :instl"); p.update(inst=institution.lower(), instl=f"%{institution}%")
    if aicte_id:    where.append("i.aicte_permanent_id = :aid"); p["aid"] = aicte_id
    if bureau:      where.append("b.code = :bureau"); p["bureau"] = bureau
    if region:      where.append("i.region = :region"); p["region"] = region
    if category:    where.append("c.category = :cat"); p["cat"] = category
    if status:      where.append("c.status = :status"); p["status"] = status
    if date_from:   where.append("c.received_date >= :df"); p["df"] = date_from
    if date_to:     where.append("c.received_date <= :dt"); p["dt"] = date_to
    if overdue:     where.append("c.closed_date IS NULL AND c.sla_due_date < CURRENT_DATE")
    sc, sp = scope_clause(user); p.update(sp)
    sql = f"""
      SELECT c.id, c.case_ref, c.category, c.status, c.received_date, c.sla_due_date, c.closed_date,
             c.priority, c.sensitivity_flag, c.hold_parallel, c.next_action,
             i.id AS institution_id, i.name AS institution, i.aicte_permanent_id, i.region,
             b.code AS bureau, o.full_name AS officer,
             (c.closed_date IS NULL AND c.sla_due_date < CURRENT_DATE) AS overdue,
             (SELECT count(*) FROM overlap_links l WHERE (l.case_a=c.id OR l.case_b=c.id)
                AND l.status='suggested' AND l.level='high') AS open_high_overlaps
      FROM cases c JOIN institutions i ON i.id=c.institution_id
      JOIN bureaus b ON b.id=c.bureau_id LEFT JOIN officers o ON o.id=c.officer_id
      WHERE {' AND '.join(where)} {sc}
      ORDER BY c.received_date DESC LIMIT :limit OFFSET :offset"""
    return [dict(r) for r in db.execute(text(sql), p).mappings()]

@router.get("/{case_id}")
def case_detail(case_id: int, db=Depends(get_db), user=Depends(current_user)):
    c = db.execute(text("""
        SELECT c.*, i.name AS institution, i.aicte_permanent_id, i.region, b.code AS bureau, b.name AS bureau_name,
               o.full_name AS officer
        FROM cases c JOIN institutions i ON i.id=c.institution_id JOIN bureaus b ON b.id=c.bureau_id
        LEFT JOIN officers o ON o.id=c.officer_id WHERE c.id=:i"""), {"i": case_id}).mappings().first()
    if not c: raise HTTPException(404, "Case not found")
    c = {k: v for k, v in dict(c).items() if k != "embedding"}
    actions = [dict(r) for r in db.execute(text("""
        SELECT a.id, a.action_type, a.remarks, a.meta, a.created_at, b.code AS bureau, o.full_name AS officer
        FROM actions a LEFT JOIN bureaus b ON b.id=a.bureau_id LEFT JOIN officers o ON o.id=a.officer_id
        WHERE a.case_id=:i ORDER BY a.created_at"""), {"i": case_id}).mappings()]
    overlaps = [dict(r) for r in db.execute(text("""
        SELECT l.*, (CASE WHEN l.case_a=:i THEN l.case_b ELSE l.case_a END) AS other_case_id
        FROM overlap_links l WHERE l.case_a=:i OR l.case_b=:i ORDER BY l.probability DESC"""), {"i": case_id}).mappings()]
    # Pre-action check: other ACTIVE cases on the same institution
    siblings = [dict(r) for r in db.execute(text("""
        SELECT c2.id, c2.case_ref, c2.category, c2.status, b.code AS bureau
        FROM cases c2 JOIN bureaus b ON b.id=c2.bureau_id
        WHERE c2.institution_id=:inst AND c2.id<>:i AND c2.closed_date IS NULL"""),
        {"inst": c["institution_id"], "i": case_id}).mappings()]
    return {"case": c, "actions": actions, "overlaps": overlaps, "active_siblings": siblings}

class CaseIn(BaseModel):
    institution_name: str
    aicte_id: str | None = None
    city: str | None = None
    category: str
    description: str
    bureau_code: str
    sensitive: bool = False

@router.post("", status_code=201)
def create_case(body: CaseIn, db=Depends(get_db), user=Depends(current_user)):
    inst_id, conf, needs_review = resolve_institution(db, body.aicte_id, body.institution_name, body.city)
    if inst_id is None:
        raise HTTPException(422, "Institution could not be resolved; pick one manually")
    bureau_id = db.execute(text("SELECT id FROM bureaus WHERE code=:c"), {"c": body.bureau_code}).scalar()
    sla = db.execute(text("SELECT deadline_days FROM sla_rules WHERE category=:c"), {"c": body.category}).scalar() or 30
    vec = embed_one(body.description)
    cid = db.execute(text("""
        INSERT INTO cases (institution_id,inst_match_conf,category,description,received_date,status,bureau_id,officer_id,
                           sla_due_date,sensitivity_flag,embedding,embedding_model)
        VALUES (:i,:conf,:cat,:d,CURRENT_DATE,'registered',:b,:o,:due,:sens,CAST(:v AS vector),:m) RETURNING id"""),
        {"i": inst_id, "conf": conf, "cat": body.category, "d": body.description, "b": bureau_id,
         "o": user["id"], "due": date.today() + timedelta(days=sla), "sens": body.sensitive,
         "v": vec_literal(vec), "m": settings.embed_model}).scalar()
    db.execute(text("UPDATE cases SET case_ref='CASE-'||lpad(id::text,6,'0') WHERE id=:i"), {"i": cid})
    db.execute(text("INSERT INTO actions (case_id,bureau_id,officer_id,action_type,remarks) "
                    "VALUES (:c,:b,:o,'registered','Case registered')"), {"c": cid, "b": bureau_id, "o": user["id"]})
    overlaps = scan_overlaps(db, cid)
    db.commit()
    return {"id": cid, "institution_review_needed": needs_review, "overlaps": overlaps}

class ActionIn(BaseModel):
    action_type: str
    remarks: str | None = None
    new_status: str | None = None
    transfer_to: str | None = None   # bureau code

@router.post("/{case_id}/actions", status_code=201)
def add_action(case_id: int, body: ActionIn, db=Depends(get_db), user=Depends(current_user)):
    bureau_id = user["bureau_id"] or db.execute(text("SELECT bureau_id FROM cases WHERE id=:i"), {"i": case_id}).scalar()
    meta = {}
    if body.transfer_to:
        tb = db.execute(text("SELECT id FROM bureaus WHERE code=:c"), {"c": body.transfer_to}).scalar()
        db.execute(text("UPDATE cases SET bureau_id=:b, status='transferred', updated_at=now() WHERE id=:i"), {"b": tb, "i": case_id})
        meta = {"transferred_to": body.transfer_to}
    if body.new_status:
        closed = ", closed_date=CURRENT_DATE" if body.new_status == "disposed" else ""
        db.execute(text(f"UPDATE cases SET status=:s{closed}, updated_at=now() WHERE id=:i"), {"s": body.new_status, "i": case_id})
    db.execute(text("INSERT INTO actions (case_id,bureau_id,officer_id,action_type,remarks,meta) "
                    "VALUES (:c,:b,:o,:t,:r,CAST(:m AS jsonb))"),
               {"c": case_id, "b": bureau_id, "o": user["id"], "t": body.action_type, "r": body.remarks,
                "m": __import__("json").dumps(meta)})
    db.commit()
    return {"ok": True}
```

### 3.7 Dashboard statistics (add to `routers/reports.py`)

```python
from fastapi import APIRouter, Depends
from sqlalchemy import text
from ..db import get_db
from ..auth import current_user, scope_clause

router = APIRouter(prefix="/api", tags=["dashboard"])

@router.get("/dashboard")
def dashboard(db=Depends(get_db), user=Depends(current_user)):
    sc, sp = scope_clause(user)
    base = f"FROM cases c JOIN institutions i ON i.id=c.institution_id WHERE 1=1 {sc}"
    kpi = db.execute(text(f"""
        SELECT count(*) AS total,
               count(*) FILTER (WHERE status IN ('received','registered','assigned')) AS pending,
               count(*) FILTER (WHERE status IN ('under_process','action_taken','reopened')) AS under_process,
               count(*) FILTER (WHERE status='disposed') AS disposed,
               count(*) FILTER (WHERE status='transferred') AS transferred,
               count(*) FILTER (WHERE status='escalated') AS escalated,
               count(*) FILTER (WHERE closed_date IS NULL AND sla_due_date < CURRENT_DATE) AS overdue
        {base}"""), sp).mappings().one()
    by_bureau = db.execute(text(f"""
        SELECT b.code AS bureau,
               count(*) FILTER (WHERE c.closed_date IS NULL) AS open,
               count(*) FILTER (WHERE c.closed_date IS NOT NULL) AS closed
        FROM cases c JOIN institutions i ON i.id=c.institution_id JOIN bureaus b ON b.id=c.bureau_id
        WHERE 1=1 {sc} GROUP BY b.code ORDER BY open DESC"""), sp).mappings().all()
    by_region = db.execute(text(f"""
        SELECT i.region, count(*) FILTER (WHERE c.closed_date IS NULL) AS open
        FROM cases c JOIN institutions i ON i.id=c.institution_id WHERE 1=1 {sc}
        GROUP BY i.region"""), sp).mappings().all()
    overlaps = db.execute(text("""
        SELECT count(*) FILTER (WHERE level='high' AND status='suggested') AS high_open,
               count(*) FILTER (WHERE level='medium' AND status='suggested') AS medium_open
        FROM overlap_links""")).mappings().one()
    return {"kpi": dict(kpi), "by_bureau": [dict(r) for r in by_bureau],
            "by_region": [dict(r) for r in by_region], "overlaps": dict(overlaps)}
```

### 3.8 `app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth, cases, institutions, overlaps, alerts, reports, admin

app = FastAPI(title="AICTE Complaint Dashboard API")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
for r in (auth, cases, institutions, overlaps, alerts, reports, admin):
    app.include_router(r.router)

@app.get("/api/health")
def health():
    return {"ok": True}
```

(For Stage 3, create the other routers as empty `router = APIRouter(prefix=..., tags=[...])` placeholders and fill them in later stages.)

### 3.9 Run

```bash
cd backend
uvicorn app.main:app --reload --port 8000
# Interactive docs: http://localhost:8000/docs
```

### 3.10 DoD
Login at `/docs` with `rb1 / demo123` works; `GET /api/dashboard` returns KPIs; `GET /api/cases?bureau=RB&status=under_process` filters correctly; regional user `south1` sees only the South region.

---

## Stage 4: Frontend shell and dashboard

### 4.1 Create the app

```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install
npm install @tanstack/react-query @tanstack/react-table react-router-dom recharts zod react-hook-form
npm install tailwindcss @tailwindcss/vite
npx shadcn@latest init        # follow prompts; verify current CLI instructions in the shadcn docs
npx shadcn@latest add button card badge table input select dialog tabs
```

`vite.config.ts` (API proxy so the browser never needs CORS in dev):

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: { proxy: { "/api": "http://localhost:8000" } },
});
```

`src/index.css`: `@import "tailwindcss";`

> Tailwind and shadcn setup steps change between versions. Follow their current official install guides for Vite if a command differs.

### 4.2 `src/lib/api.ts`

```ts
const BASE = import.meta.env.VITE_API_URL ?? "/api";

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (res.status === 401) { localStorage.removeItem("token"); window.location.href = "/login"; }
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export async function login(username: string, password: string) {
  const body = new URLSearchParams({ username, password });
  const res = await fetch(`${BASE}/auth/login`, { method: "POST", body });
  if (!res.ok) throw new Error("Invalid credentials");
  const data = await res.json();
  localStorage.setItem("token", data.access_token);
}
```

### 4.3 `src/main.tsx` (providers and routes)

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Cases from "./pages/Cases";
import CaseDetail from "./pages/CaseDetail";
import Institution from "./pages/Institution";
import Overlaps from "./pages/Overlaps";
import Alerts from "./pages/Alerts";
import Reports from "./pages/Reports";
import Admin from "./pages/Admin";

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 5_000, refetchInterval: 15_000 } } });
// refetchInterval gives the "real-time" feel without WebSockets.

const Guard = ({ children }: { children: React.ReactNode }) =>
  localStorage.getItem("token") ? <>{children}</> : <Navigate to="/login" replace />;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={qc}>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Guard><Layout /></Guard>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/cases" element={<Cases />} />
          <Route path="/cases/:id" element={<CaseDetail />} />
          <Route path="/institutions/:id" element={<Institution />} />
          <Route path="/overlaps" element={<Overlaps />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/admin" element={<Admin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);
```

### 4.4 `src/pages/Dashboard.tsx` (KPIs and charts)

```tsx
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/lib/api";

type Dash = {
  kpi: Record<"total"|"pending"|"under_process"|"disposed"|"transferred"|"escalated"|"overdue", number>;
  by_bureau: { bureau: string; open: number; closed: number }[];
  by_region: { region: string; open: number }[];
  overlaps: { high_open: number; medium_open: number };
};

const KPIS: [keyof Dash["kpi"], string][] = [
  ["total","Total received"],["pending","Pending"],["under_process","Under process"],
  ["disposed","Disposed"],["transferred","Transferred"],["overdue","Beyond timeline"],
];

export default function Dashboard() {
  const { data } = useQuery({ queryKey: ["dash"], queryFn: () => api<Dash>("/dashboard") });
  if (!data) return <p className="p-6">Loading…</p>;
  return (
    <div className="p-6 space-y-6">
      {data.overlaps.high_open > 0 && (
        <a href="/overlaps" className="block rounded-lg border border-amber-400 bg-amber-50 p-4 text-amber-900">
          ⚠ {data.overlaps.high_open} potential overlapping cases – coordination required
        </a>
      )}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {KPIS.map(([k, label]) => (
          <div key={k} className="rounded-xl border p-4 shadow-sm">
            <div className="text-sm text-gray-500">{label}</div>
            <div className="text-3xl font-semibold">{data.kpi[k]}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border p-4">
        <h3 className="font-medium mb-2">Bureau/Cell workload</h3>
        <div style={{ height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={data.by_bureau}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="bureau" /><YAxis /><Tooltip /><Legend />
              <Bar dataKey="open" stackId="a" name="Open" fill="#2563eb" />
              <Bar dataKey="closed" stackId="a" name="Closed" fill="#94a3b8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
```

### 4.5 Layout and the mode status bar

`Layout.tsx` contains the sidebar (Dashboard, Cases, Overlaps, Alerts, Reports, Admin) and a top `ModeBar` (built in Stage 9). Keep fonts and map assets **bundled locally** (never CDN links), so offline mode works.

### 4.6 DoD
Login page works for `rb1`; dashboard shows live KPIs; numbers change after you disposing of a case through the API; layout responsive at laptop width.

---

## Stage 5: Case list, case detail, institution 360

### 5.1 Pages to build

| Page | Content | Backend |
|---|---|---|
| **Cases** | TanStack Table with filters: search, bureau, region, category, status, date range, overdue toggle; SLA and overlap badges | `GET /api/cases` |
| **CaseDetail** | Header (ref, institution, bureau, officer, status, SLA due, next action); **pre-action banner** listing other active cases of the same institution; **timeline** of actions; add-action form (remark, transfer, status change, document); linked/overlap panel | `GET /api/cases/{id}`, `POST /api/cases/{id}/actions` |
| **Institution** | Profile (ID, name, address, region); all cases from all Bureaus/Cells; repeat-category chips; overlap history | `GET /api/institutions/{id}` |

### 5.2 `routers/institutions.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from ..db import get_db
from ..auth import current_user

router = APIRouter(prefix="/api/institutions", tags=["institutions"])

@router.get("/search")
def search(q: str, db=Depends(get_db), user=Depends(current_user)):
    rows = db.execute(text("""
        SELECT id, name, aicte_permanent_id, city, region,
               GREATEST(similarity(normalized_name, lower(:q)), (aicte_permanent_id = :q)::int) AS score
        FROM institutions
        WHERE normalized_name % lower(:q) OR name ILIKE :like OR aicte_permanent_id = :q
        ORDER BY score DESC LIMIT 15"""), {"q": q, "like": f"%{q}%"}).mappings().all()
    return [dict(r) for r in rows]

@router.get("/{inst_id}")
def get_institution(inst_id: int, db=Depends(get_db), user=Depends(current_user)):
    inst = db.execute(text("SELECT * FROM institutions WHERE id=:i"), {"i": inst_id}).mappings().first()
    if not inst: raise HTTPException(404)
    cases = [dict(r) for r in db.execute(text("""
        SELECT c.id, c.case_ref, c.category, c.status, c.received_date, c.closed_date, b.code AS bureau
        FROM cases c JOIN bureaus b ON b.id=c.bureau_id WHERE c.institution_id=:i
        ORDER BY c.received_date DESC"""), {"i": inst_id}).mappings()]
    repeats = [dict(r) for r in db.execute(text("""
        SELECT category, count(*) AS n FROM cases WHERE institution_id=:i GROUP BY category HAVING count(*)>1
        ORDER BY n DESC"""), {"i": inst_id}).mappings()]
    return {"institution": dict(inst), "cases": cases, "repeat_categories": repeats}
```

### 5.3 Timeline component (shape)

```tsx
type Action = { id:number; action_type:string; remarks?:string; created_at:string; bureau?:string; officer?:string };
export function Timeline({ actions }: { actions: Action[] }) {
  return (
    <ol className="relative border-l pl-6 space-y-4">
      {actions.map(a => (
        <li key={a.id}>
          <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-blue-600" />
          <div className="text-sm font-medium">{a.action_type.replace("_"," ")} · {a.bureau ?? "-"}</div>
          <div className="text-xs text-gray-500">{a.officer} · {new Date(a.created_at).toLocaleString()}</div>
          {a.remarks && <div className="text-sm mt-1">{a.remarks}</div>}
        </li>
      ))}
    </ol>
  );
}
```

### 5.4 DoD
Every PS filter (name, AICTE ID, case ID, bureau, region, category, status, date range) works from the UI; timeline shows transfers and escalations; the institution page lists cases from RB and PGRC together.

---

## Stage 6: Overlap engine (the innovation)

This stage has four parts: **resolution**, **features**, **training**, **scan**.

### 6.1 Institution resolution `services/resolution.py`

Answers: "which institution is this complaint about?" Parameters (`AUTO`, `REVIEW`) start as `default_pending_data` and are tuned in Stage 10.

```python
import math, re
from collections import Counter
from functools import lru_cache
from sqlalchemy import text

AUTO_ACCEPT = 0.85    # registry: origin=default_pending_data until tuned (Stage 10)
REVIEW_FLOOR = 0.55

ABBR = [(r"\bgovt\.?\b","government"),(r"\bengg\.?\b","engineering"),(r"\binst\.?\b","institute"),(r"\btech\.?\b","technology")]

def normalize(s: str) -> str:
    s = s.lower()
    for pat, rep in ABBR: s = re.sub(pat, rep, s)
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()

def _tokens(s: str) -> list[str]:
    return normalize(s).split()

def idf_table(db) -> dict[str, float]:
    """Token rarity from the institution master list: generic words like 'college' get low weight AUTOMATICALLY."""
    rows = db.execute(text("SELECT normalized_name FROM institutions")).scalars().all()
    n = len(rows) or 1
    df = Counter(t for r in rows for t in set(r.split()))
    return {t: math.log((n + 1) / (c + 1)) + 1.0 for t, c in df.items()}

def idf_overlap(a: list[str], b: list[str], idf: dict[str, float]) -> float:
    sa, sb = set(a), set(b)
    if not sa or not sb: return 0.0
    w = lambda t: idf.get(t, math.log(2) + 1.0)
    inter = sum(w(t) for t in sa & sb)
    union = sum(w(t) for t in sa | sb)
    return inter / union if union else 0.0

def resolve_institution(db, aicte_id: str | None, name: str, city: str | None):
    """Returns (institution_id | None, confidence, needs_review)."""
    if aicte_id:
        row = db.execute(text("SELECT id FROM institutions WHERE aicte_permanent_id=:a"), {"a": aicte_id}).first()
        if row: return row.id, 1.0, False
    nn = normalize(name)
    cands = db.execute(text("""
        SELECT id, normalized_name, city, similarity(normalized_name, :n) AS trgm
        FROM institutions WHERE normalized_name % :n ORDER BY trgm DESC LIMIT 5"""), {"n": nn}).mappings().all()
    if not cands: return None, 0.0, True
    idf = idf_table(db)
    best, best_score = None, 0.0
    for c in cands:
        tok = idf_overlap(_tokens(name), c["normalized_name"].split(), idf)
        city_bonus = 0.1 if city and c["city"] and city.lower() == c["city"].lower() else 0.0
        score = min(1.0, 0.5 * c["trgm"] + 0.5 * tok + city_bonus)
        if score > best_score: best, best_score = c["id"], score
    if best_score >= AUTO_ACCEPT: return best, best_score, False
    if best_score >= REVIEW_FLOOR: return best, best_score, True
    return None, best_score, True
```

> **Upgrade path:** replace the hand-weighted blend with **Splink** (Fellegi-Sunter, EM-estimated parameters, term-frequency adjustment). The function signature stays the same. Do this only if time allows. The IDF weighting above is already data-derived.

### 6.2 Feature builder `services/features.py` (shared by training and runtime)

```python
import math
from datetime import date

FEATURES = ["inst_conf", "cos", "same_category", "log_days", "both_active", "cross_bureau"]

def pair_features(a: dict, b: dict, cos: float) -> list[float]:
    """a, b: dicts with category, bureau_id, closed_date, received_date, inst_match_conf."""
    days = abs((a["received_date"] - b["received_date"]).days)
    return [
        min(a["inst_match_conf"], b["inst_match_conf"]),
        cos,
        1.0 if a["category"] == b["category"] else 0.0,
        math.log1p(days),
        1.0 if (a["closed_date"] is None and b["closed_date"] is None) else 0.0,
        1.0 if a["bureau_id"] != b["bureau_id"] else 0.0,
    ]
```

### 6.3 Training `ml/train_overlap.py`

Learns weights and thresholds from labelled pairs (labels come from `issue_key` in seed data; in production they come from officer confirm/dismiss decisions). **Split by institution** to avoid leakage.

```python
"""Run from backend/:  python -m ml.train_overlap"""
import json, itertools, datetime
from collections import defaultdict
import numpy as np, joblib
from sqlalchemy import text
from sklearn.calibration import CalibratedClassifierCV
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import average_precision_score, precision_recall_curve
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from app.db import engine
from app.services.features import FEATURES, pair_features

TARGET_PRECISION_HIGH = 0.90   # policy choice: false alarms cause alert fatigue
TARGET_RECALL_MEDIUM  = 0.90   # policy choice: do not miss related cases at the 'medium' level

def load_pairs():
    with engine.connect() as c:
        rows = c.execute(text("""SELECT id, institution_id, category, bureau_id, closed_date, received_date,
                                        inst_match_conf, issue_key, embedding::text AS emb FROM cases
                                 WHERE embedding IS NOT NULL""")).mappings().all()
    by_inst = defaultdict(list)
    for r in rows:
        d = dict(r); d["vec"] = np.array(json.loads(d["emb"])); by_inst[d["institution_id"]].append(d)
    X, y, g = [], [], []
    for inst, cs in by_inst.items():
        for a, b in itertools.combinations(cs, 2):
            cos = float(a["vec"] @ b["vec"] / (np.linalg.norm(a["vec"]) * np.linalg.norm(b["vec"])))
            X.append(pair_features(a, b, cos)); y.append(int(a["issue_key"] == b["issue_key"])); g.append(inst)
    return np.array(X), np.array(y), np.array(g)

def main():
    X, y, g = load_pairs()
    print(f"pairs={len(y)} positives={y.sum()} ({y.mean():.1%})")
    tr, te = next(GroupShuffleSplit(n_splits=1, test_size=0.3, random_state=7).split(X, y, g))
    pipe = make_pipeline(StandardScaler(), LogisticRegression(class_weight="balanced", max_iter=1000))
    cal = CalibratedClassifierCV(pipe, method="sigmoid", cv=5).fit(X[tr], y[tr])
    explain = make_pipeline(StandardScaler(), LogisticRegression(class_weight="balanced", max_iter=1000)).fit(X[tr], y[tr])

    p = cal.predict_proba(X[te])[:, 1]
    prec, rec, thr = precision_recall_curve(y[te], p)
    # lowest threshold meeting target precision -> HIGH ; highest threshold meeting target recall -> MEDIUM
    ok_hi = [t for pr, t in zip(prec[:-1], thr) if pr >= TARGET_PRECISION_HIGH]
    ok_me = [t for rc, t in zip(rec[:-1], thr) if rc >= TARGET_RECALL_MEDIUM]
    t_high = float(min(ok_hi)) if ok_hi else 0.9
    t_med  = float(max(ok_me)) if ok_me else 0.5
    t_med  = min(t_med, t_high)

    def at(t):
        pred = p >= t
        tp = int((pred & (y[te] == 1)).sum())
        return {"precision": tp / max(1, int(pred.sum())), "recall": tp / max(1, int(y[te].sum())), "flagged": int(pred.sum())}

    metrics = {"pr_auc": float(average_precision_score(y[te], p)), "high": at(t_high), "medium": at(t_med),
               "n_train": int(len(tr)), "n_test": int(len(te)), "split": "grouped by institution"}
    version = "overlap-" + datetime.datetime.now().strftime("%Y%m%d-%H%M")
    joblib.dump({"calibrated": cal, "explain": explain, "features": FEATURES, "t_high": t_high, "t_med": t_med,
                 "version": version}, f"ml/artifacts/{version}.joblib")
    joblib.dump(version, "ml/artifacts/ACTIVE")   # pointer; use shadow mode in Stage 10 before promoting

    with engine.begin() as c:
        c.execute(text("INSERT INTO model_versions (id,kind,trained_on,metrics,status) VALUES (:i,'overlap',:t,CAST(:m AS jsonb),'active')"),
                  {"i": version, "t": "synthetic seed v1", "m": json.dumps(metrics)})
        for name, val in [("overlap_threshold_high", t_high), ("overlap_threshold_medium", t_med)]:
            c.execute(text("""INSERT INTO parameter_registry (parameter,value,origin,derived_from,metrics,model_version)
                              VALUES (:p,:v,'learned_synthetic',:d,CAST(:m AS jsonb),:mv)"""),
                      {"p": name, "v": f"{val:.4f}", "d": f"target precision {TARGET_PRECISION_HIGH} / recall {TARGET_RECALL_MEDIUM}",
                       "m": json.dumps(metrics), "mv": version})
    print(json.dumps(metrics, indent=2)); print("t_high", t_high, "t_med", t_med)

if __name__ == "__main__":
    main()
```

Run: `python -m scripts.seed && python -m ml.train_overlap`.

> If the test split has no pair reaching 0.90 precision, the script falls back to 0.9 and you should see that in the metrics. That is a sign your seed data is too noisy or too easy. Look at the pairs before trusting numbers.

### 6.4 Scan `services/overlap.py`

```python
import json, joblib
from pathlib import Path
from sqlalchemy import text
from .features import pair_features
from .routing import explain_overlap

ART = Path("ml/artifacts")
_cache: dict = {}

def load_model():
    if "m" not in _cache:
        ptr = ART / "ACTIVE"
        if not ptr.exists(): return None
        _cache["m"] = joblib.load(ART / f"{joblib.load(ptr)}.joblib")
    return _cache["m"]

def score_pair(m, a: dict, b: dict, cos: float):
    x = [pair_features(a, b, cos)]
    p = float(m["calibrated"].predict_proba(x)[0, 1]) if m else cos     # untrained fallback: cosine only (labelled in UI)
    breakdown = {}
    if m:
        scaler, lr = m["explain"].steps[0][1], m["explain"].steps[1][1]
        contrib = (scaler.transform(x)[0] * lr.coef_[0]).tolist()
        breakdown = {f: {"value": round(v, 3), "contribution": round(cn, 3)}
                     for f, v, cn in zip(m["features"], x[0], contrib)}
    return p, breakdown

def classify(m, p, a, b):
    t_high = m["t_high"] if m else 0.85
    t_med  = m["t_med"]  if m else 0.6
    both_active = a["closed_date"] is None and b["closed_date"] is None
    if p >= t_high and both_active and a["bureau_id"] != b["bureau_id"]: return "high"
    if p >= t_med and both_active: return "medium"
    if p >= t_med: return "info"
    return None

def scan_overlaps(db, case_id: int):
    m = load_model()
    me = db.execute(text("SELECT id,institution_id,category,bureau_id,closed_date,received_date,inst_match_conf,sensitivity_flag "
                         "FROM cases WHERE id=:i"), {"i": case_id}).mappings().one()
    others = db.execute(text("""
        SELECT c.id,c.category,c.bureau_id,c.closed_date,c.received_date,c.inst_match_conf,c.case_ref,
               1 - (c.embedding <=> (SELECT embedding FROM cases WHERE id=:i)) AS cos
        FROM cases c WHERE c.institution_id=:inst AND c.id<>:i AND c.embedding IS NOT NULL"""),
        {"i": case_id, "inst": me["institution_id"]}).mappings().all()
    found = []
    for o in others:
        o = dict(o)
        p, breakdown = score_pair(m, dict(me), o, float(o["cos"]))
        level = classify(m, p, dict(me), o)
        if not level: continue
        a_id, b_id = sorted((case_id, o["id"]))
        text_, src = explain_overlap(db, breakdown, dict(me), o, sensitive=bool(me["sensitivity_flag"]))
        row = db.execute(text("""
            INSERT INTO overlap_links (case_a,case_b,level,probability,breakdown,model_version,explanation,explanation_src)
            VALUES (:a,:b,:l,:p,CAST(:bd AS jsonb),:mv,:ex,:src)
            ON CONFLICT (case_a,case_b) DO NOTHING RETURNING id"""),
            {"a": a_id, "b": b_id, "l": level, "p": p, "bd": json.dumps(breakdown),
             "mv": m["version"] if m else "untrained", "ex": text_, "src": src}).first()
        if row and level in ("high", "medium"):
            for bureau in {me["bureau_id"], o["bureau_id"]}:
                db.execute(text("INSERT INTO alerts (kind,case_id,overlap_id,bureau_id,message) VALUES (:k,:c,:o,:b,:m)"),
                           {"k": f"overlap_{level}", "c": case_id, "o": row.id, "b": bureau,
                            "m": "Potential Overlapping Cases – Coordination Required" if level == "high"
                                 else "Related cases found for the same institution"})
        found.append({"other": o["id"], "level": level, "p": round(p, 3)})
    return found
```

### 6.5 Quick manual test

```bash
python -m scripts.seed
python -m ml.train_overlap
uvicorn app.main:app --reload
# In /docs: POST /api/cases with a worded-differently complaint for an institution that already has an active PGRC case
```

### 6.6 DoD
Training prints metrics; a new RB complaint worded differently from an existing PGRC complaint on the same institution produces a **high** overlap with a feature breakdown; a hard-negative pair (same institution, different issue) does **not** produce high.

---

## Stage 7: Coordination and alerts

### 7.1 `routers/overlaps.py`

```python
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from ..db import get_db
from ..auth import current_user

router = APIRouter(prefix="/api/overlaps", tags=["overlaps"])

@router.get("")
def list_overlaps(status: str = "suggested", level: str | None = None, db=Depends(get_db), user=Depends(current_user)):
    sql = """
      SELECT l.id, l.level, l.probability, l.breakdown, l.status, l.lead_bureau_id, l.explanation, l.explanation_src, l.model_version,
             i.id AS institution_id, i.name AS institution,
             ca.id AS a_id, ca.case_ref AS a_ref, ca.category AS a_cat, ba.code AS a_bureau, ca.description AS a_desc, ca.status AS a_status,
             cb.id AS b_id, cb.case_ref AS b_ref, cb.category AS b_cat, bb.code AS b_bureau, cb.description AS b_desc, cb.status AS b_status
      FROM overlap_links l
      JOIN cases ca ON ca.id=l.case_a JOIN cases cb ON cb.id=l.case_b
      JOIN institutions i ON i.id=ca.institution_id
      JOIN bureaus ba ON ba.id=ca.bureau_id JOIN bureaus bb ON bb.id=cb.bureau_id
      WHERE l.status=:s AND (:lvl IS NULL OR l.level=:lvl)
      ORDER BY (l.level='high') DESC, l.probability DESC LIMIT 100"""
    return [dict(r) for r in db.execute(text(sql), {"s": status, "lvl": level}).mappings()]

class Decision(BaseModel):
    decision: str                 # link | dismiss
    lead_bureau: str | None = None
    hold_other: bool = False
    reason: str | None = None

@router.post("/{overlap_id}/decide")
def decide(overlap_id: int, body: Decision, db=Depends(get_db), user=Depends(current_user)):
    l = db.execute(text("SELECT * FROM overlap_links WHERE id=:i"), {"i": overlap_id}).mappings().first()
    if not l: raise HTTPException(404)
    if body.decision == "dismiss":
        if not body.reason: raise HTTPException(422, "A reason is required to dismiss")   # becomes a training label
        db.execute(text("UPDATE overlap_links SET status='dismissed', decided_by=:u, decision_reason=:r WHERE id=:i"),
                   {"u": user["id"], "r": body.reason, "i": overlap_id})
    elif body.decision == "link":
        lead = db.execute(text("SELECT id FROM bureaus WHERE code=:c"), {"c": body.lead_bureau}).scalar() if body.lead_bureau else None
        db.execute(text("UPDATE overlap_links SET status='confirmed', lead_bureau_id=:b, decided_by=:u, decision_reason=:r WHERE id=:i"),
                   {"b": lead, "u": user["id"], "r": body.reason, "i": overlap_id})
        if body.hold_other and lead:
            # hold parallel action on the case NOT owned by the lead bureau
            db.execute(text("""UPDATE cases SET hold_parallel=TRUE WHERE id IN (:a,:b) AND bureau_id<>:lead"""),
                       {"a": l["case_a"], "b": l["case_b"], "lead": lead})
        for cid in (l["case_a"], l["case_b"]):
            db.execute(text("INSERT INTO actions (case_id,bureau_id,officer_id,action_type,remarks,meta) "
                            "VALUES (:c,:b,:o,'link',:r,CAST(:m AS jsonb))"),
                       {"c": cid, "b": user["bureau_id"], "o": user["id"], "r": body.reason or "Cases linked",
                        "m": json.dumps({"overlap_id": overlap_id, "lead": body.lead_bureau, "hold": body.hold_other})})
    else:
        raise HTTPException(422, "decision must be link or dismiss")
    db.execute(text("INSERT INTO audit_log (actor_id,action,entity,entity_id,detail) VALUES (:u,:a,'overlap',:i,CAST(:d AS jsonb))"),
               {"u": user["id"], "a": body.decision, "i": str(overlap_id), "d": json.dumps(body.model_dump())})
    db.commit()
    return {"ok": True}
```

### 7.2 Overlap review component (key UI)

```tsx
type Overlap = {
  id:number; level:"high"|"medium"|"info"; probability:number; institution:string;
  a_ref:string; a_bureau:string; a_cat:string; a_desc:string;
  b_ref:string; b_bureau:string; b_cat:string; b_desc:string;
  breakdown: Record<string,{value:number;contribution:number}>;
  explanation:string; explanation_src:string;
};

export function OverlapCard({ o, onDecide }: { o: Overlap; onDecide: (d: any) => void }) {
  const max = Math.max(0.01, ...Object.values(o.breakdown).map(b => Math.abs(b.contribution)));
  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div className="flex justify-between">
        <div>
          <div className="text-xs uppercase text-amber-700 font-semibold">
            {o.level === "high" ? "Potential Overlapping Cases – Coordination Required" : "Related cases"}
          </div>
          <div className="font-medium">{o.institution}</div>
        </div>
        <div className="text-2xl font-semibold">{Math.round(o.probability * 100)}%</div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {[["a", o.a_ref, o.a_bureau, o.a_cat, o.a_desc], ["b", o.b_ref, o.b_bureau, o.b_cat, o.b_desc]].map(([k, ref, bu, cat, d]) => (
          <div key={k} className="rounded-lg bg-gray-50 p-3 text-sm">
            <div className="font-medium">{ref} · {bu} · {cat}</div><p className="mt-1">{d}</p>
          </div>
        ))}
      </div>
      <div className="space-y-1">
        {Object.entries(o.breakdown).map(([name, b]) => (
          <div key={name} className="flex items-center gap-2 text-xs">
            <span className="w-28 text-gray-600">{name}</span>
            <div className="h-2 flex-1 bg-gray-100 rounded">
              <div className={`h-2 rounded ${b.contribution >= 0 ? "bg-blue-600" : "bg-red-400"}`}
                   style={{ width: `${(Math.abs(b.contribution) / max) * 100}%` }} />
            </div>
            <span className="w-12 text-right">{b.contribution.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <p className="text-sm text-gray-700">{o.explanation} <em className="text-xs">({o.explanation_src})</em></p>
      <div className="flex gap-2">
        <button className="btn" onClick={() => onDecide({ decision: "link", lead_bureau: o.a_bureau, hold_other: true, reason: "Lead nominated" })}>
          Link · lead {o.a_bureau} · hold other
        </button>
        <button className="btn" onClick={() => onDecide({ decision: "link", lead_bureau: o.b_bureau, hold_other: true, reason: "Lead nominated" })}>
          Link · lead {o.b_bureau} · hold other
        </button>
        <button className="btn-outline" onClick={() => { const r = prompt("Reason for dismissing?"); if (r) onDecide({ decision: "dismiss", reason: r }); }}>
          Not related
        </button>
      </div>
    </div>
  );
}
```

### 7.3 Alerts `routers/alerts.py`

```python
from fastapi import APIRouter, Depends
from sqlalchemy import text
from ..db import get_db
from ..auth import current_user

router = APIRouter(prefix="/api/alerts", tags=["alerts"])

@router.get("")
def my_alerts(unread_only: bool = False, db=Depends(get_db), user=Depends(current_user)):
    sql = """SELECT a.*, c.case_ref FROM alerts a LEFT JOIN cases c ON c.id=a.case_id
             WHERE (a.bureau_id = :b OR :b IS NULL)""" + (" AND a.read=FALSE" if unread_only else "") + " ORDER BY a.created_at DESC LIMIT 100"
    return [dict(r) for r in db.execute(text(sql), {"b": user["bureau_id"]}).mappings()]

@router.post("/{alert_id}/read")
def mark_read(alert_id: int, db=Depends(get_db), user=Depends(current_user)):
    db.execute(text("UPDATE alerts SET read=TRUE WHERE id=:i"), {"i": alert_id}); db.commit()
    return {"ok": True}
```

### 7.4 DoD
Review page lists high overlaps first; "Link · lead RB · hold other" sets `hold_parallel` on the PGRC case and writes a `link` action on **both** timelines; dismissing requires a reason and logs to `audit_log`; both bureaus receive an alert.

---

## Stage 8: SLA worker and reports

### 8.1 SLA risk `services/sla.py` (data-driven, not a fixed percentage)

For an open case of age `a` days with SLA deadline `D` days, estimate **P(breach | still open at age a)** from the closed-case history of the same category: `P(T > D | T > a) = count(T > D) / count(T > a)`. Warn when the risk crosses a threshold stored in the parameter registry (initial value `default_pending_data`, tuned in Stage 10).

```python
from sqlalchemy import text

RISK_THRESHOLD = 0.6      # registry: default_pending_data
MIN_HISTORY = 15           # below this, fall back to simple deadline logic and say so

def breach_risk(db, category: str, age_days: int, deadline_days: int):
    r = db.execute(text("""
        WITH d AS (SELECT (closed_date - received_date) AS dur FROM cases
                   WHERE category=:c AND closed_date IS NOT NULL)
        SELECT count(*) FILTER (WHERE dur > :a) AS still_open,
               count(*) FILTER (WHERE dur > :D) AS breached,
               count(*) AS n FROM d"""), {"c": category, "a": age_days, "D": deadline_days}).one()
    if r.n < MIN_HISTORY or r.still_open == 0:
        return None
    return r.breached / r.still_open

def scan_sla(db):
    open_cases = db.execute(text("""
        SELECT c.id, c.case_ref, c.category, c.bureau_id, c.received_date, c.sla_due_date, s.deadline_days, s.escalate_after,
               (CURRENT_DATE - c.received_date) AS age, (CURRENT_DATE - c.sla_due_date) AS overdue_days
        FROM cases c JOIN sla_rules s ON s.category=c.category
        WHERE c.closed_date IS NULL""")).mappings().all()
    created = 0
    for c in open_cases:
        kind = msg = None
        if c["overdue_days"] > c["escalate_after"]:
            kind, msg = "escalation", f"{c['case_ref']} is {c['overdue_days']} days past deadline: escalate"
        elif c["overdue_days"] > 0:
            kind, msg = "sla_breach", f"{c['case_ref']} has breached its timeline"
        else:
            risk = breach_risk(db, c["category"], int(c["age"]), int(c["deadline_days"]))
            if risk is not None and risk >= RISK_THRESHOLD:
                kind, msg = "sla_risk", f"{c['case_ref']}: {risk:.0%} historical breach risk for {c['category']} cases at this age"
        if kind:
            exists = db.execute(text("SELECT 1 FROM alerts WHERE case_id=:c AND kind=:k AND created_at::date=CURRENT_DATE"),
                                {"c": c["id"], "k": kind}).first()
            if not exists:
                db.execute(text("INSERT INTO alerts (kind,case_id,bureau_id,message) VALUES (:k,:c,:b,:m)"),
                           {"k": kind, "c": c["id"], "b": c["bureau_id"], "m": msg}); created += 1
    db.commit(); return created
```

### 8.2 Worker `app/worker.py`

```python
from apscheduler.schedulers.blocking import BlockingScheduler
from .db import SessionLocal
from .services.sla import scan_sla

def job():
    with SessionLocal() as db:
        print("SLA scan created", scan_sla(db), "alerts")

if __name__ == "__main__":
    s = BlockingScheduler()
    s.add_job(job, "interval", minutes=15, next_run_time=None)
    job()               # run once at start
    s.start()
```

Run: `python -m app.worker`

### 8.3 Reports `routers/reports.py` (add)

Required reports and their SQL grouping:

| Report | Query basis |
|---|---|
| Bureau-wise | `GROUP BY bureau` with open/closed/overdue counts |
| Region-wise | `GROUP BY institution.region` |
| Institution history | cases of one institution with timeline summary |
| Ageing | buckets of `CURRENT_DATE - received_date` for open cases: 0-15, 16-30, 31-60, 61-90, 90+ |
| Disposal rate | disposed / received per month |
| Overlaps | `overlap_links` by level and status |
| Monthly/quarterly | `date_trunc('month' or 'quarter', received_date)` |

```python
import io
from fastapi.responses import StreamingResponse
from openpyxl import Workbook

@router.get("/reports/ageing")
def ageing(db=Depends(get_db), user=Depends(current_user)):
    rows = db.execute(text("""
        SELECT CASE WHEN age<=15 THEN '0-15' WHEN age<=30 THEN '16-30' WHEN age<=60 THEN '31-60'
                    WHEN age<=90 THEN '61-90' ELSE '90+' END AS bucket, count(*) AS n
        FROM (SELECT CURRENT_DATE - received_date AS age FROM cases WHERE closed_date IS NULL) t
        GROUP BY 1 ORDER BY min(age)""")).mappings().all()
    return [dict(r) for r in rows]

@router.get("/reports/bureau.xlsx")
def bureau_xlsx(db=Depends(get_db), user=Depends(current_user)):
    rows = db.execute(text("""
        SELECT b.code, count(*) AS total,
               count(*) FILTER (WHERE c.closed_date IS NULL) AS open,
               count(*) FILTER (WHERE c.status='disposed') AS disposed,
               count(*) FILTER (WHERE c.closed_date IS NULL AND c.sla_due_date<CURRENT_DATE) AS overdue
        FROM cases c JOIN bureaus b ON b.id=c.bureau_id GROUP BY b.code ORDER BY b.code""")).all()
    wb = Workbook(); ws = wb.active; ws.append(["Bureau/Cell", "Total", "Open", "Disposed", "Overdue"])
    for r in rows: ws.append(list(r))
    buf = io.BytesIO(); wb.save(buf); buf.seek(0)
    return StreamingResponse(buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                             headers={"Content-Disposition": "attachment; filename=bureau_report.xlsx"})
```

PDF export: use ReportLab `SimpleDocTemplate` + `Table` for one summary report (bureau-wise). One working PDF is enough for the prototype.

### 8.4 DoD
Worker run creates `sla_risk`, `sla_breach` and `escalation` alerts; ageing endpoint returns buckets; Excel file opens with correct numbers; Reports page shows 3-4 charts.

---

## Stage 9: Online/Offline mode router and egress

### 9.1 What is real in the prototype

| Layer | Prototype | Production target |
|---|---|---|
| Policy resolution (sensitivity > capability > global) | **Real** | Same |
| Providers behind one interface (online + offline coexist) | **Real** (online providers are stubs or real if you add keys) | Real |
| Egress gateway with redaction and ledger | **Real** (in-process module) | Separate container; VPC controls |
| Network isolation | **Real in demo compose** (internal Docker network) | VPC private subnets, endpoints |

### 9.2 `services/routing.py`

```python
import json
from sqlalchemy import text
from . import egress

CAPABILITIES = ("email", "explain", "enrich")
_fail = {}           # simple circuit breaker counters

def get_setting(db, scope: str):
    return db.execute(text("SELECT value FROM policy_settings WHERE scope=:s"), {"s": scope}).scalar()

def resolve_route(db, capability: str, sensitive: bool = False) -> str:
    """Strictest wins: sensitivity > per-capability override > global mode."""
    if sensitive:
        return "offline"
    return get_setting(db, capability) or get_setting(db, "global") or "offline"

# ---------- providers ----------
def template_explanation(breakdown: dict, a: dict, b: dict) -> str:
    """OFFLINE provider: deterministic text from the learned breakdown."""
    if not breakdown:
        return "Same institution; similarity estimated from text only (model not trained)."
    parts = []
    cos = breakdown.get("cos", {}).get("value")
    if cos is not None: parts.append(f"complaint text {cos:.0%} similar")
    if breakdown.get("same_category", {}).get("value") == 1.0: parts.append("same category")
    days = breakdown.get("log_days", {}).get("value")
    if days is not None: parts.append(f"received about {round(2.718281828 ** days - 1)} days apart")
    if breakdown.get("cross_bureau", {}).get("value") == 1.0: parts.append("handled by different Bureaus/Cells")
    return "Same institution; " + ", ".join(parts) + "."

def llm_explanation(db, breakdown, a, b):
    """ONLINE provider (stub): goes through the egress gateway. Wire a real LLM here only if you decide to."""
    payload = {"breakdown": breakdown}
    egress.send(db, capability="explain", destination="llm.example (stub)", payload_kind="overlap_summary",
                case_ref=None, payload=payload)
    return template_explanation(breakdown, a, b) + " [LLM stub]"

def explain_overlap(db, breakdown, a, b, sensitive=False):
    route = resolve_route(db, "explain", sensitive)
    if route == "online" and not _fail.get("explain", 0) >= 3:
        try:
            return llm_explanation(db, breakdown, a, b), "llm"
        except Exception:
            _fail["explain"] = _fail.get("explain", 0) + 1      # fail-to-local, never fail-open
    return template_explanation(breakdown, a, b), "template"
```

### 9.3 `services/egress.py` (the only path to an external service)

```python
import json, re
from sqlalchemy import text

PII = [(re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+"), "[email]"), (re.compile(r"\b\d{10}\b"), "[phone]")]

def redact(s: str) -> str:
    for pat, rep in PII: s = pat.sub(rep, s)
    return s

class EgressBlocked(Exception): ...

def send(db, *, capability: str, destination: str, payload_kind: str, case_ref: str | None, payload: dict):
    mode = db.execute(text("SELECT value FROM policy_settings WHERE scope='global'")).scalar()
    cap_mode = db.execute(text("SELECT value FROM policy_settings WHERE scope=:c"), {"c": capability}).scalar() or mode
    if cap_mode == "offline":
        db.execute(text("INSERT INTO egress_ledger (capability,destination,payload_kind,case_ref,mode,redacted,outcome) "
                        "VALUES (:c,:d,:k,:r,'offline',TRUE,'blocked')"),
                   {"c": capability, "d": destination, "k": payload_kind, "r": case_ref})
        db.commit(); raise EgressBlocked(capability)
    clean = json.loads(redact(json.dumps(payload)))
    # TODO real HTTP call goes here (only if you wire a real provider). Prototype: stub.
    db.execute(text("INSERT INTO egress_ledger (capability,destination,payload_kind,case_ref,mode,redacted,outcome) "
                    "VALUES (:c,:d,:k,:r,'online',TRUE,'stub')"),
               {"c": capability, "d": destination, "k": payload_kind, "r": case_ref})
    db.commit()
    return clean
```

### 9.4 `routers/admin.py` (policy endpoints)

```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from ..db import get_db
from ..auth import current_user, require_roles

router = APIRouter(prefix="/api", tags=["admin"])

@router.get("/policy")
def get_policy(db=Depends(get_db), user=Depends(current_user)):
    rows = db.execute(text("SELECT scope, value, changed_at FROM policy_settings")).mappings().all()
    return {"settings": [dict(r) for r in rows]}

class PolicyIn(BaseModel):
    scope: str     # 'global' | 'email' | 'explain' | 'enrich'
    value: str     # online | offline

@router.put("/policy")
def set_policy(body: PolicyIn, db=Depends(get_db), user=Depends(require_roles("admin"))):
    if body.value not in ("online", "offline"): raise HTTPException(422)
    db.execute(text("""INSERT INTO policy_settings (scope,value,changed_by) VALUES (:s,:v,:u)
                       ON CONFLICT (scope) DO UPDATE SET value=:v, changed_by=:u, changed_at=now()"""),
               {"s": body.scope, "v": body.value, "u": user["id"]})
    db.execute(text("INSERT INTO audit_log (actor_id,action,entity,entity_id,detail) VALUES (:u,'policy_change','policy',:s,CAST(:d AS jsonb))"),
               {"u": user["id"], "s": body.scope, "d": f'{{"value":"{body.value}"}}'})
    db.commit(); return {"ok": True}

@router.get("/egress-ledger")
def ledger(db=Depends(get_db), user=Depends(require_roles("admin", "management"))):
    return [dict(r) for r in db.execute(text("SELECT * FROM egress_ledger ORDER BY created_at DESC LIMIT 200")).mappings()]
```

### 9.5 Frontend `ModeBar`

A thin top bar showing: global mode (badge), per-capability state, and a "no external calls" indicator when everything is offline. Admins get toggles that call `PUT /api/policy`. Non-admins see read-only badges. Show a **lock icon** on any case with `sensitivity_flag`.

### 9.6 Tests that prove the guarantee `tests/test_routing.py`

```python
from app.services.routing import resolve_route

class FakeDB:
    def __init__(self, s): self.s = s
    def execute(self, q, p=None):
        class R:
            def __init__(self, v): self.v = v
            def scalar(self): return self.v
        return R(self.s.get(p["s"]))

def test_sensitive_forces_offline():
    assert resolve_route(FakeDB({"global": "online"}), "explain", sensitive=True) == "offline"

def test_capability_override_beats_global():
    assert resolve_route(FakeDB({"global": "online", "explain": "offline"}), "explain") == "offline"

def test_global_applies_when_no_override():
    assert resolve_route(FakeDB({"global": "online"}), "email") == "online"
```

Plus an integration test: set global `offline`, create 20 cases, assert the egress ledger has **zero** `sent` rows.

### 9.7 DoD
Toggling global mode changes explanation source between `llm` (stub) and `template` immediately, with no restart; a case with `sensitivity_flag=true` never produces a `sent` ledger row; every toggle appears in `audit_log`; embeddings and scoring work identically in both modes.

---

## Stage 10: Evaluation and parameter registry

### 10.1 Evaluation script `ml/evaluate.py` (concept)

1. Hold out institutions never used in training.
2. Report: PR-AUC, precision and recall at the High and Medium thresholds, number of alerts per active case, and a **confusion list** of the 10 worst false positives and false negatives (read these by hand).
3. Compare against a **baseline** (cosine similarity alone with a fixed 0.8 cutoff). Show that the learned scorer beats it. This is your evidence slide.
4. Plot the precision-recall curve and mark the chosen thresholds.

### 10.2 Tune the other parameters the same way

| Parameter | How to derive |
|---|---|
| Institution `AUTO_ACCEPT` and `REVIEW_FLOOR` | Label ~100 intake name variants (include messy ones) as correct/incorrect institution; choose `AUTO_ACCEPT` as lowest score with precision above 0.98; `REVIEW_FLOOR` where recall of true matches reaches 0.95 |
| SLA `RISK_THRESHOLD` | Replay historical closed cases; choose the threshold that warns early while keeping false-warning rate acceptable; report lead time gained |
| Overlap thresholds | Already in the training script |

Write each into `parameter_registry` with `origin='learned_synthetic'` (because the data is synthetic), and show a **Model card** page in Admin listing parameter, value, origin, derivation, metrics, model version.

### 10.3 Shadow mode

Add `status='shadow'` models. In `scan_overlaps`, also score with the shadow model and store the disagreement in `audit_log` without creating alerts. Promote by flipping `ACTIVE` and `model_versions.status` after reviewing disagreements.

### 10.4 Be honest in the PPT

"Parameters are learned from a synthetic labelled set and marked as such. In deployment, officer confirm/dismiss decisions become labels and the model is retrained on a schedule."

### 10.5 DoD
Metrics table, baseline comparison and model card page exist; every tunable value in the app traces to a registry row.

---

## Stage 11 (OPTIONAL): Cost-capped AWS demo

**Only do this if a hosted link is required or clearly valuable.** A laptop demo plus a screen recording costs nothing and is a legitimate submission in many rounds. Check your round's rules.

### 11.1 Decision tree

| Situation | Plan |
|---|---|
| Live link not required | Skip Stage 11. Demo from laptop with `docker compose` |
| Link required for a few days | Follow 11.2 to 11.5 with the budget guardrails |
| Link needed for weeks | Reconsider: use a free hosting tier for the frontend and a small always-free-style option, or record a video. Do not leave RDS running for weeks on a capped budget |

### 11.2 Minimal architecture (cheapest that still works)

- **1 EC2 instance** (small) running Docker Compose: nginx + backend + worker
- **1 RDS PostgreSQL** (`db.t4g.micro` class, single-AZ, minimum storage), **same schema**, restored from `pg_dump` of your local DB
- **No** NAT Gateway, **no** load balancer, **no** Multi-AZ
- RDS security group allows port 5432 **only from the EC2 security group**
- Storage: `STORAGE_BACKEND=local` on EC2 (or a single S3 bucket with Block Public Access on and a least-privilege IAM role, which costs cents)
- HTTPS: Caddy or nginx with a free certificate on the instance, or simply HTTP for a short-lived demo (state this honestly)

### 11.3 Move the data

```bash
# local dump (custom format)
docker compose exec db pg_dump -U aicte -Fc aicte > aicte.dump
# restore into RDS (from EC2 or your laptop if you temporarily allow your IP)
pg_restore -h <rds-endpoint> -U <user> -d aicte --no-owner aicte.dump
```

Remember to enable the extensions on RDS if the restore does not (`CREATE EXTENSION pg_trgm; CREATE EXTENSION vector;`) and to confirm the RDS PostgreSQL version supports `pgvector`.

### 11.4 `docker-compose.demo.yml` (network isolation: your "offline" proof)

```yaml
services:
  nginx:                    # only service on the public network
    image: nginx:stable
    ports: ["80:80"]
    volumes: ["./frontend/dist:/usr/share/nginx/html:ro", "./deploy/nginx.conf:/etc/nginx/conf.d/default.conf:ro"]
    networks: [public, private]
    depends_on: [backend]
  backend:                  # private only: cannot reach the internet
    build: ./backend
    env_file: .env
    networks: [private]
  worker:
    build: ./backend
    command: python -m app.worker
    env_file: .env
    networks: [private]
networks:
  public: {}
  private:
    internal: true          # no outbound internet for containers attached only to this network
```

> With the DB on RDS, the backend must reach it, so for the demo variant that uses RDS you cannot also make `private` fully internal. The isolation demo (zero internet from the backend) is therefore best shown **locally** with a Postgres container on the `private` network. State this clearly in the PPT instead of overclaiming.

### 11.5 Teardown checklist (run the day the demo ends)

- [ ] Delete the **RDS instance** (take a final snapshot only if needed, then delete the snapshot too)
- [ ] Terminate the **EC2 instance**; release any **Elastic IP**
- [ ] Delete the **S3 bucket** contents and bucket (if used)
- [ ] Delete **security groups, key pairs, IAM users/roles** created for the demo
- [ ] Delete **CloudWatch log groups**
- [ ] Open **Cost Explorer / Billing** the next day and confirm spend is flat
- [ ] Keep the Budgets alerts on for a few weeks as a safety net

### 11.6 DoD
Demo reachable; estimated spend tracked daily; teardown checklist completed on a calendar date you set **before** you start.

---

## Stage 12: Demo script and PPT

### 12.1 Seven-minute demo flow

1. **Problem (30s):** two departments, one college, no visibility. Show a seeded institution with active RB and PGRC cases.
2. **Dashboard (45s):** KPIs, workload, overlap banner.
3. **The moment (2 min):** register a new RB complaint worded differently from the PGRC one. The system flags **"Potential Overlapping Cases – Coordination Required"** with the percentage and **feature breakdown**.
4. **Coordination (1 min):** link, nominate lead RB, hold the PGRC case, and show both timelines updated.
5. **Hard negative (45s):** open a same-institution, different-issue case; show it is **not** a high overlap (precision matters).
6. **SLA and reports (45s):** risk alert, ageing chart, Excel export.
7. **Mode toggle (1 min):** flip to Offline, mark a case sensitive, show the egress ledger has no external calls.
8. **Evidence (30s):** precision/recall versus baseline slide.

### 12.2 PPT outline (maps to design doc Section 19)

Title, problem, our understanding, solution, features, workflow, innovation (hybrid engine), learned scoring and evidence, architecture, online/offline routing, tech stack and justification, security, deployment and cost-awareness, impact, roadmap.

### 12.3 Rehearsal checklist
- Reset data: `docker compose down -v && docker compose up -d db && python -m scripts.seed && python -m ml.train_overlap`
- Pre-load the embedding model so the first request is not slow
- Keep a 2-minute screen recording as a fallback

---

## 13. Tools usage guide (quick reference)

### Docker / Compose
| Task | Command |
|---|---|
| Start DB | `docker compose up -d db` |
| Stop (keep data) | `docker compose stop` |
| Wipe data and reinit schema | `docker compose down -v && docker compose up -d db` |
| SQL shell | `docker compose exec db psql -U aicte -d aicte` |
| Logs | `docker compose logs -f db` |

### Handy SQL
```sql
\dt                                         -- list tables
SELECT status, count(*) FROM cases GROUP BY 1;
SELECT level, status, count(*) FROM overlap_links GROUP BY 1,2;
SELECT * FROM parameter_registry ORDER BY created_at DESC;
SELECT * FROM egress_ledger ORDER BY created_at DESC LIMIT 20;
EXPLAIN ANALYZE SELECT ...;                 -- check index use
```

### Python / FastAPI
| Task | Command |
|---|---|
| Run API | `uvicorn app.main:app --reload --port 8000` |
| API docs | `http://localhost:8000/docs` |
| Seed | `python -m scripts.seed` |
| Train | `python -m ml.train_overlap` |
| Worker | `python -m app.worker` |
| Tests | `pytest -q` |
| Lint | `ruff check .` (optional: `pip install ruff`) |

### Frontend
| Task | Command |
|---|---|
| Dev server | `npm run dev` (http://localhost:5173) |
| Production build | `npm run build` |
| Type check | `npx tsc --noEmit` |

### Git habits
```bash
git checkout -b stage-3-backend
git add -A && git commit -m "Stage 3: core API"
git checkout main && git merge stage-3-backend
git tag stage-3-done
```
Tag every finished stage so you can always roll back to a working demo.

### How each tool maps to a job

| Tool | Where it earns its place |
|---|---|
| PostgreSQL + `pg_trgm` | Institution-name fuzzy matching, search filters |
| `pgvector` | Complaint similarity (the AI part) |
| `fastembed` (ONNX) | Local multilingual embeddings, same in both modes |
| scikit-learn | Calibrated overlap scorer, threshold selection |
| APScheduler | SLA scans and escalation |
| FastAPI | API, auth, auto-docs for judges |
| TanStack Query | Live-refresh feel |
| Recharts | KPI, workload, ageing charts |
| Docker Compose | One-command environment, isolation demo |

---

## 14. Test plan summary

| Area | Test |
|---|---|
| Auth/RBAC | Regional user cannot see other regions; non-admin cannot change policy |
| Resolution | Messy names ("Govt. Engg. College, Pune") resolve correctly; low-confidence goes to review |
| Overlap | Differently worded same-issue pair is High; same-institution different-issue pair is not High |
| Coordination | Link, lead and hold update both timelines; dismiss requires a reason |
| SLA | Breach, escalation and risk alerts appear; no duplicate alerts on the same day |
| Router | Sensitivity beats override beats global; fail-to-local; offline produces no `sent` ledger rows |
| Reports | Excel totals equal dashboard totals |
| Performance | Case creation including embedding and scan completes quickly on the target data size |

---

## 15. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Model name not supported by your `fastembed` version | Check the supported-model list when installing; the engine treats the model as replaceable (`EMBED_MODEL`, `EMBED_DIM`; update `vector(384)` if the dimension differs) |
| Seed data too easy, so metrics look perfect | Include hard negatives and paraphrases; inspect false positives by hand; say the data is synthetic |
| Credits surprise | Stage 11 is optional; budgets and teardown checklist; nothing on AWS before Stage 11 |
| Too many features, weak story | Protect the three core items: overlap alert and coordination, institution 360, live dashboard |
| First request slow (model load) | Warm up the model at app start; load once with `lru_cache` |
| Overclaiming privacy | State exactly what is enforced (app policy, egress gateway, Docker internal network) and what is production roadmap (VPC controls, SSO) |

---

## 16. Sources and references

1. **SIH 2026 Problem Statement 26264** (attached): requirements, user groups, expected outcomes, the overlap alert example.
2. `AICTE_Complaint_Dashboard_Guide.md`: the design document this build guide implements.
3. Project decisions: limited credits (50-70 cap), single database/one connection string, co-existing online/offline routing, learned parameters.
4. To verify when installing (official docs): PostgreSQL `pg_trgm`, `pgvector`, FastAPI, SQLAlchemy 2.x, `fastembed` supported models, scikit-learn calibration, APScheduler, Tailwind and shadcn/ui install guides for Vite, AWS Pricing Calculator, AWS Budgets, RDS PostgreSQL supported extensions.

> Code in this guide is a scaffold written for clarity. Expect to fix small API differences between library versions. Run each stage's DoD checks before moving on.
