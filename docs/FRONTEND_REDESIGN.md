# CaseNexus Frontend Redesign: work order

Goal: replace the generated-looking UI with a designed one **without changing what the backend sees**. This replaces cards F90 to F92 in `ops/TASKS_ROUND2.md`.

---

## 1. Safety contract: nothing may break the backend

The redesign is a **visual layer change only**. The rule is simple: the browser must make the same API calls with the same payloads as before.

### 1.1 Frozen (do not edit, move, rename or reformat)
- `src/api/**` and any module that builds a request, a query key, or a payload.
- TypeScript types for API responses; route paths and URL params; `X-Total-Count` handling; auth/token storage and the 401 redirect logic.
- Form field `name`s, `id`s used by labels, and the shape of objects passed to mutations.
- Existing `data-testid`s (keep them on the same logical element).
- Environment variable names (`VITE_*`) and the API base URL logic.
- Business logic in hooks (filtering, paging, decision payloads, policy toggle optimism and rollback).

### 1.2 Allowed
- Markup, class names, CSS, layout, typography, icons, copy, empty/loading/error visuals, animation, new presentational components under `src/ui/`.
- Moving JSX into new presentational components **if props and callbacks keep the same shape**.
- New front-end only helpers (for example word-diff for the overlap screen) as pure functions with unit tests.

### 1.3 How we prove nothing broke
1. **Before changing anything (task F00)** record: (a) the API request set per user flow (method + path pattern, with ids replaced by `:id`) into `e2e/baseline/api-calls.json`; (b) "before" screenshots; (c) a Playwright smoke suite that passes on the **unmodified** UI.
2. **After every page migration** the same Playwright suite must pass and the recorded request set must be **identical** (no new, no missing calls). A page that fires an extra or missing call is a bug in the redesign.
3. `npx tsc --noEmit` and `npm run build` pass; bundle contains no dev-only tools (Section 5).
4. **Offline test:** with every non-localhost request aborted, every page still loads and works. This protects the offline mode promise (no CDN fonts, no remote images, no hot-linked scripts).
5. Reduced-motion test: with `prefers-reduced-motion: reduce` there is no scroll smoothing and no looping animation.

### 1.4 Migration method (strangler, page by page)
New primitives live in `src/ui/`. Old components stay until the last page that uses them is migrated; one page per commit; the gate in 1.3 runs before each merge. Delete old components only in the final cleanup task.

### 1.5 Hard limits for visual effects
- Animate only `transform` and `opacity`. No layout-shifting animation inside tables.
- At most **2 elements with `backdrop-filter` per viewport** (it is expensive on a projector laptop).
- No scroll-jacking or smooth-scroll library inside the app shell (Lenis only on the login page, Section 5).
- No infinite or looping animation on operational screens, except a small spinner and the "needs attention" pulse limited to 3 cycles.
- Every motion respects `prefers-reduced-motion`.

---

## 2. Your references: what they are and how we use them

| Reference | What I found (fetched) | Use in CaseNexus | Status |
|---|---|---|---|
| **motion.dev AI Kit** | Skill and MCP for AI agents: free docs search and best practices; paid Motion+ adds spring generation, audits, 510+ premium examples. License not stated on the page | Free tier only: agents consult current Motion docs for animation code. Do **not** buy or depend on Motion+ | Use (free part) |
| **Motion library** (`motion`) | MIT; React import `motion/react`; install `npm install motion`; replaces the old `framer-motion` name | The animation engine for all motion | Use |
| **uupm.cc (UI/UX Pro Max)** | Skill with a design database: 57 styles, 95 palettes, 56 font pairings, 24 chart types, UX checklist (SVG icons not emoji, hover feedback, contrast, responsive). License not on the page | Agent consults it for "civic/government analytics dashboard" style, palette and font pairing, and runs its quality checklist. **Do not copy its assets until the GitHub LICENSE is checked** | Use as advisor |
| **agentation.com** | Dev tool: click elements in the running page, write a note, copy markdown with selector, source path, React component tree and styles into your agent. `npm install agentation -D`. Free for internal use; commercial license only if redistributed. Desktop only | **You** use it in the morning to point at ugly elements and send precise fixes. Dev dependency only, guarded so it never ships | Use (dev only) |
| **impeccable.style** | Design skill and commands (`init`, `document`, `shape`, `critique`, `audit`, `polish`, `harden`, `clarify`, `extract`, detector, live mode). Writes `PRODUCT.md` and `DESIGN.md`. Frames dashboards as "Operate" pages. Its anti-pattern list is on a separate page I could not read | Use its workflow: `PRODUCT.md` + `DESIGN.md` (Appendix A, B), then `critique` and `audit` per page. If the agent tool cannot install it, the same two files plus the checklists here still work | Use |
| **styles.refero.design** | 2,000+ design systems taken from real product sites, each as a `DESIGN.md` with colours, type, spacing, components. Themes include Swiss grid editorial, Clean developer docs, Zero border radius | Study 2 to 3 entries (Swiss grid editorial, Clean developer docs) for **structure, spacing and density**. They come from real brands: do not copy their colours, fonts or logos | Reference only |
| **uiverse.io** | Community UI elements, "free for personal and commercial use" per the site (I could not confirm an MIT licence; check each element). Exports HTML/CSS, Tailwind, React | Small hand-picked elements only: the physical online/offline toggle, loaders, a few buttons. Re-skin to our tokens, inline the code, no hot-linking | Selective use |
| **vibeui.dev** | 150+ animated components and templates; React, TypeScript, shadcn/ui, Tailwind, Motion; free plan lists MIT; paid Pro | Best stack match for animated pieces. Verify the licence of each component before copying | Use |
| **Inspira UI** (GitHub) | **Vue/Nuxt**, MIT. Not a React library | **Cannot be used in this project.** Replaced by Magic UI, Animate UI and VibeUI (all React) | Not compatible |
| **Lenis** (GitHub) | MIT; `npm i lenis`; React adapter at `lenis/react`; honours reduced motion by default; nested scroll containers need `data-lenis-prevent` or `allowNestedScroll` | **Login page only.** The app shell has nested scrolling tables, dialogs and sheets; global smooth scroll there causes bugs | Use, limited |
| **Animate UI** (GitHub) | React primitives built with Motion for Radix UI / Base UI; works with shadcn/ui; MIT **with Commons Clause** (fine to use in an app, not to resell the components); CLI `npx @animate-ui/cli@latest animate all` rewires every shadcn component | Use per component (Tabs, Accordion, Dialog/Sheet transitions). **Never run the `animate all` command**: it changes all components at once and breaks the page-by-page safety method | Use, selective |
| **Magic UI** (not in your list; recommended) | React + Tailwind + Motion, copied in with the shadcn CLI; MIT per a secondary source (verify the repo's LICENSE) | Number ticker for KPIs, subtle background patterns, animated list for alerts, if each is verified to exist in the registry | Use after verifying |
| **Sonner** | MIT, v2.0.5 | Toasts (probably already in the project via shadcn) | Use |
| **Tremor Raw** | React + Tailwind, copy-paste chart and dashboard components; licence not stated on the page | Pattern reference for KPI/spark/bar-list pieces; build with Recharts which we already have | Reference only |
| **trickle prompt library** | Prompt patterns: page type + components, named style + concrete attributes, numeric constraints, responsive rules, interaction states | Used to write the per-screen prompts in Section 6 | Use |
| **vibecodecomponents.com** | 200+ copy-paste component prompts, React; licence not stated | Prompt inspiration only | Reference only |
| **blog.vibecoder.me** | General vibe-coding guides; nothing specific on avoiding AI-looking UI | Not used | Skip |
| **motionsites.ai** | Paid website prompts for 3D landing pages; licence not stated | Not for an operational dashboard. Optionally an idea source for the login background | Skip |
| **10x.app** | AI builder for native iOS apps | Not relevant to a React web app | Skip |
| **are.na block "Tearable UI"** | Page shows only a title and a cover image, no content I can read | Cannot extract anything; you can describe what you liked about it | Cannot use |
| **Mobbin** | Fetch failed | **You** save 6 to 10 screenshots (dashboards, tables with filters, alert lists, bottom sheets, settings toggles) into `docs/design/refs/` with a one-line note on what to take from each | Needs your input |

---

## 3. Style decision: "Civic Ledger"

Minimalism is the base, with named places for special treatments:
- Base: Minimalism (quiet, dense, borders not shadows).
- Glassmorphism: Login card, floating dialog overlay (max 2 blurred layers per viewport).
- Liquid glass: Progressive enhancement with solid fallback.
- Skeuomorphism: Signature physical online/offline toggle, embossed lock icon on sensitive cases.
- Claymorphism: Soft rounded SVG empty-state and error-state illustrations only.
- Neumorphism: **Forbidden** (low contrast, fails accessibility).

### 3.1 Direction: "Civic Ledger"
Calm warm-paper background, ink-blue primary, dense tables that read like a well-set ledger, status shown by small text chips plus icons, one memorable moment (the overlap comparison screen) and one tactile control (the mode toggle).

---

## 4. Design system spec

### 4.1 Colour tokens
| Token | Value | Notes |
|---|---|---|
| `--bg` | `#F6F5F1` | page paper |
| `--surface` | `#FFFFFF` | cards, tables, dialogs |
| `--surface-2` | `#EFEDE7` | table header, hover |
| `--border` | `#DAD6CC` | hairlines (decorative) |
| `--border-strong` | `#8C8A82` | input borders (3.17:1 on `--bg`, meets the 3:1 rule for controls) |
| `--text` | `#1B1F24` | 15.2:1 on bg, 16.6:1 on surface |
| `--text-muted` | `#5B6068` | 5.8:1 on bg, 6.3:1 on surface |
| `--primary` | `#1F3A5F` | 11.5:1 with white text |
| `--primary-hover` | `#17304F` | 13.4:1 with white text |
| `--sidebar` | `#14233A` | text `#E8EDF3` 13.4:1, muted `#A9B6C6` 7.7:1 |
| `--accent` | `#8A4B08` | 6.2:1 on bg; used for highlights and the "needs coordination" strip |
| `--focus` | `#1F6FEB` | focus ring, 4.25:1 on bg, 2px with 2px offset |
| High (critical) | text `#B42318` on tint `#FDECEA` | 5.75:1 |
| Medium | text `#9A4A00` on tint `#FFF3E0` | 5.71:1 |
| Info | text `#175CD3` on tint `#E8F0FE` | 5.22:1 |
| OK / disposed | text `#067647` on tint `#E6F4EC` | 5.02:1 |

### 4.2 Chart colours
Categorical palette: blue `#2a78d6`, orange `#eb6834`, aqua `#1baf7a`, yellow `#eda100`. Every chart ships visible direct labels or a table view, and bars get a 2 px surface gap. Maximum 4 series per chart.

### 4.3 Typography
- UI: **IBM Plex Sans**. Data/references: **IBM Plex Mono**. Self-host with exact-pinned `@fontsource/ibm-plex-sans` and `@fontsource/ibm-plex-mono`. No CDN fonts.
- Scale: 12 / 13 / 14 / 16 / 20 / 24 / 32. Weights 400, 500, 600 only. `tabular-nums` for numeric table columns.

### 4.4 Spacing, radius, elevation
4 px base grid (4, 8, 12, 16, 24, 32, 48). Radius 4 px (inputs, chips), 6 px (cards, dialogs). Elevation by 1 px borders.

### 4.5 Motion tokens
Durations: 120 ms (hover/press), 200 ms (appear), 320 ms (dialog/sheet, page transition). Respect `prefers-reduced-motion`.

---

## 5. Screen by screen instructions
- **Login**: Two-column, plain statement on left, sign-in card on right, subtle grid pattern.
- **App shell**: Dark-ink left sidebar (`#14233A`), top bar with page title, alert bell, mode bar.
- **Dashboard**: Compact KPI strip, bureau workload bar chart with direct labels, top High overlaps coordination strip, SLA risk list.
- **Cases list**: Dense table, sticky header, filter bar with saved filters, relative SLA due with risk, `X-Total-Count` paging intact.
- **Case detail**: Vertical timeline rail, sticky status/risk/overlap summary panel, document list.
- **Institution 360**: Header with AICTE ID, tabs for Cases/Overlaps/Alerts, small historical trend.
- **Register case dialog**: Step-like form, 400ms debounced resolver, category/bureau fields, sensitive toggle with lock icon.
- **Overlap review**: Side-by-side comparison with `WordDiff` highlighting, probability metric, feature contribution bars, Link/Nominate Lead & Dismiss actions. Readable on a projector (min 16px body).
- **Alerts**: Severity left rule, kind icon, unread state filter, mark read action.
- **Reports**: 4 charts using Section 4.2 palette, direct labels, table toggle on every chart, Excel and PDF authenticated downloads.
- **Mode bar and Privacy tab**: Physical tactile toggle (`ModeToggle`), per-capability toggles, air-gapped indicator, ledger table.
