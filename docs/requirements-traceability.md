# Requirements Traceability Matrix
## CaseNexus — SIH 2026, PS 26264

> Maps every major requirement from the Problem Statement to the implementing
> feature, code module, and test. Updated each stage.
>
> Status: ✅ Done | 🔧 In Progress | 📅 Planned

---

## Source Documents

| Document | Status | Notes |
|---|---|---|
| `docs/AICTE_Prototype_Build_Guide.md` | ✅ Read | Primary implementation reference |
| `docs/CaseNexus_Modules_Pipelines_Theory.md` | ✅ Read | Theory and module design |
| Official SIH 2026 PS 26264 PDF | ❌ Not found in repo | Using build guide's accurate summary |
| `AICTE_Complaint_Dashboard_Guide.md` | ❌ Not found in repo | Companion design doc referenced in build guide |
| `SIH2026_Team_Handbook.pdf` | ❌ Not found in repo | Referenced in theory doc |

---

## PS 26264 Requirements → Implementation

### Feature Area 1: Centralised Institution Profile (Institution 360)

| Requirement | Feature | Module | Test | Stage | Status |
|---|---|---|---|---|---|
| View institution identity, ID, aliases, location, region | Institution 360 page | `routers/institutions.py` → `GET /api/institutions/{id}` | test_stage5_institutions.py | 5 | ✅ |
| Complaint history across all bureaus/cells | Institution cases list (all bureaus) | `routers/institutions.py` | test_stage5_institutions.py | 5 | ✅ |
| Exact AICTE ID matching | Resolution rung 1 | `services/resolution.py` | test_resolution.py | 3,6 | ✅ |
| Normalized-name matching | Trigram + IDF blend | `services/resolution.py` | test_resolution.py | 3,6 | ✅ |
| Fuzzy name matching | pg_trgm GIN index | `db/schema.sql` idx_inst_trgm | test_resolution.py | 1,6 | ✅ |
| Never auto-merge on weak fuzzy match | REVIEW_FLOOR threshold → officer review | `services/resolution.py` | test_resolution.py | 3,6 | ✅ |
| Aliases with approval state | `institution_aliases` table | `db/schema.sql` | — | 1 | ✅ |

### Feature Area 2: Complaint/Case Tracking

| Requirement | Feature | Module | Test | Stage | Status |
|---|---|---|---|---|---|
| View all cases in one place | Case list with bureau/region/status filters | `routers/cases.py` `GET /api/cases` | test_stage5_cases.py | 3,5 | ✅ |
| Track case movement: pending/disposed/transferred/escalated | Status enum + transitions | `routers/cases.py` STATUS_TRANSITIONS | test_stage5_cases.py | 3,5 | ✅ |
| Action timeline | `actions` table | `db/schema.sql`, `routers/cases.py` detail | test_stage5_cases.py | 3,5 | ✅ |
| Identify bureau handling each case | `bureau` field on case | schema + list query | test_cases.py | 1,5 | ✅ |
| Case creation with validation | `POST /api/cases` | `routers/cases.py` | test_cases.py | 3,5,6 | ✅ |

### Feature Area 3: Cross-Bureau/Cell Overlap Detection (Primary Innovation)

| Requirement | Feature | Module | Test | Stage | Status |
|---|---|---|---|---|---|
| Detect overlaps even when descriptions differ | Semantic embeddings + cosine similarity | `services/embeddings.py`, `services/overlap.py` | test_overlap.py | 6 | ✅ |
| Explain why cases were flagged | Feature breakdown bars + template text | `services/routing.py`, `services/features.py` | test_features.py, test_overlap.py | 6 | ✅ |
| Show "Potential Overlapping Cases – Coordination Required" | High-level alert + overlap card | Frontend `OverlapCard` + `alerts` table | DashboardPage.tsx | 6,7 | ✅ |
| Institution identity resolution before overlap | Resolution service called first | `services/resolution.py` → `scan_overlaps` | test_resolution.py | 3,6 | ✅ |
| Local multilingual embeddings | paraphrase-multilingual-MiniLM-L12-v2 via fastembed | `services/embeddings.py` | test_overlap.py | 3,6 | ✅ |
| pgvector cosine similarity | `vector(384)` column + `<=>` operator | `db/schema.sql` | test_overlap.py | 1,6 | ✅ |
| Calibrated scorer (baseline vs improved) | LogisticRegression + CalibratedClassifierCV | `ml/train_overlap.py` | test_train_select.py | 6 | ✅ |
| Three threshold levels (high/medium/info) | `classify()` function | `services/overlap.py` | test_overlap.py | 6 | ✅ |
| Persisted scores and breakdowns | `overlap_links.breakdown JSONB` | `db/schema.sql` | test_overlap.py | 1,6 | ✅ |
| Hard-negative test: same institution, different issue → NOT high | Hard-negative seed pairs | `scripts/seed.py` | test_overlap.py | 6,10 | ✅ |
| Positive test: differently worded, same issue → high | Planted overlap pairs | `scripts/seed.py` | test_overlap.py | 6,10 | ✅ |

### Feature Area 4: Real-Time Dashboard

| Requirement | Feature | Module | Test | Stage | Status |
|---|---|---|---|---|---|
| Live KPI cards (total, pending, overdue, etc.) | `GET /api/dashboard` | `routers/reports.py` | — | 3 | ✅ |
| By bureau/cell workload | `by_bureau` field in dashboard response | `routers/reports.py` | — | 3 | ✅ |
| By region | `by_region` field | `routers/reports.py` | — | 3 | ✅ |
| Overdue count | `overdue` KPI | `routers/reports.py` | — | 3 | ✅ |
| Ageing buckets | `ageing` field + `/reports/ageing` | `routers/reports.py` | — | 3 | ✅ |
| Overlap alert count on dashboard | `overlaps.high_open` KPI | `routers/reports.py` | — | 3 | ✅ |
| No hardcoded statistics | All counts from live SQL | `routers/reports.py` | — | 3 | ✅ |

### Feature Area 5: Workflow and Action History

| Requirement | Feature | Module | Test | Stage | Status |
|---|---|---|---|---|---|
| Add remarks, transfer, status changes | `POST /api/cases/{id}/actions` | `routers/cases.py` | — | 3 | ✅ |
| Validated status transitions | `STATUS_TRANSITIONS` dict | `routers/cases.py` | — | 3 | ✅ |
| Audit trail | `audit_log` table | `db/schema.sql` | — | 1 | ✅ |
| Coordination: link cases, nominate lead, hold parallel | `POST /api/overlaps/{id}/decide` | `routers/overlaps.py` | — | 7 | ✅ |
| Dismiss with mandatory reason | `body.reason` required | `routers/overlaps.py` | — | 7 | ✅ |
| Both timelines updated on link | `actions` insert for both cases | `routers/overlaps.py` | — | 7 | ✅ |

### Feature Area 6: Search and Filters

| Requirement | Feature | Module | Test | Stage | Status |
|---|---|---|---|---|---|
| Search by case ref | `q` param | `routers/cases.py` | — | 3 | ✅ |
| Full-text search on description | `plainto_tsquery` + GIN index | `routers/cases.py` + `db/schema.sql` | — | 3 | ✅ |
| Filter by bureau | `bureau` param | `routers/cases.py` | — | 3 | ✅ |
| Filter by region | `region` param | `routers/cases.py` | — | 3 | ✅ |
| Filter by category | `category` param | `routers/cases.py` | — | 3 | ✅ |
| Filter by status | `status` param | `routers/cases.py` | — | 3 | ✅ |
| Filter by date range | `date_from`, `date_to` | `routers/cases.py` | — | 3 | ✅ |
| Overdue toggle | `overdue` param | `routers/cases.py` | — | 3 | ✅ |
| Institution fuzzy search | `GET /api/institutions/search` | `routers/institutions.py` | — | 3 | ✅ |

### Feature Area 7: Alerts and Notifications

| Requirement | Feature | Module | Test | Stage | Status |
|---|---|---|---|---|---|
| Alert on pending cases | SLA scan → `sla_breach` alert | `services/sla.py` | — | 8 | 📅 |
| Alert near deadline | `sla_risk` alert from survival estimate | `services/sla.py` | — | 8 | 📅 |
| Escalation alert | `escalation` alert | `services/sla.py` | — | 8 | 📅 |
| Overlap high alert | `overlap_high` alert on scan | `services/overlap.py` | — | 6 | 📅 |
| Idempotent alert generation | `AND created_at::date=CURRENT_DATE` guard | `services/sla.py` | — | 8 | 📅 |
| Scheduled SLA scans | APScheduler every 15 min | `app/worker.py` | — | 8 | 📅 |

### Feature Area 8: Reports and Analytics

| Requirement | Feature | Module | Test | Stage | Status |
|---|---|---|---|---|---|
| Bureau/cell-wise report | SQL GROUP BY bureau | `routers/reports.py` | — | 8 | ✅ |
| Region-wise report | SQL GROUP BY region | `routers/reports.py` | — | 8 | ✅ |
| Excel export | openpyxl Workbook | `routers/reports.py` `/reports/bureau.xlsx` | — | 8 | ✅ |
| PDF export | ReportLab SimpleDocTemplate | `routers/reports.py` `/reports/bureau.pdf` | — | 8 | ✅ |
| Export totals match UI | Same SQL query for both | `routers/reports.py` | — | 8 | ✅ |

---

## Cross-Cutting Requirements

### Security

| Requirement | Implementation | Status |
|---|---|---|
| JWT authentication | `app/auth.py` + `OAuth2PasswordBearer` | ✅ |
| Role-based access control | `require_roles()` dep + role enum | ✅ |
| Regional row-level scoping | `scope_clause()` + region filter | ✅ |
| Password hashing (bcrypt) | `bcrypt.hashpw/checkpw` | ✅ |
| No password hash in API response | `current_user` returns safe dict | ✅ |
| No embedding in API response | Excluded from `case_detail` | ✅ |
| No `issue_key` in API response | Not in SELECT | ✅ |
| Admin-only policy changes | `require_roles("admin")` | ✅ |
| Audit log for sensitive actions | `audit_log` inserts on overlap decisions, policy changes | ✅ |
| Transactional coordination updates | `db.commit()` after both timeline writes | ✅ |

### Online/Offline Routing

| Requirement | Implementation | Status |
|---|---|---|
| Global mode | `policy_settings` table scope='global' | ✅ |
| Per-capability override | `policy_settings` scope=capability | ✅ |
| Per-case sensitivity override | `sensitive=True` → always offline | ✅ |
| Sensitive beats capability beats global | `resolve_route()` precedence | ✅ |
| Egress ledger | `egress_ledger` table + `services/egress.py` | ✅ |
| Fail closed | Default to offline when settings missing | ✅ |
| Tests proving routing guarantee | `tests/test_routing.py` (7 tests, all pass) | ✅ |

### Model Governance

| Requirement | Implementation | Status |
|---|---|---|
| Parameter registry | `parameter_registry` table | ✅ |
| Provenance labels | `origin` enum: learned/learned_synthetic/policy/default_pending_data | ✅ |
| Model versions | `model_versions` table | ✅ |
| Honest synthetic labelling | All seed-trained params: `learned_synthetic` | ✅ |
| Shadow evaluation | `model_versions.status='shadow'` (planned Stage 10) | 📅 |

---

## Deployment Architecture Decision Log

| Decision | Rationale | Authorized? |
|---|---|---|
| Local Docker Compose for Stages 0-10 | Zero AWS cost; identical code path | ✅ |
| Single PostgreSQL (not two parallel DBs) | One `DATABASE_URL`, configurable | ✅ |
| No RDS/S3 provisioning | Budget restriction; Stage 11 optional | ✅ |
| No external LLM API | Template explanations sufficient; LLM stub prepared | ✅ |
| Python 3.12 via uv (not system 3.14) | ML package compatibility | ✅ |
| fastembed 0.4.2 (not 0.9.0 in guide) | Latest version verified to support the model | ✅ |

---

*Last updated: Stage 1 completion. Next update: Stage 2 (seed data verification).*
