# CaseNexus: Modules, Submodules, Pipelines and Theory

**Project:** Integrated Dashboard for Monitoring and Tracking Institution-Related Complaint Cases Across AICTE Bureaus/Cells
**Event:** Smart India Hackathon 2026, Software, PS ID 26264, Organisation: AICTE
**Working title:** CaseNexus (placeholder, the team may rename it)

> **How to read the tags in this document**
> - Unmarked content comes from the Team Handbook.
> - **(proposed)** means a suggestion that the handbook does not specify. Confirm with the team before treating it as decided.
> - **[OPEN]** means the handbook lists it as an undecided team question.
> - All numbers marked *illustrative* are teaching examples, not measured results. The prototype runs on **synthetic data**, and every learned value must say so.

---

## Contents

1. Theory of the project
2. System architecture
3. Backend module map
4. Feature-by-feature modules and submodules
5. Cross-cutting modules
6. The pipelines
7. The overlap engine in depth
8. The learning loop
9. Online/Offline mode and privacy
10. Data model
11. Frontend structure
12. Build order and dependencies
13. Evaluation
14. Claims we can and cannot make
15. Risks and open decisions
16. Glossary

---

# Part 1: Theory of the project

## 1.1 The problem

AICTE (All India Council for Technical Education) approves and regulates technical institutions in India. People complain to it about institutions: fake faculty, excess fees, unapproved courses, withheld certificates, weak infrastructure, false claims of approval. Several internal units handle these complaints.

| Unit | Role |
|---|---|
| RB (Regulation Bureau) | Takes regulatory and enforcement action against institutions |
| PGRC (Public Grievance Redressal Cell) | Receives and resolves grievances from students, faculty and the public |
| Other Bureaus/Cells | Handle other functions that may touch the same institution |
| Regional Offices/Centres | Work with institutions in their region |

**The core failure:** each unit keeps its own records. Nobody can see, in one place and in real time, that the same institution is being handled by several units. The results are duplicated work, conflicting actions, delays, and no clear answer to "who is dealing with this institution right now?"

**What we build:** not only a dashboard, but a **coordination layer** that notices when two units are working on the same institution, explains why, and helps them decide who leads.

## 1.2 Context (facts read from official pages on 23 October 2026)

- AICTE's grievance page describes the PGRC. It handles grievances and complaints from students, faculty and stakeholders of approved institutions, ragging complaints, complaints that institutions violate norms and standards, and grievances arriving through the CPGRAMS portal.
- CPGRAMS is the Government of India's central grievance portal. A PIB document (December 2024) reports that it connects 92 Central Ministries/Departments/Organisations with 36 States/UTs, resolved about 7.0 million grievances between 2022 and 2024, and cut the redressal timeline from 30 days to 21 days. These are government self-reported figures.

**What we do not know:** AICTE's internal timelines per complaint category, the data formats of the RB and PGRC systems, and how cases are numbered. We therefore make deadlines **configurable** and data import **adapter-based**, and we say so openly.

## 1.3 What the problem statement requires

**Objectives:**
- View all institution-related cases in one place
- Identify the Bureau/Cell handling each case
- Track the complete status and movement of a case
- Identify overlap between RB and PGRC, or among several Bureaus/Cells
- Avoid duplication and ensure coordination
- Monitor pending, disposed, under-process, transferred and escalated cases
- Generate institution-wise, region-wise, Bureau/Cell-wise and status-wise reports
- Alert on pending cases and cases nearing timelines

**Eight feature areas:** centralized institution profile, complaint/case tracking, cross-Bureau/Cell overlap detection, real-time dashboard, workflow and action history, search and filters, alerts and notifications, reports and analytics.

**The innovation clause:** use data matching, rule-based logic and/or AI-assisted analytics to identify complaints about the same institution *even when the descriptions or case references differ*. The system should show "Potential Overlapping Cases – Coordination Required". This is the heart of the project and of the evaluation.

## 1.4 Six hidden hard problems

| Hard problem | Why it matters | Our answer |
|---|---|---|
| Which institution is this? | IDs are missing or misspelled; names vary ("Govt. Engg. College") | ID first; then fuzzy, rarity-weighted name matching; low confidence goes to a human |
| What counts as an overlap? | Same institution with a different issue is not a duplicate; treating it as one floods officers | Three levels (High/Medium/Info) and a learned score |
| Unknown source systems | The PS does not describe RB/PGRC data formats | Import adapter (CSV/API) into one common schema |
| Unknown deadlines | Timelines differ by category and are not given | Configurable SLA rules with a source reference; data-driven risk warnings |
| Sensitive data | Complainants and whistleblowers need protection | Role-based access, masking, audit log, per-case offline processing |
| Adoption | Officers will not enter data twice | Single window, pre-action banner, minimal extra entry |

## 1.5 The three layers of value

| Layer | Meaning | Required by PS? |
|---|---|---|
| 1. Visibility | One place to see all cases, owners, status, history | Yes (basic) |
| 2. Intelligence | Detect that cases relate even when wording and IDs differ, and explain why | Yes (innovation clause) |
| 3. Coordination | Link cases, nominate a lead, hold parallel action, record decisions | Implied; our differentiator |

## 1.6 Design principles

1. **One database for everything.** Fuzzy search, vector search and full-text search all run inside PostgreSQL. No separate search or vector service.
2. **Two questions, answered separately.** "Is it the same institution?" and "Is it the same issue?" are separate problems, solved separately, then combined.
3. **Explainable by design.** Every alert shows which signals pushed the score up or down.
4. **The system suggests, officers decide.** Every automated output is a recommendation.
5. **Every optional capability has an online and an offline provider**, chosen at runtime by a router. The strictest rule wins. If online fails, fall back to local; never fail open.
6. **Honest provenance.** Every learned parameter is recorded with its origin (`default_pending_data`, `learned_synthetic`, later real data).

## 1.7 Technique theory

### Entity resolution (is this the same institution?)

Entity resolution, also called record linkage, decides whether two records refer to the same real-world thing. We use a ladder of methods, from cheap and exact to flexible.

| Rung | Method | Example | Status |
|---|---|---|---|
| 1 | Exact key | AICTE Permanent ID equals | Built in prototype; confidence 1.0 |
| 2 | String similarity (trigrams) | "government engineering college pune" vs "govt engg college pune" | Built (PostgreSQL pg_trgm) |
| 3 | Rarity-weighted tokens (IDF) | "ambedkar" tells us more than "college" | Built |
| 4 | Probabilistic linkage (Fellegi-Sunter) | Sum evidence from each agreeing/disagreeing field | **Planned upgrade via Splink; do not claim as built** |

**Trigrams.** pg_trgm breaks a string into 3-character pieces and counts how many two strings share. Good at typos, weak at word importance and word order.

**Rarity weighting.** For each word *t*: `w(t) = ln((N+1)/(df+1)) + 1`, where N is the number of institutions and df the number containing *t*. Similarity of two names = total weight of shared words / total weight of all words in either name (a weighted Jaccard). Generic words ("college", "institute") get low weight automatically, so no hand-written stop-word list is needed.

*Worked example (illustrative, N = 60):*

| Word | df | w(t) |
|---|---|---|
| government | 20 | 2.07 |
| engineering | 40 | 1.40 |
| college | 55 | 1.09 |
| pune | 5 | 3.32 |
| nagpur | 4 | 3.50 |
| ambedkar | 1 | 4.42 |

Query "government engineering college pune" against "Government Engineering College Pune Ambedkar": shared = 7.87, union = 12.29, score 0.64. Against "Government Engineering College Nagpur": shared = 4.55, union = 11.37, score 0.40. The city word separates the candidates; the generic words barely matter.

**Fellegi-Sunter (planned).** For each field, estimate *m* = chance the field agrees when records truly match, and *u* = chance it agrees by coincidence. An agreeing field adds `log2(m/u)` evidence; a disagreeing one adds `log2((1-m)/(1-u))`. Summed evidence converts to a match probability. The EM algorithm can estimate m and u without labelled data. Agreeing on a rare word is strong evidence; agreeing on a common word is weak (the term-frequency adjustment).

### Embeddings (is it the same issue?)

An embedding turns text into a vector so that texts with similar meaning point in similar directions. Our model, `paraphrase-multilingual-MiniLM-L12-v2`, produces **384 numbers** per text, supports **50 languages**, and is Apache-2.0 licensed. It runs through **fastembed** (ONNX Runtime on CPU), so no GPU is needed.

```
cosine_similarity(a, b) = (a . b) / (|a| x |b|)      range -1 to 1
pgvector operator <=> returns cosine DISTANCE, so similarity = 1 - distance
```

**Why embeddings and not a large language model for every comparison:** Sentence-BERT's authors report finding the most similar pair among 10,000 sentences took about 65 hours with a standard BERT pair-comparison setup versus about 5 seconds with sentence embeddings. Embeddings are computed once per case and compared with cheap arithmetic.

**Limit:** embeddings capture topical similarity. "Fees too high" and "refund denied" are both fee-related but legally different. That is why we add other features and test with hard negatives.

### Logistic regression (combining signals)

For each pair of cases we compute six features. The model computes `z = b + w1x1 + ... + w6x6` and `p = 1 / (1 + e^-z)`. Because the model is linear, each term `wi * xi` shows how much one feature pushed the score, which becomes the bars in the explanation card. Chosen because it is explainable, trains in seconds on small data, and needs no GPU.

**Honest detail:** the final probability comes from the calibrated model, while the bars come from a plain logistic regression fitted on the same data. They agree in direction but are not numerically identical, so the UI labels the bars as an *explanation*.

### Calibration

Raw scores are not always true probabilities. Calibration makes "0.9" mean roughly 90%. scikit-learn's `CalibratedClassifierCV` offers sigmoid (Platt scaling) and isotonic. Its documentation recommends sigmoid for very uncalibrated classifiers on imbalanced data and warns that isotonic overfits when calibration samples are far fewer than about 1,000. Our early synthetic set is small, so we start with **sigmoid**.

### Precision, recall and thresholds

```
precision = TP / (TP + FP)    "of the alerts we raised, how many were right?"
recall    = TP / (TP + FN)    "of the real overlaps, how many did we catch?"
```

Most case pairs are unrelated, so plain accuracy misleads (a model that always says "unrelated" is accurate and useless). We use precision, recall and PR-AUC.

- **High threshold:** the lowest score that still achieves the target precision (initial policy target 0.90), because false alarms cause alert fatigue.
- **Medium threshold:** set for a target recall (initial 0.90).

The two targets are policy choices, recorded as such. The threshold values themselves are learned.

**Leakage:** if pairs from the same institution land in both training and test sets, results look better than they are. We split **by institution**.

### SLA risk

Deadlines are policy (stored per category with a source). Warnings are data-driven. For an open case of age *a* days with deadline *D*:

```
P(breach) = (closed cases of same category that took longer than D)
          / (closed cases that took longer than a)
```

If fewer than **15** historical cases exist, fall back to simple deadline checks and say so. This estimate ignores still-open cases, so it can be optimistic; a Kaplan-Meier survival estimate is the proper upgrade.

### Access control, masking, audit

- **RBAC:** roles are officer, regional, management, admin. Regional users see only their region's institutions.
- **Masking:** complainant identity is hidden by default and revealed only to permitted roles, with an audit entry.
- **Audit log:** append-only record of decisions, mode changes, exports and sensitive views.

### Cold start

There is no real labelled AICTE data. We (1) generate a synthetic set with known answers, (2) label every resulting parameter `learned_synthetic`, (3) retrain on real officer decisions as they accumulate, and (4) tell judges plainly that current numbers come from synthetic data.

---

# Part 2: System architecture

| Layer | What lives there | Role |
|---|---|---|
| **Presentation** | React + TypeScript (Vite, Tailwind, shadcn/ui, TanStack Query/Table, Recharts) | Shows data, collects officer decisions |
| **API + Services** | FastAPI, Pydantic, SQLAlchemy, Alembic, JWT + bcrypt, APScheduler | All business logic, matching, alerts, SLA |
| **Data** | PostgreSQL with pg_trgm, pgvector, full-text; S3-compatible object storage | One source of truth for cases, vectors and documents |
| **Sources** | RB system, PGRC system, regional data (CSV/API) | Feed a common schema through an import adapter |

The same containers run on a laptop, a single server or a cloud account (Docker Compose).

**Technology rationale (short):**

| Choice | Why | Rejected alternative |
|---|---|---|
| React + TypeScript | Suits dashboards, tables, timelines; types catch data-shape bugs | Angular (heavier), Vue (smaller local talent pool) |
| FastAPI | Async, automatic OpenAPI docs, Python hosts the ML stack | Node (weaker ML), Django (heavier) |
| PostgreSQL | Relational, linked data, transactions | MongoDB (poor fit for linked data) |
| pgvector | Vector similarity in SQL | Dedicated vector database |
| fastembed + MiniLM | CPU-only, 384-dim, 50 languages | Full PyTorch stack; hosted LLM for matching |
| scikit-learn | Logistic regression, calibration, metrics | Deep models (unexplainable, data-hungry) |
| APScheduler | Our recurring jobs are light and periodic | Celery + broker (extra components, no benefit at this scale) |

---

# Part 3: Backend module map (proposed layout)

```
app/
 ├─ auth/          login, roles, region scoping, masking
 ├─ institutions/  normalizer, resolver, profile (institution 360)
 ├─ cases/         registration, status machine, assignment, actions/timeline, documents
 ├─ ingestion/     import adapters, field mapping, validation
 ├─ embeddings/    local model loader, embed service
 ├─ overlap/       candidates, features, scorer, levels, explanation, coordination
 ├─ alerts/        factory, dedupe, channels, alert center API
 ├─ sla/           rules, scanner, risk estimator, escalation
 ├─ reports/       aggregations, Excel and PDF export
 ├─ dashboard/     kpis, workload, institution_status
 ├─ router/        capability router, providers, egress gateway, ledger
 ├─ mlops/         dataset builder, training, evaluation, parameter registry, shadow/promotion
 └─ audit/         append-only log writer
```

---

# Part 4: Feature-by-feature modules and submodules

## Feature 1: Centralized institution profile

| Submodule | Responsibility |
|---|---|
| `institutions/normalizer` | Lowercase, strip punctuation, expand abbreviations (govt to government, engg to engineering); writes `normalized_name` for the trigram index |
| `institutions/resolver` | Decides which institution a complaint refers to (see Part 7) |
| `institutions/profile` | The "Institution 360" query: joins the institution to all its cases across all units, plus overlaps and alerts |

**Tables:** `institutions`, `cases`, `overlap_links`.
**PS fields covered:** unique ID / AICTE Permanent ID, name, address, region, consolidated complaint history.

## Feature 2: Complaint/case tracking

| Submodule | Responsibility |
|---|---|
| `cases/registration` | Validate fields, resolve institution, assign category (classifier suggestion the officer can change), calculate SLA due date from `sla_rules` |
| `cases/status_machine` | Enforce lifecycle: Received → Registered → Assigned → Under process → Action taken → Disposed. Transfers and escalations are timeline events; Reopened loops back to Under process. Rejects illegal jumps |
| `cases/assignment` | Records bureau and officer; keeps transfer history |

**Tables:** `cases`, `actions`, `bureaus`, `officers`, `categories`.
**PS fields covered:** case ID, receipt date, category, status, Bureau/Cell, officer, last action, next action, date of last action, expected disposal date.

## Feature 3: Cross-Bureau/Cell overlap detection

The core feature; see Part 7 for the full pipeline.

| Submodule | Responsibility |
|---|---|
| `overlap/candidates` | Fetch other cases of the same institution |
| `overlap/features` | Build the six pair features |
| `overlap/scorer` | Calibrated probability plus per-feature contributions |
| `overlap/levels` | Map score and case state to High / Medium / Info |
| `overlap/explanation` | Template text built from the score breakdown (always available offline) |
| `overlap/coordination` | Link, nominate lead, hold parallel action, dismiss with reason |

**Tables:** `overlap_links`, `alerts`, `actions`.

## Feature 4: Real-time dashboard

| Submodule | Responsibility |
|---|---|
| `dashboard/kpis` | SQL aggregates: total, pending, under process, disposed, transferred, beyond timeline |
| `dashboard/workload` | Per-Bureau/Cell counts |
| `dashboard/institution_status` | Per-institution status |

**Frontend:** KPI cards and Recharts charts. TanStack Query re-fetches every few seconds, so "real-time" means **polling**, not WebSockets. This is simple and reliable at this scale.

## Feature 5: Workflow and action history

| Submodule | Responsibility |
|---|---|
| `cases/actions` | Append-only actions: who, which unit, when, remarks, type (log, transfer, escalate, link, hold) |
| `cases/documents` | Upload, store the file in object storage, write only key and checksum to the database |

**Frontend:** `actions` rows render as a timeline.

## Feature 6: Search and filters

| Part | Mechanism |
|---|---|
| Filter bar | Institution, AICTE ID, case ID, Bureau/Cell, region, category, status, date range; plain indexed SQL |
| Fuzzy name search | pg_trgm |
| Free-text search | PostgreSQL full-text search over descriptions |

## Feature 7: Alerts and notifications

| Submodule | Responsibility |
|---|---|
| `alerts/factory` | Creates alerts of kind overlap, pending reminder, escalation, SLA |
| `alerts/dedupe` | Prevents repeats; SLA alerts limited to once per day per case |
| `alerts/channels` | Always writes the in-app alert; email only if the router allows the online path |

## Feature 8: Reports and analytics

| Submodule | Responsibility |
|---|---|
| `reports/aggregations` | Bureau-wise, region-wise, institution history, ageing, disposal rate, overlaps, monthly/quarterly |
| `reports/export` | openpyxl (Excel) and ReportLab (PDF) |

---

# Part 5: Cross-cutting modules

## SLA

| Submodule | Responsibility |
|---|---|
| `sla/rules` | Deadlines per category with a `source_reference`; configurable because real deadlines are unknown |
| `sla/scanner` | Runs every 15 minutes (configurable) via APScheduler; computes age and overdue days |
| `sla/risk` | Estimates P(breach) from closed cases; falls back to plain deadline checks under 15 history cases and says so |
| `sla/escalation` | Raises escalation alerts |

## Auth and access

| Submodule | Responsibility |
|---|---|
| `auth/login` | JWT + bcrypt |
| `auth/roles` | Officer, regional, management, admin |
| `auth/scope` | Regional users limited to their region |
| `auth/masking` | Hides complainant identity unless the role permits; reveals are audited |

## Router and privacy

| Submodule | Responsibility |
|---|---|
| `router/capability_router` | For this capability and this case, may the online provider be used? |
| `router/providers` | Online and offline implementation per capability |
| `router/egress_gateway` | Redacts and logs every outbound attempt |
| `router/ledger` | The egress ledger table writer |

## MLOps

| Submodule | Responsibility |
|---|---|
| `mlops/dataset` | Build labelled pairs from confirm/dismiss decisions and seed data |
| `mlops/train` | Fit, calibrate, derive thresholds |
| `mlops/evaluate` | Metrics against the baseline |
| `mlops/registry` | Parameter registry and model versions (the model card) |
| `mlops/promotion` | Shadow review, promote, rollback |

## Audit

`audit/writer` appends who, what, when, before/after for every sensitive action: decisions, mode changes, exports, sensitive views, model promotions.

## Ingestion

| Submodule | Responsibility |
|---|---|
| `ingestion/adapters` | Maps RB, PGRC and regional data (CSV/API) into the common schema |
| `ingestion/validation` | Pydantic field validation |
| `ingestion/mapping` | Per-source field mapping configuration |

Because real source formats are unknown, the first adapter is a simple CSV mapper **(proposed)**. Do not claim integration with AICTE's systems.

---

# Part 6: The pipelines

| Pipeline | Trigger | Steps | Output | Main tools |
|---|---|---|---|---|
| **Ingestion** | New complaint or import file | Validate fields; resolve institution; assign category, SLA date, officer | Case + first action row | FastAPI, pg_trgm, Pydantic |
| **Embedding** | Case created or description edited | Embed text locally; store vector and model id | Vector on the case row | fastembed, pgvector |
| **Overlap scan** | After embedding | Fetch same-institution cases; build features; score; classify; write link and alerts | Overlap row + alerts | scikit-learn, SQL |
| **SLA scan** | Every 15 minutes (configurable) | Compute age, overdue days, breach risk; alerts once per day per case | SLA risk, breach, escalation alerts | APScheduler |
| **Retraining** | Scheduled, or when enough new decisions exist | Build pairs from confirm/dismiss labels; train; evaluate; store as shadow | New model version | scikit-learn |
| **Promotion** | After shadow review | Compare disagreements; approve; flip active; keep rollback | Active model | Admin screen |
| **Reporting** | On request; scheduled exports | Aggregate by Bureau, region, institution, age, month | Charts, Excel, PDF | SQL, openpyxl, ReportLab |
| **Audit** | Every sensitive action | Append who, what, when, before/after | Audit rows | PostgreSQL |

## End-to-end case flow

1. **Intake.** A complaint arrives at RB, PGRC or a Regional Office via import/sync or manual registration.
2. **Institution resolution.** ID first, then fuzzy matching; low confidence goes to an officer.
3. **Case creation.** Case ID, category, SLA deadline, Bureau/Cell, officer; embedding generated locally.
4. **Overlap scan.** Compare with the institution's other cases.
5. **Classify and notify.** High, Medium, Info or none; alerts to both units for High and Medium.
6. **Coordination.** Officers link, nominate a lead, hold parallel action, or dismiss.
7. **Action tracking.** Every step logged.
8. **SLA monitoring.** Scheduled scan raises risk, breach and escalation alerts.
9. **Disposal.** Case closed with outcome; for linked cases the lead confirms consistent outcomes.
10. **Reporting.** Dashboards and exports.

## Roles

| Role | Sees | Can do |
|---|---|---|
| Officer (RB, PGRC, other Bureau) | All cases for institutions they touch; overlap alerts | Register cases, log actions, decide overlaps |
| Regional Office | Their region's institutions and cases | Same, scoped to region |
| Management / Competent Authority | Everything; analytics; escalated cases; egress ledger | Final decisions on conflicts |
| Admin | Configuration, model card, audit log | Users, categories, SLA rules, thresholds, online/offline policy |

---

# Part 7: The overlap engine in depth

## 7.1 Pipeline

```
New complaint (text, ID?, name, city)
  → 1. Resolve institution (ID exact, else fuzzy + rarity-weighted)
  → 2. Embed text locally (384 numbers)
  → 3. Fetch other cases of the same institution
  → 4. Build 6 pair features per case pair
  → 5. Calibrated model: probability (+ plain model for per-feature contributions)
  → 6. Level: High / Medium / Info using learned thresholds
  → 7. Alert both Bureaus/Cells + template explanation
  → 8. Officer: link, lead, hold or dismiss (with reason)
  → 9. Decision becomes a training label
```

## 7.2 Institution resolution

1. If an AICTE Permanent ID is given and exists, accept it (confidence 1.0).
2. Otherwise retrieve up to five candidates with pg_trgm. Score each with a blend of trigram similarity and rarity-weighted token overlap, plus a small bonus if the city matches.
3. Decision:

| Score | Action |
|---|---|
| ≥ auto-accept | Accept |
| between review floor and auto-accept | Accept but ask an officer to confirm |
| < review floor | Officer picks manually |

The two thresholds start as `default_pending_data` and are tuned on about 100 labelled name variants.

*(proposed)* Starting blend: `score = 0.5 * trigram + 0.5 * idf_overlap + 0.05 city bonus`, capped at 1.0. The handbook gives no numbers, so tune these on the labelled variants.

```sql
SELECT id, name, normalized_name, city,
       similarity(normalized_name, :q) AS trgm
FROM institutions
WHERE normalized_name % :q
ORDER BY trgm DESC
LIMIT 5;
```

## 7.3 The six pair features

| Feature | Meaning | Why it helps |
|---|---|---|
| `inst_conf` | Lower of the two institution-match confidences | Do not trust an overlap built on a shaky institution match |
| `cos` | Cosine similarity of the two complaint embeddings | Same issue, different words |
| `same_category` | 1 if categories equal | Cheap, strong signal |
| `log_days` | Log of days between receipt dates | Cases close in time are more likely related |
| `both_active` | 1 if both still open | Overlap matters for coordination only while action is possible |
| `cross_bureau` | 1 if handled by different Bureaus/Cells | The coordination risk the PS cares about |

*(proposed)* Use `ln(1 + days)` so same-day cases do not give log(0).

## 7.4 Worked scoring example (illustrative weights)

| Feature | x | weight | contribution |
|---|---|---|---|
| inst_conf | 1.00 | 1.5 | +1.50 |
| cos | 0.87 | 6.0 | +5.22 |
| same_category | 1 | 1.2 | +1.20 |
| log_days (6 days) | 1.95 | -0.4 | -0.78 |
| both_active | 1 | 1.0 | +1.00 |
| cross_bureau | 1 | 0.8 | +0.80 |
| intercept | - | - | -7.00 |

`z = 1.94`, so `p = 1/(1+e^-1.94) ≈ 0.87`. The negative intercept encodes the real base rate: with no evidence, a pair is "unrelated".

*(proposed)* Show each bar as `wi * (xi - mean xi)`, meaning movement relative to a typical pair; it reads better than raw contributions.

## 7.5 Overlap levels

| Level | Meaning | Example | What the user sees |
|---|---|---|---|
| High | Same institution, same issue, different Bureaus/Cells, both open | Fake faculty at PGRC and RB | "Potential Overlapping Cases – Coordination Required" to both units |
| Medium | Same institution, related or different issue, both open | Fee complaint at PGRC, approval violation at RB | "Related cases" notice |
| Info | Same institution, similar but older or closed case | Past resolved complaint | Shown in institution history only |

*(proposed)* Level logic, which combines probability with case state:

```python
def level(p, a, b, thr):
    if not (a.is_open and b.is_open):
        return "info" if p >= thr.medium else None
    if a.bureau_id != b.bureau_id and p >= thr.high:
        return "high"
    if p >= thr.medium:
        return "medium"
    return None
```

This is one reading of the handbook's table. Confirm it with the team.

## 7.6 Coordination actions

| Action | Effect |
|---|---|
| Link | Marks the overlap as confirmed; writes a "link" entry on both case timelines |
| Nominate lead | Records which Bureau/Cell leads; the other becomes supporting |
| Hold parallel action | Sets a flag on the non-lead case so officers see action is on hold pending coordination |
| Dismiss (reason required) | Marks "not related"; reason stored; becomes a training label |

**[OPEN]** Who is the default lead is an AICTE policy question. The prototype lets officers choose; do not claim the system decides.

## 7.7 Worked example

| When | What happens | System response |
|---|---|---|
| Day 1 | Student complains to PGRC: faculty listed on ABC Engineering College's website do not teach there | Case P-1 created; institution resolved by AICTE ID; no other active cases; no alert |
| Day 7 | RB registers an inspection finding: teaching staff at ABC College not as per norms | Case R-1 created; embedding compared with P-1; same institution, different Bureaus, both open |
| Day 7 (seconds later) | - | High overlap alert to PGRC and RB with the score breakdown |
| Day 7 | RB nominates itself lead; PGRC case gets "hold parallel action" | Link recorded on both timelines; decision in the audit trail |
| Day 40 | Another PGRC complaint about ABC College's fees | Different issue: Medium or Info, not a High duplicate |

## 7.8 Training and thresholds

```python
base = LogisticRegression(class_weight="balanced", max_iter=1000)
cal  = CalibratedClassifierCV(base, method="sigmoid", cv=3)
# split BY INSTITUTION (GroupShuffleSplit); use group-aware folds inside calibration too
```

- High threshold: lowest score with precision at or above 0.90.
- Medium threshold: highest score with recall at or above 0.90.
- Thresholds belong to a model version; a retrained model needs freshly derived thresholds.

---

# Part 8: The learning loop

```
officer decision (link / dismiss)
  → label stored with the pair's raw features (proposed)
  → enough new labels?  no → keep collecting
  → retrain → evaluate on held-out institutions
  → store as model_versions row, status = shadow
  → shadow scores every new pair silently (no alerts)
  → admin reviews disagreements
  → promote (shadow → active, old → retired)  or  reject
  → rollback possible
```

| Step | Detail |
|---|---|
| Labels | Link = 1, dismiss = 0. Use a fixed list of dismissal reasons *(proposed)*; train only on reasons that truly mean "not the same issue" |
| Retrain trigger | Scheduled, or enough new decisions with both classes present. The minimum counts are an open decision; record them as `default_pending_data` |
| Shadow mode | Candidate scores new pairs in the background; officers see only the active model's output |
| Disagreement review | Show pairs where active and shadow differ, plus the would-be change in alert volume |
| Promotion | Single transaction: old → retired, candidate → active, audit entry; a unique index guarantees at most one active model *(proposed)* |
| Rollback | Re-activate the most recently retired version |

**Selection bias warning.** Officers only review pairs the model flagged, so real labels cover the flagged region and never reveal missed overlaps. Mitigations *(proposed)*: keep synthetic data in the training mix tagged by origin, sample some below-threshold pairs for an audit queue, and never claim real-world recall from officer decisions alone.

**Changing the embedding model** makes old vectors incomparable. Each case stores `embedding_model`; a model change means re-embedding everything, then retraining.

---

# Part 9: Online/Offline mode and privacy

Each optional capability has both an online and an offline provider. A router picks at runtime. Nothing is swapped at deployment.

```
Feature code asks for a capability
  → Router: 1) sensitive case?  2) per-capability setting  3) global mode
  → Offline provider (local): always available
  → Online provider: only if allowed → Egress gateway (redact + log)
Strictest rule wins. Online fails → fall back to local, never fail open.
```

| Capability | Online provider | Offline provider |
|---|---|---|
| Email alerts | Hosted email service | In-app alerts only (always on) |
| Overlap explanation text | Optional hosted language model **[OPEN]** | Template from the score breakdown (always available) |
| Embeddings and scoring | Local model | Local model (identical in both modes) |
| Documents | Object storage | Same object storage; no external hand-off |
| Frontend assets, fonts, maps | Bundled | Bundled (never loaded from a CDN) |

**Three switches, strictest wins:** the case's sensitive flag, a per-capability setting, the global mode. Changes apply at runtime without restart and are audit-logged. If an online provider fails, the system falls back to the local one and tells the user.

**What "offline" enforces in the prototype:** the application-level router and egress gateway block calls and record every attempt in the egress ledger; in the container demo the backend sits on an internal Docker network with no outbound internet.

**What it does not claim:** cloud-network (VPC) controls and single sign-on are production roadmap items.

**Storage decision:** one PostgreSQL connection string and one object-storage interface for both modes. Do not describe a separate offline database.

---

# Part 10: Data model

| Entity | Key fields | Notes |
|---|---|---|
| `institutions` | aicte_permanent_id, name, normalized_name, city, state, region | Trigram index on normalized_name |
| `cases` | institution_id, category, description, received_date, status, bureau_id, officer_id, sla_due_date, sensitivity_flag, hold_parallel, embedding vector(384), embedding_model | Vector and full-text indexes |
| `actions` | case_id, bureau_id, officer_id, action_type, remarks, meta, created_at | The timeline |
| `documents` | action_id, file_name, storage_key, checksum, storage_kind | Files live in object storage |
| `overlap_links` | case_a, case_b, level, probability, breakdown, status, lead_bureau_id, decision_reason, explanation_src, model_version | Unique pair; training labels |
| `alerts` | kind, case_id, overlap_id, bureau_id, message, read | Overlap, pending, escalation, SLA |
| `bureaus`, `officers`, `categories`, `sla_rules` | Org structure, access, deadlines with source_reference | Deadlines are policy |
| `model_versions`, `parameter_registry` | metrics, status (shadow/active/retired); parameter, value, origin, derived_from | The model card |
| `policy_settings`, `egress_ledger`, `audit_log` | scope/value; capability/destination/outcome; actor/action/entity | Governance |

*(proposed)* Additions to consider: raw feature JSON on `overlap_links` for clean retraining, and a `shadow_scores` table for shadow mode.

---

# Part 11: Frontend structure

| Page | Content | Backed by |
|---|---|---|
| Login and layout | Role-aware navigation, mode bar | `auth` |
| Dashboard | KPI cards, Bureau workload, overlap banner, charts | `dashboard` |
| Case list + filters | Filter bar, fuzzy and full-text search | `cases`, search |
| Case detail | Fields plus action timeline, documents | `cases/actions`, `cases/documents` |
| Institution 360 | All cases from all units, overlaps, alerts | `institutions/profile` |
| Overlap review | Side-by-side cases, explanation card, link/lead/hold/dismiss | `overlap` |
| Alerts center | Overlap, pending, escalation, SLA alerts | `alerts` |
| Reports | Charts, Excel/PDF export | `reports` |
| Admin | Users, categories, SLA rules, thresholds, mode policy, model card, audit log | `mlops`, `router`, `audit` |

Auto-refresh through TanStack Query gives the real-time feel by polling every few seconds.

---

# Part 12: Build order and dependencies

| Stage | Name | Output | Size |
|---|---|---|---|
| 0 | Tools and repo | Docker, Python, Node, Git; empty repository | S |
| 1 | Database | PostgreSQL in Docker with the full schema | S |
| 2 | Seed data | ~60 institutions, 400 cases, planted overlaps and hard negatives | M |
| 3 | Backend core | Login, cases, institutions, actions, dashboard statistics | M |
| 4 | Frontend shell | Login, layout, KPI cards, charts | M |
| 5 | Cases and institution pages | Filters, case detail with timeline, institution 360 | M |
| 6 | Overlap engine | Resolution, embeddings, calibrated scorer, scan on case creation | L |
| 7 | Coordination and alerts | Review screen, link/lead/hold/dismiss, alerts center | M |
| 8 | SLA worker and reports | Risk scan, escalation, Excel/PDF export | M |
| 9 | Mode router and egress | Online/Offline toggle, sensitive flag, ledger, tests | M |
| 10 | Evaluation and registry | Metrics vs baseline, model card, shadow mode | M |
| 11 | Optional hosted demo | Short-lived cloud demo with a strict budget and teardown | S |
| 12 | Demo and PPT | Rehearsed demo, final PDF | S |

**Dependency logic:**
- The schema (Stage 1) comes first because every module reads and writes it.
- Seed data (Stage 2) lets frontend and backend proceed without real data.
- The core API (Stage 3) must exist before the frontend pages (Stages 4 and 5).
- The overlap engine (Stage 6) needs institutions, cases and embeddings.
- Coordination and alerts (Stage 7) need the overlap engine.
- The router (Stage 9) is built late but touches alerts and explanations, so design those behind the capability interface from the start.

**Working agreements:** one Git branch per stage, merged only when its definition of done passes; nobody changes the schema alone; the API contract is the FastAPI `/docs` page; seed data is synthetic and says so.

---

# Part 13: Evaluation

| What | How | Report |
|---|---|---|
| Overlap detection quality | Labelled case pairs (true overlap = same institution and same underlying issue); split by institution; calibrated model | Precision and recall at High and Medium thresholds, PR-AUC, example false positives/negatives |
| Versus a baseline | Compare against "cosine similarity above a fixed cutoff" alone | Same metrics side by side |
| Institution matching | About 100 messy name variants labelled correct/incorrect | Auto-accept precision, review rate, recall |
| Alert volume | Count High and Medium alerts per active case per day | Evidence of manageable load |
| SLA warning | Replay closed cases | How early the warning arrives and how many false warnings |

**Synthetic data design:** templates per complaint issue with several paraphrases (including a few Hinglish); planted true overlaps handled by RB and PGRC; hard negatives (same institution, different issue); messy institution name variants; closed-case durations from a skewed distribution.

**Reporting rules:** say "synthetic"; show the baseline; show failures; never quote a number we did not measure; keep the evaluation script in the repository.

*(proposed)* Generator hygiene: derive labels from a hidden `latent_issue_id` kept out of the model's inputs; add category noise so `same_category` is not a perfect shortcut; hold out some paraphrases or whole issue types for the test set; check that the baseline does not already score near-perfectly, which would mean the hard negatives are too easy.

---

# Part 14: Claims we can and cannot make

| Safe to say | Do not say |
|---|---|
| Prototype on synthetic data demonstrates the full flow | "Tested on real AICTE data" |
| Alerts are explainable; thresholds are learned and recorded | "95% accuracy" before we have measured it |
| Offline mode makes no external calls; the egress ledger proves it in the demo | "Fully secure" or "compliant with government hosting rules" |
| Import adapter maps RB/PGRC data to one schema | "Integrated with AICTE's systems" |
| The system suggests; officers decide | "AI replaces officer decisions" |
| Rarity-weighted fuzzy matching built; Fellegi-Sunter via Splink planned | "Fellegi-Sunter implemented" unless it truly is |

Never mention internal cloud-credit limits on slides.

---

# Part 15: Risks and open decisions

| Risk | Likelihood | Mitigation |
|---|---|---|
| Synthetic data makes results look too good | High | Hard negatives, baseline comparison, inspect errors, state it openly |
| Too many features, weak story | High | Protect three things: overlap alert and coordination, institution 360, live dashboard |
| Embedding model too slow or too big for the host | Medium | CPU ONNX model; load once; test memory early; model name configurable |
| False alerts annoy officers | Medium | Precision-targeted High threshold; dismiss-with-reason; alert volume check |
| Overclaiming privacy or integration | Medium | Use the wording in Part 14; list what is roadmap |
| Library or cloud details change | Medium | Pin versions after it works; re-check pricing and extension support before any hosted step |
| Team capacity | Unknown | Stage plan lets us stop after any definition of done with a working demo |

**Open decisions for the team meeting:**

| # | Decision | Suggestion |
|---|---|---|
| 1 | Per-case sensitive flag that forces offline processing | Yes; cheap and a strong privacy story |
| 2 | "AUTO" routing mode | Skip unless time remains |
| 3 | Optional hosted language-model explanations | Roadmap slide only; template explanations in the build |
| 4 | Institution risk score and India region map | Stretch; only after Stage 10 |
| 5 | Team size, roles and available time | Needed to fix the stage plan |
| 6 | Does the round require a live link or accept a video? | Check the SIH instructions before any hosting work |
| 7 | Exact theme text, team ID and team name for the title slide | Copy from the SIH portal |
| 8 | Final project name | CaseNexus is a placeholder |

---

# Part 16: Glossary

| Term | Meaning |
|---|---|
| AICTE | All India Council for Technical Education |
| RB / PGRC | Regulation Bureau / Public Grievance Redressal Cell |
| CPGRAMS | Centralised Public Grievance Redress and Monitoring System |
| SLA | Prescribed time within which a case should be handled |
| Institution 360 | One page showing every case about an institution from every unit |
| Entity resolution | Deciding whether two records refer to the same real-world entity |
| Fellegi-Sunter | A statistical model that sums evidence from each field agreeing or disagreeing |
| EM algorithm | A method that estimates model parameters without labelled data |
| Trigram | A three-character piece of text, used to measure how alike two strings are |
| IDF | Inverse document frequency: makes rare words count more |
| Embedding | A list of numbers representing the meaning of a text |
| Cosine similarity | How closely two embeddings point in the same direction |
| pgvector | PostgreSQL extension for storing embeddings and similarity search |
| ONNX | A portable model format that runs fast on a CPU |
| Logistic regression | A simple model that turns weighted features into a probability |
| Calibration | Adjusting scores so they behave like real probabilities |
| Precision / recall | Share of alerts that are right / share of true overlaps found |
| PR-AUC | Area under the precision-recall curve; a summary for imbalanced problems |
| Hard negative | A look-alike pair that is NOT related, used to test false alarms |
| Alert fatigue | When too many alerts make users ignore all of them |
| Leakage | When test data secretly overlaps with training data, inflating results |
| Shadow mode | Running a new model silently beside the active one before switching |
| RBAC | Role-based access control |
| Egress ledger | A log of every attempt to send data outside the system |
| Synthetic data | Realistic but artificially generated data used because real data is unavailable |
