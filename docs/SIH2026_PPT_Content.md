# CaseNexus: Presentation Content
**Integrated Institution Complaint Monitoring and Status Dashboard · AICTE · PS ID 26264**

Section-by-section working content. Each section has: **Content** (what to put on the page), **Visual** (what to draw or chart), and where useful **Detail** (extra facts to draw from). `[brackets]` are blanks to fill. "CaseNexus" is a working title.

---

## Title

**CaseNexus**
One window for every institution complaint across AICTE Bureaus/Cells

- Problem Statement ID: 26264
- Organisation: AICTE
- Category: Software
- Team: `[team name]` · Team ID: `[id]`

**Visual:** dark background, a simple graphic of three building icons (institutions) linked by lines to one central dashboard icon.

---

## Background

**AICTE and the units that handle complaints**

- AICTE (All India Council for Technical Education) approves and regulates technical institutions
- Students, faculty and stakeholders complain about institutions
- Typical complaints: fake or insufficient faculty, excess fees, unapproved courses or intake, withheld certificates, weak infrastructure, false claims of approval
- Different units handle these complaints:

| Unit | Role |
|---|---|
| RB: Regulation Bureau | Regulatory and enforcement action |
| PGRC: Public Grievance Redressal Cell | Receives and resolves grievances, including those arriving via the CPGRAMS portal |
| Other Bureaus/Cells | Other functions that may touch the same institution |
| Regional Offices/Centres | Work with institutions in their region |

**Visual:** org-style diagram: AICTE at the top, four unit boxes below, arrows from "students / faculty / stakeholders" into the units.

**Detail:** AICTE's grievance page describes PGRC as handling grievances from students, faculty and stakeholders of approved institutions, ragging complaints, norm-violation complaints and CPGRAMS grievances (ref 1).

---

## The problem

**Several units, one institution, no shared view**

- Each unit keeps its own records
- No centralised, real-time view of cases
- The same institution can be handled by RB, PGRC and others at the same time
- Nobody can easily answer: *"Who is dealing with this institution right now?"*

**Visual:** left side: two separate record boxes (RB records, PGRC records) both pointing to one college, with a red "?" between them. (Same picture as the left half of the "Problem to solution" section.)

---

## Consequences

**What goes wrong today**

| Problem | Example |
|---|---|
| Duplicated effort | Two officers investigate the same fake-faculty allegation |
| Conflicting action | PGRC closes a grievance as resolved while RB issues a notice on the same issue |
| Delays in disposal | Cases wait while units look for each other's status |
| No ownership | No single answer on who leads for an institution |
| No institutional memory | Officers act without seeing the institution's earlier complaints |

**Visual:** five icon cards in a row, one per consequence.

---

## What the problem statement asks for

**Objectives**

- View all institution-related cases in one place
- Identify the Bureau/Cell currently handling each case
- Track complete status and movement
- Identify overlaps between RB, PGRC and other units on the same institution
- Avoid duplicate action; ensure coordination
- Monitor pending, disposed, under-process, transferred and escalated cases
- Generate institution-, region-, Bureau/Cell- and status-wise reports
- Alert on pending cases and approaching timelines

**Innovation asked for:** use data matching, rule-based logic and/or AI-assisted analytics to find complaints about the same institution even when descriptions or case references differ, and display **"Potential Overlapping Cases – Coordination Required"**.

**Visual:** checklist graphic of the eight objectives; the innovation line in a highlighted banner.

---

## Our solution

**CaseNexus: a coordination layer, not only a dashboard**

*Tagline: "No AICTE officer should act on an institution blind again."*

| Layer | What it does |
|---|---|
| 1. Visibility | One place for all cases, owners, status and history |
| 2. Intelligence | Detects related cases across units, even when wording and references differ, and explains why |
| 3. Coordination | Link cases, nominate a lead Bureau/Cell, hold parallel action, record the decision |

**Visual:** three stacked layers (bottom to top: Visibility, Intelligence, Coordination) with a dashboard screenshot or mockup beside them.

---

## Problem to solution

**Same institution, two cases: now they meet**

- **Before:** RB case and PGRC case about the same college sit in separate records
- **After:** the dashboard shows both side by side, flags them and offers four actions

**Visual (draw this exactly):**
- Left half "TODAY": two boxes "RB records: action initiated" and "PGRC records: under process", both arrows to a box "ABC Engineering College", a red "?" between the first two.
- Right half "WITH CASENEXUS": a dashboard frame containing an amber banner **"Potential Overlapping Cases – Coordination Required"**, the two cases side by side, a badge "87% likely related (illustrative)", and four buttons: Link · Lead · Hold · Dismiss.

---

## Worked example

**One scenario, start to finish**

| When | What happens | System response |
|---|---|---|
| Day 1 | Student complains to PGRC: faculty listed on ABC College's website do not teach there | Case created; institution resolved by AICTE ID; no other active cases; no alert |
| Day 7 | RB registers an inspection finding: teaching staff not as per norms | Case created; compared with the PGRC case: similar meaning, same institution, different units, both open |
| Day 7 | (seconds later) | **High overlap** alert to both units with a score breakdown |
| Day 7 | Officers review side by side; RB leads; PGRC case gets "hold parallel action" | Both timelines record the link; decision logged |
| Day 40 | PGRC receives a fee complaint about the same college | Different issue: shown as Medium or Info, not as a duplicate |

**Visual:** horizontal timeline with the five rows as milestones.

---

## Feature set

**All eight required areas covered**

| # | PS area | What we build |
|---|---|---|
| 1 | Centralised institution profile | Institution page keyed on AICTE Permanent ID; complaint history across all units |
| 2 | Case tracking | Case ID, receipt date, category, status, Bureau/Cell, officer, last action, next action, date of last action, expected disposal date |
| 3 | Overlap detection | Automatic detection, alerts, linking of related cases |
| 4 | Real-time dashboard | Total, pending, under process, disposed, transferred, beyond timeline; institution-wise status; Bureau/Cell workload |
| 5 | Workflow and history | Chronological timeline with officer, unit, timestamp, remarks, documents, transfers, escalations |
| 6 | Search and filters | Institution name, AICTE ID, case ID, Bureau/Cell, region, category, status, date range |
| 7 | Alerts | Overlap, pending reminders, escalation, SLA/timeline |
| 8 | Reports | Bureau, region, institution, ageing, disposal rate, overlaps, monthly/quarterly; PDF/Excel export |

**Visual:** 2 × 4 icon grid, one tile per area.

---

## What makes it different

**Beyond a plain dashboard**

1. **Two-question engine:** "same institution?" and "same issue?" answered separately, then combined
2. **Explainable alerts:** every flag shows which signals raised or lowered the score
3. **Learned, calibrated thresholds:** the High level is set to reach a target precision; every parameter is recorded in a registry with its origin
4. **Coordination actions:** link, nominate lead, hold parallel action, dismiss with reason; dismissals become training labels
5. **Pre-action check:** opening a case shows other active cases on the same institution
6. **Privacy switch:** Online/Offline mode with a per-case sensitive flag
7. **Multilingual:** handles Hindi and other Indian-language complaints (model supports 50 languages)

**Visual:** numbered cards or a hexagon layout.

---

## Case lifecycle

**From receipt to disposal**

`Received → Registered → Assigned → Under process → Action taken → Disposed`

- **Side events:** Transferred, Escalated (recorded on the timeline)
- **Reopened:** a disposed case can return to process

**Visual:** left-to-right chevron flow with the two side events below and a loop arrow for "Reopened".

---

## End-to-end workflow

**Ten steps**

1. **Intake:** complaint arrives at RB, PGRC or a Regional Office; enters via import/sync or manual registration
2. **Institution resolution:** AICTE ID first, then fuzzy matching; low confidence goes to an officer
3. **Case creation:** case ID, category (suggested, officer-confirmable), SLA deadline, unit, officer; text embedding generated
4. **Overlap scan:** compare with the institution's other cases
5. **Classify and notify:** High / Medium / Info; alerts to both units
6. **Coordination:** link, nominate lead, hold parallel action, or dismiss
7. **Action tracking:** each step logged with officer, unit, timestamp, remarks, documents
8. **SLA monitoring:** scheduled scan raises risk, breach and escalation alerts
9. **Disposal:** closed with outcome; linked cases confirm consistent outcomes
10. **Reporting:** dashboards and exports

**Visual:** vertical numbered flow or a swim-lane chart with lanes: Complainant/Source · System · Officer · Management.

---

## Users and access

| Role | Sees | Can do |
|---|---|---|
| Officer (RB, PGRC, other Bureau) | Cases for institutions they touch; overlap alerts | Register cases, log actions, decide overlaps |
| Regional Office | Their region's institutions and cases | Same, limited to the region |
| Management / Competent Authority | Everything; analytics; escalated cases | Final decisions on conflicts |
| Admin | Configuration, model card, audit log | Users, categories, SLA rules, thresholds, online/offline policy |

- Complainant identity masked by default; revealed only to permitted roles, with an audit entry
- Append-only audit log of decisions, mode changes, exports and sensitive views

**Visual:** role pyramid or four role cards with eye (sees) and hand (can do) icons.

---

## Overlap engine, pipeline

**From a new complaint to an officer decision**

1. New complaint arrives (text, ID?, name, city)
2. Resolve institution: ID exact, else fuzzy + rarity-weighted words
3. Embed complaint text locally (384 numbers)
4. Fetch other cases of the same institution
5. Build 6 features per case pair
6. Calibrated model gives probability + per-feature contributions
7. Level: High / Medium / Info using learned thresholds
8. Alert both units + explanation
9. Officer: link, lead, hold or dismiss (with reason)
10. Decision becomes a training label → scheduled retraining

**Visual:** two-row flowchart (steps 1–5 top, 6–10 bottom), colour-coded: grey intake, blue matching, amber decision, green action, purple learning. Dashed loop from step 10 back to step 6.

---

## Question 1: same institution?

**Institution resolution ladder**

| Rung | Method | Example |
|---|---|---|
| 1 | Exact AICTE Permanent ID | ID equals → confidence 1.0 |
| 2 | Trigram similarity (`pg_trgm`) | "government engineering college pune" vs "govt engg college pune" |
| 3 | Rarity-weighted words | "ambedkar" counts more than "college" |
| 4 | Probabilistic linkage (Fellegi–Sunter, via Splink) | Planned upgrade |

**Rarity weight:** `w(word) = ln((N+1) / (df+1)) + 1`, where N = number of institutions and df = how many contain the word. Name similarity = total weight of shared words ÷ total weight of all words in either name.

**Decision rule:** score ≥ auto-accept threshold → accept; between review floor and auto-accept → accept and ask an officer to confirm; below → officer picks manually.

**Visual:** ladder graphic with four steps; a small example showing two messy names and the matched institution.

---

## Question 2: same issue?

**Semantic similarity with embeddings**

- A sentence embedding turns a complaint into 384 numbers; similar meaning → similar direction
- Model: `paraphrase-multilingual-MiniLM-L12-v2` · 50 languages · Apache-2.0
- Runs on CPU through ONNX Runtime (fastembed); no GPU
- Stored in PostgreSQL with `pgvector`; compared by cosine similarity (`similarity = 1 − cosine distance`)

**Example pair (same issue, different words):**
- PGRC: "Faculty listed on the website don't actually teach here."
- RB: "Inspection found faculty not as per AICTE norms."

**Limit:** topical similarity can match legally different complaints (for example fees too high vs refund denied), so similarity is combined with other features and tested on look-alike pairs that are *not* related.

**Visual:** two sentences feeding into a vector icon, then a gauge showing similarity.

---

## Scoring and overlap levels

**Six features per case pair**

| Feature | Meaning |
|---|---|
| inst_conf | Lower of the two institution-match confidences |
| cos | Cosine similarity of complaint embeddings |
| same_category | 1 if categories are equal |
| log_days | Log of days between receipt dates |
| both_active | 1 if both cases are open |
| cross_bureau | 1 if handled by different Bureaus/Cells |

**Model:** logistic regression, probability-calibrated (sigmoid / Platt scaling)

**Levels**

| Level | Meaning | What the user sees |
|---|---|---|
| **High** | Same institution, same issue, different units, both open | "Potential Overlapping Cases – Coordination Required" to both units |
| **Medium** | Same institution, related or different issue, both open | "Related cases" notice |
| **Info** | Same institution, older or closed similar case | Institution history only |

**Visual:** feature table left; three coloured level badges (red, amber, grey) right.

---

## Explainable alert and coordination

**What the officer sees**

- Side-by-side comparison of the two cases
- Probability badge (e.g. "87% likely related", illustrative)
- Per-feature bars: blue pushes toward "related", red pushes away
- Text explanation, e.g. "Same institution; complaint text 87% similar; same category; received about 6 days apart; handled by different Bureaus/Cells."

**Coordination actions**

| Action | Effect |
|---|---|
| Link | Marks overlap confirmed; writes a link entry on both timelines |
| Nominate lead | Records which unit leads; the other supports |
| Hold parallel action | Flags the non-lead case as on hold pending coordination |
| Dismiss (reason required) | Marks "not related"; reason stored as a training label |

**Visual:** mockup of the review card: header banner, two case panels, bar list, four buttons. Bars: institution match (long), text similarity (longest), same category, days apart, both open, different units (blue); older closed case (short, red).

---

## Learned parameters and model lifecycle

**No unexplained constants**

- High threshold = lowest score that reaches the target precision (initial policy target 0.90)
- Medium threshold = set for a target recall (initial 0.90)
- Targets are recorded as policy; threshold values are learned
- Every parameter is stored in a **parameter registry**: value, origin (learned / synthetic-bootstrap / policy / default-pending-data), derived-from, metrics, model version
- Shown in the admin panel as a **model card**

**Lifecycle:** train → evaluate (split by institution) → shadow mode (scores silently beside the active model) → promote → rollback if needed → retrain on officer decisions

**Data status:** no labelled AICTE data exists at the start; the prototype bootstraps from a synthetic labelled set (paraphrased true overlaps plus look-alike non-overlaps) and replaces it with officer confirm/dismiss labels over time.

**Visual:** circular lifecycle diagram with five nodes; side table showing a sample registry row.

---

## SLA and alerts

**Policy deadlines, data-driven warnings**

- Deadlines per category are **policy**: configurable values with a source reference
- "Approaching deadline" warnings are **data-driven**: probability that a case of this category and age will breach, estimated from historical disposal times
  `P(breach) = (closed cases that took longer than D) ÷ (closed cases that took longer than the current age)`
- If fewer than 15 historical cases exist, fall back to simple deadline checks
- Escalation after a configurable number of days overdue

| Alert | Trigger |
|---|---|
| Overlap (High / Medium) | New or updated case matches another unit's case |
| Pending reminder | Case idle beyond a set period |
| SLA risk | Breach probability above the registry threshold |
| SLA breach | Deadline passed |
| Escalation | Overdue beyond the escalation period |

**Channels:** in-app alerts centre always; email on the online route.

**Visual:** a case timeline with a deadline marker and three coloured zones (on track, at risk, breached).

---

## Architecture

**Three tiers, same components everywhere**

- **Presentation:** React + TypeScript web app (dashboard, case list, timeline, institution page, overlap review, reports, admin)
- **API and services (FastAPI):** auth and roles · cases, actions, search · overlap engine · SLA worker (APScheduler) · capability router · reports and import adapter · embeddings + scorer · egress gateway and ledger
- **Data:** PostgreSQL (cases, institutions, actions, alerts, audit log, parameter registry; `pg_trgm`, `pgvector`, full-text search) · S3-compatible object storage (documents, exports)
- **Inputs:** RB system · PGRC system · Regional data · CSV/API import

**Visual:** layered box diagram with the import sources entering from the bottom or side and a dotted box "egress gateway" attached to the API tier.

---

## Data pipelines

| Pipeline | Trigger | Steps | Output |
|---|---|---|---|
| Ingestion | New complaint or import | Validate; resolve institution; assign category, SLA date, officer | Case + first action |
| Embedding | Case created or edited | Embed text locally; store vector and model id | Vector on the case |
| Overlap scan | After embedding | Fetch institution's cases; build features; score; classify | Overlap row + alerts |
| SLA scan | Every 15 min (configurable) | Compute age, overdue days, breach risk | Risk, breach, escalation alerts |
| Retraining | Scheduled | Build pairs from confirm/dismiss labels; train; evaluate | New model (shadow) |
| Promotion | After shadow review | Compare; approve; switch active model | Active model |
| Reporting | On request / scheduled | Aggregate by unit, region, institution, age, month | Charts, Excel, PDF |
| Audit | Every sensitive action | Append who, what, when, before/after | Audit rows |

**Visual:** pipeline strip per row, or one combined swim-lane.

---

## Online / Offline mode and privacy

**Both routes coexist; the router decides per request**

- Strictest rule wins: **(1) sensitive case flag → (2) per-capability setting → (3) global mode**
- Changes apply at runtime without restart and are audit-logged
- Online provider fails → fall back to local, never silently go online
- Egress gateway redacts personal data and writes every external call (or blocked attempt) to an **egress ledger**

| Capability | Online | Offline |
|---|---|---|
| Email alerts | Hosted email service | In-app alerts only |
| Explanation text | Optional hosted language model | Template built from the score breakdown |
| Embeddings and scoring | Local model | Local model (identical) |
| Documents | Object storage | Same object storage, no external hand-off |
| Frontend assets, fonts, maps | Bundled | Bundled (no CDN) |

**One database, one object store for both modes.** Offline means no data leaves the system's own environment to third-party services.

**Visual:** flow: Feature code → Router → (green) Offline provider / (amber) Online provider → (red) Egress gateway. Lock icon on "sensitive case".

---

## Technology stack

| Layer | Tools | Why |
|---|---|---|
| Frontend | React + TypeScript, Vite, Tailwind CSS + shadcn/ui, TanStack Query/Table, Recharts | Component model for dashboards and tables; auto-refresh for live feel |
| Backend | Python, FastAPI, Pydantic, SQLAlchemy, Alembic, JWT + bcrypt | Async API, auto API docs, Python hosts the ML stack |
| Database | PostgreSQL + `pg_trgm` + `pgvector` + full-text search | Linked relational data; fuzzy and vector search in one database |
| Storage | S3-compatible object storage | Documents and exports |
| AI / matching | fastembed (ONNX) multilingual MiniLM, scikit-learn, rapidfuzz; Splink as planned upgrade | CPU-only, explainable, offline-capable |
| Jobs | APScheduler | Light periodic workloads |
| Packaging | Docker, Docker Compose | Same containers on a laptop, one server or a cloud |
| Quality | pytest, Vitest, Ruff, ESLint | Tests and code quality |

**Not used, and why:** Celery/Redis/RabbitMQ (job volume too small), Elasticsearch/OpenSearch (PostgreSQL covers fuzzy and full-text search), separate vector database (`pgvector` is enough), Kubernetes (too heavy), mandatory LLM (embeddings plus a linear model are explainable and cost nothing per call).

**Visual:** logo wall grouped by layer.

---

## Data model

| Table | Key fields |
|---|---|
| institutions | AICTE permanent ID, name, normalised name, city, state, region, type |
| cases | institution, category, description, received date, status, unit, officer, SLA due date, sensitivity flag, hold flag, embedding (384-dim), embedding model |
| actions | case, unit, officer, type, remarks, metadata, timestamp |
| documents | action, file name, storage key, checksum, storage kind |
| overlap_links | case A, case B, level, probability, feature breakdown, status (suggested / confirmed / dismissed), lead unit, decision reason, explanation source, model version |
| alerts | kind, case, overlap, unit, message, read |
| bureaus, officers, categories, sla_rules | Organisation, access, deadlines with source reference |
| model_versions, parameter_registry | Metrics, status (shadow / active / retired); parameter, value, origin |
| policy_settings, egress_ledger, audit_log | Mode policy; external-call log; audit trail |

**Visual:** simple ER diagram centred on `cases`, with `institutions`, `actions`, `overlap_links` and `alerts` attached.

---

## Prototype and implementation plan

**Prototype data (synthetic):** about 60 institutions and 400 cases, with planted true overlaps and look-alike non-overlaps, messy institution names, and a few Hinglish complaints. `[update to actual seeded numbers]`

| Stage | Output |
|---|---|
| 0 Tools and repo | Docker, Python, Node, Git |
| 1 Database | PostgreSQL with full schema |
| 2 Seed data | Institutions, cases, labelled pairs |
| 3 Backend core | Login, cases, institutions, actions, dashboard statistics |
| 4 Frontend shell | Login, layout, KPIs, charts |
| 5 Cases and institution pages | Filters, timeline, institution 360 |
| 6 Overlap engine | Resolution, embeddings, calibrated scorer |
| 7 Coordination and alerts | Review screen, link/lead/hold/dismiss, alerts centre |
| 8 SLA worker and reports | Risk scan, escalation, Excel/PDF export |
| 9 Mode router and egress | Online/Offline toggle, sensitive flag, ledger |
| 10 Evaluation and registry | Metrics vs baseline, model card, shadow mode |

**Visual:** staircase or Gantt-style chart of the stages, grouped into Foundation (0–3), Product (4–5, 7–8), Intelligence (6, 10), Governance (9).

---

## Evaluation

| What | How | Reported |
|---|---|---|
| Overlap detection quality | Labelled case pairs; split by institution so test institutions are unseen | Precision, recall, PR-AUC at High and Medium thresholds |
| Versus a baseline | "Cosine similarity above a fixed cutoff" alone | Same metrics side by side |
| Institution matching | About 100 messy name variants labelled correct/incorrect | Auto-accept precision, review rate |
| Alert volume | Count of High and Medium alerts per active case per day | Manageable load |
| SLA warning | Replay of closed cases | Lead time of warnings, false warnings |

**Results** *(fill after measuring):* High-level precision `[X]` · recall `[X]` · PR-AUC `[X]` · baseline precision `[X]` · recall `[X]`

**Visual:** precision–recall curve with the chosen High and Medium thresholds marked; a bar comparison of CaseNexus vs baseline.

---

## Feasibility

- **Technical:** all components are mature open-source software; the embedding model runs on CPU
- **Operational:** cases arrive through import/sync or one registration screen; no double entry
- **Economic:** no licence fees; one small server or container host is enough to start
- **Deployment:** containers + standard PostgreSQL + S3-style storage, so it can run in an AICTE data centre, a government cloud or a public cloud `[hosting rules to be confirmed with AICTE]`
- **Proof:** the prototype demonstrates the full flow end to end

**Visual:** five tick-box tiles.

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| RB and PGRC source formats unknown | Import adapter (CSV/API) into one common schema |
| No labelled real data at the start | Synthetic bootstrap, parameters labelled by origin, retrain from officer decisions |
| False alerts cause alert fatigue | High threshold set for target precision; dismiss-with-reason feedback; alert-volume check |
| Messy institution names / missing IDs | ID first; fuzzy rarity-weighted matching; human review for low confidence |
| Sensitive complainant data | Role-based access, masking, audit log, offline mode, per-case sensitive flag |
| SLA rules differ by category | Configurable deadlines with source reference |
| Low adoption | Single window; pre-action banner; minimal extra entry |
| Model drift | Track dismissal rate; shadow mode before promotion |

**Visual:** two-column risk → mitigation table with warning and shield icons.

---

## Impact and benefits

| Audience | Impact |
|---|---|
| RB, PGRC, other units | See each other's cases; avoid duplicate or conflicting action |
| Regional Offices | Region-scoped view with full institution history |
| Senior management | Live KPIs, ageing, workload, escalated cases |
| Students, faculty, complainants | Faster, more consistent resolution; identity protected |
| Institutions | Consistent, coordinated regulatory treatment |

**Benefits**
- **Governance:** single source of truth; no conflicting parallel actions; evidence-based decisions
- **Social:** quicker redress; transparency and accountability; complainant privacy
- **Economic:** officer time saved on duplicate work; open-source stack; prioritisation of high-risk institutions
- **Environmental:** paperless case tracking and reporting

**Metrics to track in a pilot:** duplicate-action rate · time to detect overlap · pending-case ageing · share of cases breaching timeline · share of High alerts confirmed by officers

**Visual:** audience icons on the left, benefit tiles on the right.

---

## Roadmap

| Phase | Scope |
|---|---|
| Now (prototype) | Single-window dashboard, overlap engine, coordination actions, SLA alerts, reports, online/offline router |
| Next | Fellegi–Sunter institution linkage via Splink; institution risk score; India region map; category suggestion classifier |
| Later | Optional language-model explanations (online only); OCR for scanned complaints; single sign-on with AICTE systems; predictive delay analytics (survival models); strictly offline on-premise deployment |

**Visual:** three-step roadmap arrow.

---

## References

**Problem context**
1. AICTE, Grievance Redressal page: https://aicte.gov.in/node/422
2. PIB, CPGRAMS document (Dec 2024; 21-day timeline, scale): https://static.pib.gov.in/WriteReadData/specificdocs/documents/2024/dec/doc20241230478501.pdf

**Method and theory**
3. Fellegi, I. P. and Sunter, A. B. (1969). *A Theory for Record Linkage.* Journal of the American Statistical Association, 64: https://pubs.dbs.uni-leipzig.de/dc/node/742
4. Splink (probabilistic record linkage, Fellegi–Sunter, MIT): https://pypi.org/project/splink/
5. Reimers, N. and Gurevych, I. (2019). *Sentence-BERT.* arXiv:1908.10084: https://arxiv.org/abs/1908.10084
6. Model card, paraphrase-multilingual-MiniLM-L12-v2 (384-dim, 50 languages, Apache-2.0): https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
7. scikit-learn, CalibratedClassifierCV (sigmoid and isotonic): https://scikit-learn.org/dev/modules/generated/sklearn.calibration.CalibratedClassifierCV.html

**Tools**
8. FastEmbed (ONNX Runtime, CPU, Apache-2.0): https://github.com/qdrant/fastembed
9. pgvector (HNSW / IVFFlat, cosine distance): https://github.com/pgvector/pgvector
10. FastEmbed supported models: https://qdrant.tech/documentation/embeddings/fastembed/

---

## Appendix A: Glossary

| Term | Meaning |
|---|---|
| SLA | Prescribed time within which a case should be handled |
| Institution 360 | One page with every case about an institution from every unit |
| Embedding | List of numbers representing the meaning of a text |
| Cosine similarity | How closely two embeddings point in the same direction |
| Calibration | Adjusting scores so they behave like real probabilities |
| Precision / recall | Share of alerts that are right / share of true overlaps found |
| PR-AUC | Area under the precision–recall curve |
| Shadow mode | Running a new model silently beside the active one before switching |
| Egress ledger | Log of every attempt to send data outside the system |

## Appendix B: Colour and icon suggestions

- Intake / neutral: grey · Matching / system: blue · Decision / warning: amber · Action / success: green · Learning / governance: purple · Risk / blocked: red
- Icons: building (institution), scale (regulation), inbox (grievance), link (linking), pause (hold), lock (sensitive/offline), clock (SLA), bell (alerts)
