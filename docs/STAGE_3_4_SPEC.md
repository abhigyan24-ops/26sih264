# CaseNexus: Stage 3 (Backend core API) and Stage 4 (Frontend shell) Build Specification

**Project:** AICTE integrated complaint dashboard, SIH 2026, PS 26264 (working title CaseNexus)
**Audience:** the coding agent that builds Stages 3 and 4, and the team member reviewing its work
**Companion file:** `ANTIGRAVITY_PROMPT_STAGE_3_4.md` (the prompt that points at this spec)

> **Tags used below**
> - **[GUIDE]** means it comes from `AICTE_Prototype_Build_Guide.md` (Stage 3 and Stage 4 sections).
> - **[DELTA]** means this spec deliberately changes or adds to the guide. Each delta has an ID (D1, D2 ... for backend, F1, F2 ... for frontend) and a reason.
> - Everything uses **synthetic seed data**. Never describe it as real AICTE data.

---

## 1. Scope

### In scope
**Stage 3:** config, DB session, local embedding service, JWT auth with roles and region scoping, `auth`, `cases` (list, detail, create, add action) and `dashboard` endpoints, placeholder routers for the rest, the seed script run (Stage 2), backend tests.

**Stage 4:** Vite + React + TypeScript app, Tailwind, shadcn/ui, API client, routing with an auth guard, layout with sidebar, login page, dashboard page (KPIs and charts), placeholder pages for later stages.

### Out of scope (do not build now)
Overlap scoring and alerts (Stages 6 and 7), the case list and case detail pages (Stage 5), SLA worker and reports (Stage 8), mode router, egress ledger and mode bar (Stage 9), document upload, Alembic migrations, Docker for the backend or frontend, any change to `db/schema.sql`.

---

## 2. Prerequisites (verify first, report anything missing)

| Item | Requirement | How to check |
|---|---|---|
| Repo skeleton | Stage 0 done: `backend/`, `frontend/`, `db/`, `.gitignore`, `.env` | `ls`, `git log` shows tag `stage-0` |
| Python | **3.12 via uv** in `backend/.venv` (the machine's system Python is 3.14.2; do not use it) | `cd backend && uv run python --version` |
| Packages | Exactly as pinned in `backend/requirements.txt` / `requirements.lock.txt` | `uv pip check` |
| Docker | Docker running; `docker compose version` works | `docker info` |
| Node | Active LTS line of Node; record it in `frontend/.nvmrc` | `node -v` |
| Guide | `docs/AICTE_Prototype_Build_Guide.md` exists in the repo | If missing, stop and ask |
| Stage 1 | `docker-compose.yml` and `db/schema.sql` exist and the DB is up with 6 bureaus | `docker compose exec db psql -U aicte -d aicte -c "SELECT count(*) FROM bureaus;"` returns 6 |

If Stage 1 files are missing, build Stage 1 exactly as the guide's section 1 describes, as its own commit, then continue. **Never edit `db/schema.sql` during Stages 3 and 4.** If you think the schema is wrong, stop and report.

Port note: if port 5432 is already used by a local PostgreSQL, report it instead of changing the compose file silently.

---

## 3. Precedence rules

1. `docs/AICTE_Prototype_Build_Guide.md` Stage 3 and Stage 4 sections are the base. Copy its code, then apply the deltas in this spec.
2. Where this spec and the guide disagree, **this spec wins**, and the commit message must name the delta ID.
3. Where something is unspecified, make the smallest reasonable choice and list it in the final report. Do not invent features.
4. Python packages are fixed. Do not add or upgrade any package. If something seems to need a new package, stop and ask.

---

## 4. Execution order

Use one Git branch per stage; merge to `main` only when the stage's acceptance checks pass; tag `stage-3` and `stage-4`.

### Stage 3 (branch `stage-3-backend-core`)

| Phase | Work | Commit message |
|---|---|---|
| 3A | Database up and verified (Stage 1 check) | `chore: verify db` (only if files changed) |
| 3B | `app/config.py`, `app/db.py`, `app/services/embeddings.py` (guide 3.1 to 3.3, with D8) | `feat(backend): config, db session, embeddings service` |
| 3C | Prefetch the embedding model, then run the seed (`uv run python -m scripts.seed`) and the seed checks | `chore(data): seed synthetic data` (only if the script needed fixes) |
| 3D | `app/auth.py`, `routers/auth.py` (guide 3.4, 3.5, with D4) | `feat(backend): auth with roles and region scoping` |
| 3E | `services/resolution.py` (guide 6.1, D9), `services/overlap.py` stub, `routers/cases.py` (D1, D2, D5, D6, D7) | `feat(backend): cases list, detail, create, actions` |
| 3F | `routers/reports.py` dashboard (D3), placeholder routers, `main.py` (D10) | `feat(backend): dashboard statistics and app wiring` |
| 3G | Tests and smoke script (section 8) | `test(backend): stage 3 acceptance tests` |

### Stage 4 (branch `stage-4-frontend-shell`)

| Phase | Work | Commit message |
|---|---|---|
| 4A | Vite app, dependencies, Tailwind, shadcn, alias, proxy (section 10.1) | `chore(frontend): scaffold vite react ts with tailwind and shadcn` |
| 4B | `lib/api.ts`, auth helpers, `main.tsx`, route guard (10.2 to 10.4) | `feat(frontend): api client, routing, auth guard` |
| 4C | `Layout`, `Login`, placeholder pages (10.5) | `feat(frontend): layout, login and placeholder pages` |
| 4D | `Dashboard` (10.6) | `feat(frontend): dashboard with KPIs and charts` |
| 4E | Acceptance run, README notes | `docs: stage 4 notes` |

---

## 5. Stage 3 file map

| File | Purpose | Source |
|---|---|---|
| `backend/app/config.py` | `Settings` from `.env` (pydantic-settings) | [GUIDE] 3.1 + D8 |
| `backend/app/db.py` | SQLAlchemy engine, `SessionLocal`, `get_db` | [GUIDE] 3.2 |
| `backend/app/services/embeddings.py` | Local fastembed model, `embed_many`, `embed_one`, `vec_literal` | [GUIDE] 3.3 + D8 |
| `backend/app/auth.py` | Password check, JWT, `current_user`, `require_roles`, `scope_clause` | [GUIDE] 3.4 + D4 |
| `backend/app/routers/auth.py` | `POST /api/auth/login`, `GET /api/auth/me` | [GUIDE] 3.5 + D4 |
| `backend/app/routers/cases.py` | List, detail, create, add action | [GUIDE] 3.6 + D1, D2, D5, D6, D7 |
| `backend/app/routers/reports.py` | `GET /api/dashboard` | [GUIDE] 3.7 + D3 |
| `backend/app/routers/{institutions,overlaps,alerts,admin}.py` | Empty placeholders: `router = APIRouter(prefix=..., tags=[...])` | [GUIDE] 3.8 |
| `backend/app/services/resolution.py` | Institution resolution (pulled forward from Stage 6) | [GUIDE] 6.1 + D9 |
| `backend/app/services/overlap.py` | Stub: `def scan_overlaps(db, case_id): return []` | D9 |
| `backend/app/main.py` | App, CORS, routers, `/api/health` | [GUIDE] 3.8 + D10 |
| `backend/scripts/seed.py` | Synthetic data | [GUIDE] 2.2 (copy as is) |
| `backend/tests/` | Pytest acceptance tests | D14 |
| `backend/scripts/smoke_stage3.py` | Plain-Python smoke check of the DoD | D14 |

Create `__init__.py` files where missing so `python -m scripts.seed` and `uvicorn app.main:app` import correctly.

---

## 6. API contract (Stage 3)

All routes are under `/api`. All except login and health require `Authorization: Bearer <token>`.

| Method and path | Auth | Parameters | Success response |
|---|---|---|---|
| `GET /api/health` | none | none | `{"ok": true}` |
| `POST /api/auth/login` | none | form fields `username`, `password` (OAuth2 form) | `{"access_token": str, "token_type": "bearer"}`; 401 on bad credentials |
| `GET /api/auth/me` | any | none | `{id, username, full_name, role, bureau_id, region}` |
| `GET /api/cases` | any | `q, institution, aicte_id, bureau, region, category, status, date_from, date_to, overdue, limit (max 200), offset` | list of case summaries (fields in guide 3.6) |
| `GET /api/cases/{id}` | any | none | `{case, actions, overlaps, active_siblings}`; 404 if missing **or out of scope** (D2) |
| `POST /api/cases` | any | JSON `CaseIn` | 201 `{id, institution_review_needed, overlaps}`; 422 if institution unresolved, bureau or category unknown (D6) |
| `POST /api/cases/{id}/actions` | any | JSON `ActionIn` | 201 `{ok: true}`; 404 missing or out of scope; 422 invalid status or bureau (D5) |
| `GET /api/dashboard` | any | none | `{kpi, by_bureau, by_region, overlaps}` scoped to the user (D3) |

**Demo accounts** (created by the seed, password `demo123` for all): `rb1`, `rb2`, `pgrc1`, `pgrc2`, `south1` (regional, South), `mgmt1` (management), `admin`.

**Allowed case statuses** (from the schema): `received, registered, assigned, under_process, transferred, escalated, action_taken, disposed, reopened`.

---

## 7. Deltas from the guide (backend)

| ID | File | Problem in the guide's code | Required change |
|---|---|---|---|
| **D1** | `routers/cases.py` | The institution filter appends `i.normalized_name % :inst OR i.name ILIKE :instl` **without parentheses**, then joins filters with `AND`. SQL precedence makes the OR swallow the other filters. | Wrap it: `(i.normalized_name % :inst OR i.name ILIKE :instl)`. Test: `institution=pune&bureau=RB` must never return a PGRC case. |
| **D2** | `routers/cases.py` | `case_detail` ignores region scoping, so a regional user can open any case by ID. | Join `institutions i` and append `scope_clause(user)`; return 404 (not 403) when out of scope. Apply the same check in `add_action`. |
| **D3** | `routers/reports.py` | The overlap counts query ignores scoping, so a regional user sees global overlap numbers. | Join `overlap_links` to `cases` and `institutions` and apply `scope_clause`. Count a link if its `case_a` is in scope. |
| **D4** | `auth.py`, `routers/auth.py` | With `bcrypt==5.0.0`, passwords longer than 72 bytes raise `ValueError`, which would become a 500. (Verified.) | In `verify_password` catch `ValueError` and return `False`, so login returns 401. |
| **D5** | `routers/cases.py` `add_action` | An unknown `transfer_to` makes `tb` None, which violates `NOT NULL` and returns 500. An invalid `new_status` hits the CHECK constraint and also returns 500. A missing case is not checked. | Validate: case exists and in scope (404); `new_status` in the allowed list (422); `transfer_to` is a known bureau code (422). Perform the status update, `closed_date` and the action insert in one transaction. Reopening (`reopened`) should clear `closed_date`. A full status machine comes later; do not build it now. |
| **D6** | `routers/cases.py` `create_case` | Unknown `bureau_code` or `category` gives an obscure DB error. | Look both up first and return 422 with a clear message. Reject an empty or whitespace-only description. |
| **D7** | `routers/cases.py` | `__import__("json")` is used inline. | `import json` at the top. |
| **D8** | `config.py`, `embeddings.py` | fastembed's default cache is the system temp folder, which can be cleared on reboot. That would break "works offline from cache" later. (Verified in fastembed 0.9.0: default is `<tmp>/fastembed_cache`; `cache_dir` is a constructor parameter.) | Add setting `fastembed_cache_dir: str = "./.cache/fastembed"` and pass `TextEmbedding(model_name=..., cache_dir=settings.fastembed_cache_dir)`. Add `.cache/` to `.gitignore` and `FASTEMBED_CACHE_DIR=./.cache/fastembed` to `.env.example`. |
| **D9** | `services/resolution.py`, `services/overlap.py` | `create_case` imports both, but they belong to Stage 6. | Implement `resolution.py` exactly as guide 6.1 (pure SQL plus Python; needs only pg_trgm). Keep `AUTO_ACCEPT = 0.85` and `REVIEW_FLOOR = 0.55` and mark them with a comment `# origin: default_pending_data`. Create `overlap.py` with `scan_overlaps` returning `[]` and a comment `# Stage 6`. |
| **D10** | `main.py` | CORS lists only `http://localhost:5173`. | Allow both `http://localhost:5173` and `http://127.0.0.1:5173`. (The dev proxy makes CORS unnecessary in practice.) |
| **D11** | Seed expectations | The guide says about 400 cases; its own code yields about 330 (60 institutions x 2 to 6 closed cases, plus roughly 1.5 active cases each). | Accept **280 to 450** cases. This is not a bug; report the actual count. |
| **D12** | Startup | `jwt_secret` defaults to `dev-secret-change-me`. | Log a warning at startup when the default is in use. Do not block startup. |
| **D13** | Commands | The guide runs `uvicorn ...` directly. | Always run through uv: `uv run uvicorn app.main:app --reload --port 8000`. |

Notes that are **not** deltas but worth knowing:
- `%` inside `text()` SQL is fine: SQLAlchemy escapes it for psycopg automatically (verified).
- The 15-second default `refetchInterval` and 5-second `staleTime` in the guide's `main.tsx` stay as the global defaults; the dashboard overrides (F1).

---

## 8. Backend tests and smoke script (D14)

Create `backend/tests/conftest.py`, `test_auth.py`, `test_cases.py`, `test_dashboard.py`, and `backend/scripts/smoke_stage3.py`.

**Rules**
- Tests run against the dev database that has been seeded; read-only tests need no cleanup.
- Tests that create data (`POST /cases`, `POST /cases/{id}/actions`) must **clean up** in a fixture teardown (delete the created case; actions cascade) or restore the changed case, so reseeding is never required between runs.
- Use FastAPI's `TestClient` (httpx is already installed). Do not add packages.
- The smoke script uses `httpx` against `http://localhost:8000` and prints a pass/fail line per check, exiting non-zero on any failure.

**Acceptance matrix (every row must be automated)**

| # | Check | Expected |
|---|---|---|
| A1 | `GET /api/health` | 200 `{"ok": true}` |
| A2 | Login `rb1` / `demo123` | 200 with token |
| A3 | Login with wrong password; login with an 80-character password | Both 401, never 500 (D4) |
| A4 | `GET /api/auth/me` with the token | Correct username and role |
| A5 | `GET /api/cases` with no token | 401 |
| A6 | `GET /api/dashboard` as `mgmt1` | `kpi.total` equals `SELECT count(*) FROM cases` |
| A7 | `GET /api/cases?bureau=RB&status=under_process` | Every row has `bureau == "RB"` and `status == "under_process"` |
| A8 | `GET /api/cases?institution=<word from a seeded name>&bureau=RB` | Every row is RB (D1) |
| A9 | As `south1`: list cases | Every row has `region == "South"` |
| A10 | As `south1`: dashboard total | Less than the `mgmt1` total; `by_region` contains only South |
| A11 | As `south1`: open the detail of a case in another region | 404 (D2) |
| A12 | `POST /api/cases` with a lowercase abbreviated name of a seeded institution (e.g. replace "Government"-style words with "govt"/"engg" forms where applicable, or just lowercase) | 201; `case_ref` like `CASE-000123`; embedding stored (not NULL, 384 dimensions); first action `registered`; `overlaps == []` |
| A13 | `POST /api/cases` with unknown `bureau_code` | 422 (D6) |
| A14 | `POST /api/cases/{id}/actions` with `new_status="disposed"` | 201; `closed_date` set; dashboard `disposed` increases by 1 and `total` is unchanged |
| A15 | Same endpoint with `new_status="banana"` | 422 (D5) |
| A16 | Same endpoint with `transfer_to="NOPE"` | 422 (D5) |

**Seed checks** (run once, report the numbers):

```sql
SELECT count(*) FROM institutions;                                   -- 60
SELECT count(*) FROM cases;                                          -- 280 to 450 (D11)
SELECT count(*) FROM cases WHERE embedding IS NULL;                  -- 0
SELECT issue_key, count(*) FROM cases
 WHERE closed_date IS NULL GROUP BY 1 HAVING count(*) > 1;           -- at least a few rows (planted overlaps)
SELECT count(*) FROM officers;                                       -- 7
```

---

## 9. Stage 3 definition of done

1. Every row of the acceptance matrix passes (`uv run pytest -q` and the smoke script).
2. The seed checks above are reported.
3. `http://localhost:8000/docs` loads; the Authorize button works with `rb1` / `demo123`.
4. `uv pip check` is still clean; `requirements.txt` is unchanged.
5. `git status` is clean; branch merged to `main`; tag `stage-3` created.

---

## 10. Stage 4: frontend

### 10.1 Scaffold (phase 4A)

Follow the guide's 4.1 commands, adapting to prompts the current tools show. Requirements:

- Template: **React + TypeScript** (Vite). Choose stable options; do not opt into experimental bundlers.
- Dependencies exactly as the guide: `@tanstack/react-query`, `@tanstack/react-table`, `react-router-dom`, `recharts`, `zod`, `react-hook-form`, `tailwindcss`, `@tailwindcss/vite`, then shadcn components `button card badge table input select dialog tabs`.
- **F7 (pinning):** before installing, create `frontend/.npmrc` containing `save-exact=true`. After installing, write the resolved top-level versions into the final report (`npm ls --depth=0`). Commit `package-lock.json`. Write the Node version into `frontend/.nvmrc`.
- **F8 (alias):** the `@` alias needs both Vite and TypeScript configuration. Add `paths` for `@/*` to the TypeScript config files the template uses, and install `@types/node` if `vite.config.ts` needs `path`.
- `vite.config.ts` as in the guide: React and Tailwind plugins, `@` alias, `/api` proxy to `http://localhost:8000`.
- `src/index.css` starts with `@import "tailwindcss";` (plus whatever shadcn adds).
- Tailwind and shadcn instructions change between versions. If a guide command fails, use the current official Vite install steps and note the change in the report.
- **Offline rule:** no CDN links anywhere (no Google Fonts, no remote icons or scripts). Fonts must be system fonts or bundled with the app. This is a hard requirement because Stage 9's offline mode depends on it.

### 10.2 `src/lib/api.ts` [GUIDE] 4.2

Keep `api<T>()` and `login()`. Add:
- `logout()` which removes the token and navigates to `/login`.
- `me()` helper typed as `{id, username, full_name, role, bureau_id, region}`.
- Error handling that surfaces the server's message text for non-OK responses.

Token storage in `localStorage` is the guide's prototype choice; mention httpOnly cookies as a production roadmap item in the README, not in code.

### 10.3 `src/main.tsx` [GUIDE] 4.3

Same providers and routes as the guide. Global query defaults: `staleTime 5_000`, `refetchInterval 15_000`. All eight page modules must exist so the app compiles (10.5).

### 10.4 Route guard

`Guard` redirects to `/login` when there is no token. Also handle the 401 case from `api()` (token invalid or expired) by clearing the token and redirecting.

### 10.5 Layout, Login and placeholders (phase 4C)

**Layout**
- Left sidebar with `NavLink`s: Dashboard, Cases, Overlaps, Alerts, Reports, and Admin. Show Admin only for roles `admin` and `management`. Highlight the active route.
- Top bar showing the logged-in user's full name, role, and a Logout button (data from `GET /api/auth/me`, via React Query).
- Leave an empty, clearly commented slot in the top bar for the Stage 9 mode bar. **Do not render a fake mode or online status.**
- Content area renders `<Outlet />`.
- Responsive at laptop widths (1024 to 1440 px) without horizontal scrolling. Sidebar may collapse below 1024 px.

**Login page**
- Username and password fields, submit button, inline error message on failure, loading state while submitting. Use `react-hook-form` and `zod` as the guide's dependency list implies.
- On success navigate to `/`. If already logged in, redirect away from `/login`.
- A small note "Demo accounts use password `demo123`" is acceptable in dev only; show it only when `import.meta.env.DEV` is true.

**Placeholder pages** (`Cases`, `CaseDetail`, `Institution`, `Overlaps`, `Alerts`, `Reports`, `Admin`)
- Each renders a heading and a line like "Coming in Stage 5". No fake data.

### 10.6 Dashboard page [GUIDE] 4.4 + deltas

Data comes from `GET /api/dashboard`. Keep the guide's types and layout, then apply:

| ID | Change | Reason |
|---|---|---|
| **F1** | The dashboard query uses `refetchInterval: 5000` | The handbook says the dashboard refreshes every few seconds |
| **F2** | The overlap banner uses React Router `<Link to="/overlaps">`, not `<a href>` | Avoids a full page reload that drops query state |
| **F3** | Show **seven** KPI cards: total, pending, under process, disposed, transferred, **escalated**, beyond timeline | The PS lists escalated cases explicitly; the API already returns the count |
| **F4** | Add a second chart: open cases by region (`by_region`) | The PS asks for region-wise views; data is already returned |
| **F5** | Show a "last updated" time based on the query's `dataUpdatedAt` | Makes the live refresh visible in the demo |
| **F9** | Loading skeleton, and an error state with a Retry button | No blank screens |
| **F10** | KPI cards use the shadcn `Card`; use consistent colour tokens; include accessible labels | Polish and accessibility |

KPI to label mapping: `total` "Total received", `pending` "Pending", `under_process` "Under process", `disposed` "Disposed", `transferred` "Transferred", `escalated` "Escalated", `overdue` "Beyond timeline".

The amber banner appears only when `overlaps.high_open > 0` and reads "N potential overlapping cases – coordination required". In Stage 4 the count will be 0, because overlap scanning arrives in Stage 6; confirm the banner renders correctly by temporarily testing with mocked data, then remove the mock.

---

## 11. Stage 4 acceptance

| # | Check | Expected |
|---|---|---|
| B1 | `npm run build` | Zero TypeScript or build errors |
| B2 | `npm run lint` (if the template provides it) | Clean, or issues listed in the report |
| B3 | Visit `/` while logged out | Redirected to `/login` |
| B4 | Log in as `rb1` / `demo123` | Lands on the dashboard; user name shown in the top bar |
| B5 | Log in with a wrong password | Inline error, no crash, token not stored |
| B6 | Dashboard KPIs vs `GET /api/dashboard` | Identical numbers |
| B7 | Dispose of a case via Swagger or the API while the dashboard is open | "Disposed" increases and the workload chart updates within about 6 seconds, with no manual reload |
| B8 | Log in as `south1` | Numbers are lower than for `mgmt1`; region chart shows South only; Admin link hidden |
| B9 | Put a garbage token in `localStorage` and reload | Redirected to `/login` |
| B10 | Click Logout | Token removed; protected routes redirect |
| B11 | Visit each placeholder route | Renders without errors; sidebar highlight correct |
| B12 | Resize to 1366, 1280 and 1024 px wide | No horizontal scroll; cards and charts reflow |
| B13 | Inspect the network panel and search the built output and `index.html` for `http://` or `https://` URLs to fonts, CDNs or scripts | None (no external requests) |

If the agent has a browser tool, use it for B3 to B13 and attach screenshots. If not, run B1, B2 and B13 by command, and list B3 to B12 as "needs manual check" in the report.

### Stage 4 definition of done
All of B1 to B13 pass or are explicitly listed as manual; `package-lock.json` and `.nvmrc` committed; branch merged; tag `stage-4` created; the README has a short "Run locally" section (database, backend, frontend, demo accounts).

---

## 12. Things the agent must not do

- Do not change `db/schema.sql`, `requirements.txt`, or `requirements.lock.txt`.
- Do not use the system Python 3.14.2; always `uv run` inside `backend/`.
- Do not commit `.env`, `.venv`, `node_modules`, `.cache`, `storage`, or model files.
- Do not print passwords, tokens or the JWT secret in logs or reports.
- Do not build features from later stages, and do not add mock data to the UI beyond temporary testing that is removed.
- Do not present the seed data as real, in the UI, README or reports.
- Do not skip a failing check. Report it with the exact error.

---

## 13. Final report format (the agent must end with this)

1. **Environment:** Python version in use, `uv pip check` result, Node version, Docker status.
2. **Stage 3 results:** seed counts; the A1 to A16 table with pass/fail; test command output summary.
3. **Stage 4 results:** the B1 to B13 table with pass/fail or "manual"; installed top-level npm versions.
4. **Deltas applied:** list of D and F IDs, plus any extra change made and why.
5. **Problems and decisions:** anything that failed, was skipped, or was a judgement call.
6. **Git:** branches merged, tags created, last commit hashes.
7. **How to run:** the exact commands to start database, backend and frontend.

---

## 14. Troubleshooting hints

| Symptom | Likely cause and fix |
|---|---|
| `connection refused` on port 5432 | Docker DB not running, or a local PostgreSQL holds the port; report, do not edit compose silently |
| Seed fails on `vector` | Image is not `pgvector/pgvector:pg16`, or schema did not load: recreate with `docker compose down -v && docker compose up -d db` (this wipes data; reseed after) |
| First embedding call is slow | Model download on first run; prefetch it once in phase 3C |
| Login works in Swagger, fails in the app | Login must send `application/x-www-form-urlencoded` (the guide uses `URLSearchParams`), and must not set a JSON Content-Type |
| Frontend calls hit `localhost:5173/api` and 404 | Vite proxy not applied; restart `npm run dev` after editing `vite.config.ts` |
| `Cannot find module '@/...'` | The alias exists in Vite but not in the TypeScript config (F8) |
| Tailwind classes have no effect | Missing `@import "tailwindcss";` in `index.css`, or the Tailwind Vite plugin is not registered |
| `ValueError: password cannot be longer than 72 bytes` | D4 not applied |
