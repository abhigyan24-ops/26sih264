<USER_REQUEST>
# CaseNexus Frontend Redesign: work order

Goal: replace the generated-looking UI with a designed one **without changing what the backend sees**. This replaces cards F90 to F92 in `ops/TASKS_ROUND2.md`.

How to read this file: Section 1 is the safety contract (non-negotiable). Section 2 says what each of your references really is and whether it can be used (I fetched them; some could not be read). Sections 3 to 6 are the design. Section 7 is the task list in the same card format as `ops/TASKS.md`. Section 8 is verification. Appendix A and B are ready-to-save `PRODUCT.md` and `DESIGN.md` for the agents.

Assumptions I could not check: the existing frontend is React + TypeScript + Vite + Tailwind + shadcn/ui + TanStack Query/Table + Recharts (from the build guide). **Agents must confirm the real Tailwind major version (3 or 4), router and form library in Task F00 before using any snippet here.** All code in this file is reference, unrun.

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

Conclusion on "use more resources": the usable stack is **Motion + Animate UI + VibeUI + Magic UI (verified) + Uiverse (selected) + Lenis (login only) + Sonner**, guided by **Impeccable + UI/UX Pro Max + Refero**, reviewed with **Agentation**.

---

## 3. Style decision (you listed seven styles)

For an operational tool used for hours by officers and shown on a projector, legibility beats effect. So: **minimalism is the base**, and every other style gets a limited, named place.

| Style | Verdict | Where it is allowed |
|---|---|---|
| **Minimalism** (quiet, dense, borders not shadows) | Base for everything | All screens |
| **Glassmorphism** | Sparingly | Login card; the mode bar and floating dialogs' overlay. Maximum 2 blurred layers per viewport. Needs a solid fallback colour behind text |
| **Liquid glass** | Progressive enhancement only | The login card or the mode bar, via CSS `backdrop-filter`. SVG-filter "refraction" versions are Chromium-specific: provide a plain-glass fallback and never rely on it for meaning |
| **Skeuomorphism** | One signature element | The **online/offline physical toggle** (a real-looking switch with a lock state), plus subtle embossed lock icon on sensitive cases. Nothing else |
| **Claymorphism** | Illustrations only | Empty-state and error-state illustrations (soft, rounded, original SVG). Not for controls |
| **Neumorphism** | **Do not use** | Its soft low-contrast shadows fail contrast and focus-visibility, and disabled and enabled states look alike. That is a real accessibility problem for a government tool |

### 3.1 Direction name: "Civic Ledger"
Calm warm-paper background, ink-blue primary, dense tables that read like a well-set ledger, status shown by small text chips plus icons, one memorable moment (the overlap comparison screen) and one tactile control (the mode toggle).

What makes it look designed, not generated: a real type hierarchy with a monospaced face for case references and numbers, borders and spacing instead of shadows and gradients, tight corner radius (4 to 6 px), compact KPIs, specific officer-language copy, and few colours with strict roles.

---

## 4. Design system spec

### 4.1 Colour tokens (contrast computed with a script, not eyeballed)
Light theme. All text pairs below are at least 4.5:1 on the stated background:

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

Status and overlap level are **always** shown as icon + word + colour, never colour alone. Dark theme is optional and comes last; its values are not validated yet, so it must be run through the same contrast check before shipping.

### 4.2 Chart colours (validated with the dataviz script)
Use the first slots of the validated categorical palette, in this fixed order, never cycled: blue `#2a78d6`, orange `#eb6834`, aqua `#1baf7a`, yellow `#eda100`. On a white surface the validator passes lightness band, chroma, colour-blind separation (worst adjacent pair 9.1) and the normal-vision floor, with one **warning**: aqua (2.82:1) and yellow (2.17:1) are below 3:1 on white. The rule that follows is mandatory: **every chart ships visible direct labels or a table view**, and bars get a 2 px surface gap. Maximum 4 series per chart; more go to "Other" or small multiples. No dual axes. Status colours in charts follow the status table above with icons, not the categorical palette.

### 4.3 Typography
- UI: **IBM Plex Sans** (institutional character, free OFL licence). Data and references: **IBM Plex Mono** (case references, ids, numbers, SLA days). Self-host with `@fontsource/ibm-plex-sans` and `@fontsource/ibm-plex-mono` (pin exact versions). **Never link Google Fonts**: that is an external request and breaks the offline promise.
- Fallback stack: `system-ui, "Segoe UI", sans-serif`; add `"Noto Sans Devanagari"` as a system fallback for Hindi text in complaints.
- Scale: 12 / 13 / 14 (base for tables) / 16 / 20 / 24 / 32. Weights 400, 500, 600 only. Tabular numbers for table columns (`font-variant-numeric: tabular-nums`).

### 4.4 Spacing, radius, elevation
4 px base grid (4, 8, 12, 16, 24, 32, 48). Radius 4 px (inputs, chips), 6 px (cards, dialogs). Elevation by 1 px borders; a single soft shadow only for floating layers (menus, dialogs).

### 4.5 Motion tokens
Durations: 120 ms (hover/press), 200 ms (appear), 320 ms (dialog/sheet, page transition). Easing: ease-out for entering, ease-in for leaving, springs only for the toggle and sheets. Stagger lists by 30 ms, maximum 8 items. Reduced motion: replace transforms with opacity-only fades or nothing.

### 4.6 Component inventory (build once in `src/ui/`)
`PageHeader`, `FilterBar`, `DataTable` (sticky header, right-aligned numbers, row hover, skeleton rows, empty state), `StatusChip`, `LevelBadge` (High/Medium/Info), `SlaDue` (relative time + risk), `KpiStrip`, `EmptyState` (clay-style illustration), `ErrorState` (with retry), `Skeleton`, `Toast` (Sonner), `ConfirmDialog`, `Sheet`, `Tabs`, `ModeToggle` (physical switch), `ModeBar`, `CommandPalette` (optional, uses existing search endpoints only), `Timeline` (vertical rail), `WordDiff` (pure function plus presentational component).

---

## 5. Using the open-source resources safely

- **Pin exact versions** in `package.json` (no `^`, no `latest`), record them in the task report, and run a licence summary (`npx license-checker --summary`) in the final task. Any dependency with a non-permissive licence is removed or flagged.
- **Motion**: `npm install motion`; imports from `motion/react`. Presentational use only.
- **Animate UI**: install single components through its docs, not `animate all`. Candidates to try: Tabs, Accordion, Sheet/Dialog transitions. After each, the Playwright suite must pass (focus handling and keyboard behaviour must be unchanged).
- **Magic UI / VibeUI**: copy single components in (shadcn CLI or copy-paste). Before using any named component, **confirm it exists in the library's current registry** and read its licence. Names from memory (number ticker, animated list, grid/dot background pattern) are suggestions, not facts.
- **Uiverse**: open the element, choose the Tailwind or React export, rewrite colours to tokens, remove external fonts or images, keep the licence note in a comment.
- **Lenis**: install only for the login page; read the `lenis/react` README after installing to get the real API (do not guess it); mount it only on the login route; unmount on navigation; respect reduced motion (default). If login has no scrolling content, **skip Lenis entirely**: smooth scroll on a one-screen page adds nothing.
- **Agentation**: `npm install agentation -D`; render it only when `import.meta.env.DEV` is true, via a dynamic import so it is not in the production bundle. Verification: after `npm run build`, `grep -r "agentation" dist/` must find nothing.
- **Impeccable and UI/UX Pro Max**: install as agent skills if the tool supports it. If an install needs a licence or network step the agent cannot perform, continue with Appendix A and B and record it.
- **Refero**: open 2 to 3 entries as structure references and write what you took in `docs/design/notes.md`. No brand colours, fonts or logos copied.
- No remote images, no CDN scripts, no external fonts in the final build (offline test enforces this).

---

## 6. Screen by screen

Each entry: purpose, design idea, resources, backend-sensitive points (what must not change).

**Login.** Two-column: left a plain statement of what the system does and a small honest note "Prototype with synthetic data"; right the sign-in card (glass or liquid-glass treatment with a solid fallback, subtle grid/dot pattern behind). No stock photos. Backend: same login request, same token storage, same 401 handling and error text mapping.

**App shell.** Dark-ink left sidebar (grouped: Work, Insight, Admin), current user and bureau at the bottom, compact top bar with page title, alert bell (unread count polling as before) and the mode bar. Collapsible to icons. Backend: nav targets are the existing routes; the bell keeps its polling call.

**Dashboard.** Compact KPI strip (label, number, small delta), a bureau workload bar chart with direct labels, an "Overlaps needing coordination" strip in the accent colour listing the top High overlaps with a link to review, an SLA risk list. Number ticker on first load only. Backend: same dashboard and alerts calls; no extra requests.

**Cases list.** Dense table, sticky header, filter bar with saved filters in local storage only (per-viewer convenience), status chips, SLA due column (relative text plus risk), reference column in mono, `X-Total-Count` paging as is. Optional Ctrl+K command palette using only existing search endpoints. Backend: the same query parameters and header handling.

**Case detail.** Left: a vertical timeline rail (action type icon, unit, officer, time, remark), right: sticky panel with status, SLA breach risk badge, hold flag, and possible overlaps list (read-only chips as before), documents. Lock icon for sensitive cases. Backend: same endpoints, same document upload and download calls.

**Institution 360.** Header with name, city, AICTE id; tabs for Cases, Overlaps, Alerts; a small chart of cases over time; a "same institution, other units" strip. Backend: same calls.

**Register case dialog.** Step-like single form: institution field with the debounced "did you mean" list (existing resolve call, same debounce), clear confidence message, description with character count, category, bureau, sensitive checkbox (with lock icon and one line explaining what it does). After submit the result panel keeps `institution_match` and overlaps from the response, with `LevelBadge`s. Backend: payload fields unchanged (including `institution_id` when picked).

**Overlap review (the signature screen).** Two cases side by side with the **differing words highlighted** by `WordDiff` computed in the browser from the two descriptions (pure function, unit tested; no new API). Beside them: probability as a plain percentage, the six explanation bars labelled "Explanation, not the probability itself", the level badge, and decision controls: primary "Link and nominate lead" (choose lead, hold other), secondary "Not related" opening the fixed-reason dialog. Keep it readable on a projector (minimum 16 px body text there). Backend: the same list and decide calls and payloads; on 409 show "already decided" and refetch.

**Alerts.** List with a left severity rule, kind icon and label, case link, read/unread state, "mark all read". Backend: same read calls.

**Reports.** Four charts using the Section 4.2 colours with direct labels and a "Show table" toggle on every chart; date range filter; xlsx and pdf buttons that keep the authenticated blob download. Label "Synthetic prototype data".

**Mode bar and Privacy tab.** The physical **ModeToggle** (global), per-capability small toggles, a "No external calls" indicator, confirm before switching to online, optimistic update with rollback exactly as before. Ledger table with mode and outcome columns. Backend: `PUT /api/policy` payloads unchanged.

**Admin (Evaluation, Model card, Officers, Audit).** Same table system, with origin badges (learned_synthetic, default_pending_data, policy), a "synthetic data" banner on metrics.

**Empty, loading, error everywhere.** Skeleton rows for tables, clay-style empty illustrations, error state with a retry button.

---

## 7. Task cards (ops format; give these to the AG lanes)

Common: read `ops/RULEBOOK.md`, Section 1 of this file, and `docs/design/PRODUCT.md` and `DESIGN.md` (Appendix A and B). Every card finishes with the Section 1.3 gate and a report in `docs/reports/<ID>.md` with before/after screenshots.

## F00 Baseline and contract snapshot
Prefer: AG
Depends: none
Priority: MUST
Owns: `e2e/**`, `docs/design/**`, `playwright.config.ts`, dev dependency `@playwright/test`, `docs/reports/F00.md`
Do: (1) record the real stack versions (Tailwind major, router, forms, TanStack, Recharts, shadcn components in use); (2) write Playwright flows for: login, dashboard, case list with a filter, case detail, register case (resolve then submit), overlap review (link, dismiss), alerts (mark read), reports (one download), policy toggle (admin) and logout; (3) capture the **API request set per flow** into `e2e/baseline/api-calls.json` and a test that compares future runs to it; (4) the offline test (abort non-localhost) and the reduced-motion test; (5) "before" screenshots at 1366x768 and 390 px width into `docs/design/before/`; (6) write `docs/design/PRODUCT.md` and `DESIGN.md` from Appendix A and B; (7) list every `data-testid` in use. All tests must pass on the **unmodified** UI.
Checks: `npx playwright test` output; the baseline JSON committed.

## F01 Foundation: tokens, fonts, primitives
Prefer: AG
Depends: F00
Priority: MUST
Owns: `src/ui/**`, `src/styles/**`, Tailwind theme config, `index.css`, font packages
Do: tokens from Section 4 (CSS variables mapped into the Tailwind theme for the real Tailwind version); self-hosted fonts; the primitives in Section 4.6 that do not need page data (`PageHeader`, `FilterBar`, `DataTable`, `StatusChip`, `LevelBadge`, `Skeleton`, `EmptyState`, `ErrorState`, `ConfirmDialog`, `Tabs`); a hidden `/__ui` dev route showing every primitive in every state (dev only).
Checks: tsc, build, F00 suite unchanged, a script that prints the contrast ratio of every token pair and fails below 4.5 (text) or 3 (controls).

## F02 App shell and navigation
Prefer: AG
Depends: F01
Priority: MUST
Owns: `src/components/Layout.tsx`, `src/ui/shell/**`
Do: sidebar, top bar, alert bell (keep its polling), page transitions (opacity only), responsive collapse. Keep nav routes and the marked mode-bar region intact.
Checks: gate; the bell still polls at the same interval.

## F03 Data screens: dashboard, cases, case detail, institution
Prefer: AG
Depends: F02
Priority: MUST
Owns: `src/pages/{Dashboard,Cases,CaseDetail,Institution}.tsx` (presentation only), `src/ui/{KpiStrip,SlaDue,Timeline}.tsx`
Do: Section 6 for those screens. Keep data hooks and filter logic as they are.
Checks: gate per page; API request set identical.

## F04 Register dialog and overlap review
Prefer: AG
Depends: F02
Priority: MUST
Owns: `src/components/overlap/**`, `src/pages/Overlaps.tsx` (presentation), register-case dialog (presentation), `src/ui/WordDiff.tsx`, `src/lib/wordDiff.ts` with tests
Do: Section 6 for these screens. `wordDiff` is a pure function with unit tests (identical text, fully different, one word changed, empty, Hindi/Devanagari text, very long text capped at a sane length with a note). No new network calls.
Checks: gate; unit tests; decide payloads unchanged (the request set test covers this).

## F05 Alerts, reports, charts
Prefer: AG
Depends: F02
Priority: SHOULD
Owns: `src/pages/{Alerts,Reports}.tsx` (presentation), `src/components/{alerts,reports}/**`
Do: Section 6 and Section 4.2. Run the dataviz validator on the palette in use and paste its output into the report. Each chart has direct labels and a table toggle.

## F06 Mode bar, privacy and admin tabs
Prefer: AG
Depends: F02
Priority: MUST
Owns: `src/components/ModeBar.tsx`, `src/ui/ModeToggle.tsx`, `src/components/admin/**` (presentation)
Do: the physical toggle (an Uiverse starting point is allowed, re-skinned and inlined), confirm dialog, rollback on error, ledger table. Keep `PUT /api/policy` calls and optimistic logic untouched.
Checks: gate; toggling still changes the explanation source (human check if no browser).

## F07 Login and motion polish
Prefer: AG
Depends: F03, F04, F05, F06
Priority: SHOULD
Owns: `src/pages/Login.tsx`, motion helpers in `src/ui/motion/**`
Do: login treatment (glass or liquid glass with solid fallback; Lenis only if the page scrolls); motion tokens applied consistently (list stagger, dialog and sheet, number ticker on first load); reduced-motion variants; performance check with CPU throttling 4x on the dashboard and overlap review (no long tasks above 200 ms during navigation, measured and pasted).

## F08 Review and hardening
Prefer: ANY
Depends: F07
Priority: SHOULD
Do: run `critique`, `audit`, `harden`, `clarify` (Impeccable, if installed) per page, or the Section 8 checklist manually; fix findings; keyboard-only walk through every flow; check 1366x768 and 390 px; long names, empty data and error states.

## F09 Cleanup and final verification
Prefer: ANY
Depends: F08
Priority: MUST
Do: delete old unused components and styles only when `grep` shows no references; remove unused dependencies only if the build and F00 suite pass; licence summary; confirm Agentation is absent from `dist/`; "after" screenshots; final report with a before/after table and the list of every dependency added with exact versions.

---

## 8. Verification checklist (every page)

- [ ] F00 Playwright suite passes; recorded API request set identical to baseline.
- [ ] `npx tsc --noEmit`, `npm run build` pass; no console errors on the page.
- [ ] Offline test passes (no external requests).
- [ ] Contrast script passes; focus ring visible on every control; keyboard-only flow works; Escape closes dialogs and focus returns.
- [ ] Reduced-motion test passes.
- [ ] Layout works at 1366x768 and 390 px; tables scroll inside their container, not the page.
- [ ] Loading, empty and error states exist and look designed.
- [ ] No emoji icons, no gradients on surfaces, no more than 2 blurred layers per viewport.
- [ ] Copy is specific and plain; no marketing phrases.
- [ ] Charts: direct labels and table toggle; palette from Section 4.2.
- [ ] Screenshots saved; report lists tokens and components used.

## 9. Your part in the loop (morning review)
1. Put 6 to 10 Mobbin screenshots into `docs/design/refs/` with a note each.
2. Install Agentation in dev, click anything that still looks generic, and paste its output to an agent with the sentence "fix only this element, visual layer only, run the F00 suite".
3. Decide: keep the dark theme out of scope, or request it as a final task.

## 10. Risks and honest limits
- I could not read Mobbin, the are.na block's content, or Impeccable's anti-pattern page; those inputs are missing.
- Library licences are partly from secondary sources; agents must read each LICENSE before copying code.
- Animated libraries can change focus and keyboard behaviour; the F00 suite and keyboard walk exist to catch that.
- The colour values are my proposal, validated for contrast and colour-blind separation, not tested with real users.
- A redesign touches every page: if time is short, finish F00 to F04 and F06 (the screens that carry the demo) and skip F05, F07 effects and dark mode.

---

## Appendix A: `docs/design/PRODUCT.md`
```
# Product: CaseNexus
Purpose: a single-window dashboard for AICTE officers to monitor complaint cases across Bureaus/Cells and to coordinate overlapping cases about the same institution.
Users: AICTE officers (case handling), regional officers (scoped to a region), management (read and reports), admins (policy, rules, models).
Mode of use: Operate (daily, many hours, dense data) with a few high-stakes decisions (link cases, dismiss, switch online/offline).
Tone: calm, precise, official-plain language. No marketing words, no emoji, no exclamation marks.
Truth rules: data in the prototype is synthetic and labelled as such; never invent figures; the system suggests, officers decide.
Constraints: must work offline (no external fonts, images or scripts); must be readable on a projector at 1366x768; accessible by keyboard; Hindi text can appear in complaints.
Out of scope: changing any API call, payload or route.
```

## Appendix B: `docs/design/DESIGN.md`
```
# Design system: Civic Ledger
Mood: quiet, dense, ledger-like; warm paper background, ink-blue primary.
Colour: tokens in FRONTEND_REDESIGN.md section 4.1 (all text pairs >= 4.5:1). Status = icon + word + colour, never colour alone.
Charts: categorical order blue #2a78d6, orange #eb6834, aqua #1baf7a, yellow #eda100; max 4 series; direct labels and a table toggle; no dual axes.
Type: IBM Plex Sans (UI) + IBM Plex Mono (references, numbers), self-hosted. Scale 12/13/14/16/20/24/32. Weights 400/500/600.
Space and shape: 4px grid; radius 4px controls, 6px cards; borders over shadows; one soft shadow for floating layers only.
Layout: left ink sidebar, compact top bar, tables as the main surface, sticky headers, right-aligned numbers.
Motion: 120/200/320 ms, ease-out in, ease-in out; transform and opacity only; reduced-motion respected; Lenis on login only.
Special moments: physical online/offline toggle; overlap review with word-level diff.
Styles allowed: minimalism (base), glass and liquid glass (login, mode bar; max 2 per viewport, solid fallback), skeuomorphism (toggle only), clay (empty-state art only). Neumorphism: not used.
Anti-patterns to avoid: purple/indigo gradients, glow shadows, glassmorphism everywhere, emoji icons, hero banners, identical big-number card grids, decorative blobs, generic copy ("Welcome back!", "Seamlessly manage"), centered symmetrical layouts for data screens.
```

## Appendix C: prompt pattern for each page (from the prompt-library pattern: page type + components + named style + numbers + states)
```
Redesign <PAGE> of CaseNexus (visual layer only; do not touch src/api, hooks, payloads, routes or test ids).
Page type: <operational list | detail | review | report>. Components: <list from Section 6>.
Style: Civic Ledger (DESIGN.md) with <1 or 2 allowed extras>. Numbers: 4px grid, radius 4/6, body 14px (16px on the review screen), transitions 120/200/320ms.
Responsive: usable at 1366x768 and 390px. States: loading skeleton, empty, error with retry, focus-visible, disabled.
Audience: government officers using it all day. Output: changed files, before/after screenshots, F00 suite result, and the unchanged API request set.
```

# Prompt: execute the frontend redesign

Two ways to run it. Pick one.

- **Mode 1: one agent, sequential (simplest, safest).** Paste Prompt A into one Antigravity (or Codex) session. It does F00 to F09 in order.
- **Mode 2: lanes with the overnight system.** Append `ops/TASKS_FRONTEND.md` to `ops/TASKS.md`, then paste `ops/AUTOPILOT_PROMPT.md` into the lane windows as before. The F-cards depend on each other (F03 to F06 can run in parallel after F02). Use only Antigravity lanes for these cards.

## Setup (both modes)
1. Put `FRONTEND_REDESIGN.md` at `docs/FRONTEND_REDESIGN.md`. Optional: put your Mobbin screenshots in `docs/design/refs/`.
2. The backend must be running in the lane (API and database), because the baseline records real API calls.
3. Work on a branch `feat/frontend-redesign` (Mode 1) or let `ops.sh` create `feat/F00` and so on (Mode 2).
4. Turn on auto-approve for terminal commands and file edits in that folder.

---

## Prompt A (paste this)

```
ROLE
You are a senior front-end engineer and product designer redesigning the CaseNexus web app (AICTE complaint dashboard). You work alone, step by step, and you PROVE every claim with real command output. Never ask me questions: if something is ambiguous, choose the most conservative option and record it under "Assumptions" in the task report.

GOAL
Make the frontend look designed, not generated, WITHOUT changing anything the backend sees. The browser must make the same API calls with the same payloads as before.

READ FIRST, COMPLETELY (in this order)
1. docs/FRONTEND_REDESIGN.md  (Section 1 is a non-negotiable safety contract; Sections 3 to 7 are the design and the task cards F00..F09; Appendix A, B, C are templates)
2. ops/RULEBOOK.md if it exists (rules against inventing names and fake results); otherwise apply these rules: verify every name with grep before using it; never claim success without pasted command output; stop a task after 3 failed fixes and write BLOCKED.
3. The existing frontend code: package.json, vite config, tailwind config, src/ tree, every page and shared component, src/api/**, the router, the auth code.

HARD CONTRACT (from section 1 of the redesign file)
- FROZEN, do not edit: src/api/**, request builders, query keys, payload shapes, response types, route paths, URL params, X-Total-Count handling, auth/token storage and 401 handling, form field names, existing data-testid values, VITE_* variable names, business logic in hooks (filtering, paging, decision payloads, policy toggle optimism and rollback).
- ALLOWED: markup, classes, CSS, layout, typography, icons, copy, empty/loading/error visuals, animation, and new presentational components under src/ui/.
- If a visual change seems to require touching a frozen thing, STOP that change, keep the old behaviour, and note it in the report.
- No external requests at runtime: no CDN fonts, remote images or hot-linked scripts. Self-host fonts with exact-pinned @fontsource packages.
- Add only dependencies named in the redesign file; pin exact versions (no ^, no latest); read each package's LICENSE; record versions in the report.
- Visual effect limits: animate only transform and opacity; at most 2 backdrop-filter elements per viewport; no smooth-scroll library inside the app shell (Lenis only on the login page, and only if that page scrolls); respect prefers-reduced-motion everywhere; never run "animate-ui ... animate all"; neumorphism is not used.
- Before using any named library component (Magic UI, VibeUI, Animate UI, Uiverse), confirm in that library's current docs or registry that it exists and read its licence. Names in the redesign file are suggestions, not facts. For Lenis, read the lenis/react README after installing; do not guess its API.

HOW TO WORK
Do the cards in docs/FRONTEND_REDESIGN.md Section 7 in this order: F00, F01, F02, then F03, F04, F06, F05, then F07, F08, F09. One card at a time, one commit per page or component group. After EACH card run the gate and paste the output into docs/reports/<card>.md:
  1. npx playwright test            (the suite from F00; must pass)
  2. the API request-set comparison (must be identical to e2e/baseline/api-calls.json)
  3. npx tsc --noEmit
  4. npm run build
  5. the offline test (all non-localhost requests aborted) and the reduced-motion test
  6. screenshots at 1366x768 and 390px width saved under docs/design/after/<card>/
If the gate fails, fix it before moving on; never edit a test or the baseline to make it pass (if the baseline is genuinely wrong, say why in the report and fix it visibly in its own commit).

STEP 0 (do this first and report it)
- Record the real stack: Tailwind major version, router, form library, TanStack Query/Table versions, Recharts, which shadcn components exist, how the frontend finds the API base URL.
- Start the backend and frontend; confirm login works with a demo account (check the README for credentials; do not invent any).
- Run F00 exactly as written. Do not start F01 until F00's suite passes on the UNMODIFIED UI and the baseline JSON is committed.

DESIGN INSTRUCTIONS
- Follow docs/design/DESIGN.md (Civic Ledger): warm paper background, ink-blue primary, dense tables, IBM Plex Sans and Mono self-hosted, 4px grid, radius 4/6, borders not shadows, status = icon + word + colour, compact KPI strip, vertical timeline, word-level diff on the overlap review screen (pure function with unit tests, no new API call).
- Use the token values in Section 4 of the redesign file. Run the contrast script from F01 and the dataviz palette check for charts; paste both outputs.
- Resource usage: Motion (motion/react) for animation; Animate UI per component for Tabs, Accordion and Sheet/Dialog transitions; VibeUI and Magic UI components only after verification; Uiverse only for the online/offline physical toggle and a few small elements, re-skinned to tokens; Lenis on login only; Sonner for toasts. Use the UI/UX Pro Max and Impeccable skills or commands if your tool supports them (init, document, shape, critique, audit, polish, harden, clarify); if not, use the checklist in Section 8 and say so.
- Copy: plain officer language, specific labels, no marketing phrases, no emoji, no exclamation marks. Every screen has loading, empty and error states that look designed.

WHEN YOU ARE UNSURE
Run grep. Read the file. Check the installed package's real API with the TypeScript types or its source. If a result looks too good, run it again. If the same error survives 3 different fixes, write BLOCKED in the report with the exact error and what you tried, skip to the next card, and continue.

DEV TOOL (optional, only if time allows)
Install agentation as a dev dependency and render it only when import.meta.env.DEV is true through a dynamic import. After "npm run build", grep -r agentation dist/ must find nothing.

FINISH
Write docs/reports/FRONTEND_FINAL.md with: a table of cards F00..F09 (DONE / PARTIAL / BLOCKED), before/after screenshot paths per page, the identical-API-calls result, the list of dependencies added with exact versions and licences, deviations, assumptions, and "Human checks" (what you could not verify by command). Do not merge; leave the branch for me. Do not describe anything as working unless a command output in the reports proves it.

Start now with STEP 0.
```

---

## Prompt B (small corrections you can send mid-run)

**Page looks off:** "Fix only `<element>` on `<page>`. Visual layer only. Do not touch src/api, hooks, payloads or test ids. Run the F00 suite and show that the API request set is unchanged."

**Agent drifted into frozen files:** "Revert any change to src/api/**, hooks and request builders with git checkout against `main`, redo the visual change in presentational components only, then rerun the gate."

**Library problem:** "Remove `<library>` from the page, restore the previous component, and use a plain Tailwind and Motion implementation instead. Show the gate output."

**Resume after the session died:** paste Prompt A again. It resumes by reading `git status`, `docs/reports/`, and the last passing card.

# TASKS_FRONTEND (append to ops/TASKS.md after round 1; same format)

Common to every card: read `ops/RULEBOOK.md`, `docs/FRONTEND_REDESIGN.md` (Section 1 is the safety contract), `docs/design/PRODUCT.md` and `docs/design/DESIGN.md` (created in F00 from Appendix A and B). Every card ends with the Section 1.3 gate (Playwright suite passes, API request set identical to baseline, tsc, build, offline test) and a report in `docs/reports/<ID>.md` with before/after screenshots.

---

## F00 Baseline and contract snapshot
Prefer: AG
Depends: none
Priority: MUST
Owns: `e2e/**`, `docs/design/**`, `playwright.config.ts`, dev dependency `@playwright/test`, `docs/reports/F00.md`
Do: (1) record the real stack versions (Tailwind major, router, forms, TanStack, Recharts, shadcn components in use); (2) write Playwright flows for: login, dashboard, case list with a filter, case detail, register case (resolve then submit), overlap review (link, dismiss), alerts (mark read), reports (one download), policy toggle (admin) and logout; (3) capture the **API request set per flow** into `e2e/baseline/api-calls.json` and a test that compares future runs to it; (4) the offline test (abort non-localhost) and the reduced-motion test; (5) "before" screenshots at 1366x768 and 390 px width into `docs/design/before/`; (6) write `docs/design/PRODUCT.md` and `DESIGN.md` from Appendix A and B; (7) list every `data-testid` in use. All tests must pass on the **unmodified** UI.
Checks: `npx playwright test` output; the baseline JSON committed.

## F01 Foundation: tokens, fonts, primitives
Prefer: AG
Depends: F00
Priority: MUST
Owns: `src/ui/**`, `src/styles/**`, Tailwind theme config, `index.css`, font packages
Do: tokens from Section 4 (CSS variables mapped into the Tailwind theme for the real Tailwind version); self-hosted fonts; the primitives in Section 4.6 that do not need page data (`PageHeader`, `FilterBar`, `DataTable`, `StatusChip`, `LevelBadge`, `Skeleton`, `EmptyState`, `ErrorState`, `ConfirmDialog`, `Tabs`); a hidden `/__ui` dev route showing every primitive in every state (dev only).
Checks: tsc, build, F00 suite unchanged, a script that prints the contrast ratio of every token pair and fails below 4.5 (text) or 3 (controls).

## F02 App shell and navigation
Prefer: AG
Depends: F01
Priority: MUST
Owns: `src/components/Layout.tsx`, `src/ui/shell/**`
Do: sidebar, top bar, alert bell (keep its polling), page transitions (opacity only), responsive collapse. Keep nav routes and the marked mode-bar region intact.
Checks: gate; the bell still polls at the same interval.

## F03 Data screens: dashboard, cases, case detail, institution
Prefer: AG
Depends: F02
Priority: MUST
Owns: `src/pages/{Dashboard,Cases,CaseDetail,Institution}.tsx` (presentation only), `src/ui/{KpiStrip,SlaDue,Timeline}.tsx`
Do: Section 6 for those screens. Keep data hooks and filter logic as they are.
Checks: gate per page; API request set identical.

## F04 Register dialog and overlap review
Prefer: AG
Depends: F02
Priority: MUST
Owns: `src/components/overlap/**`, `src/pages/Overlaps.tsx` (presentation), register-case dialog (presentation), `src/ui/WordDiff.tsx`, `src/lib/wordDiff.ts` with tests
Do: Section 6 for these screens. `wordDiff` is a pure function with unit tests (identical text, fully different, one word changed, empty, Hindi/Devanagari text, very long text capped at a sane length with a note). No new network calls.
Checks: gate; unit tests; decide payloads unchanged (the request set test covers this).

## F05 Alerts, reports, charts
Prefer: AG
Depends: F02
Priority: SHOULD
Owns: `src/pages/{Alerts,Reports}.tsx` (presentation), `src/components/{alerts,reports}/**`
Do: Section 6 and Section 4.2. Run the dataviz validator on the palette in use and paste its output into the report. Each chart has direct labels and a table toggle.

## F06 Mode bar, privacy and admin tabs
Prefer: AG
Depends: F02
Priority: MUST
Owns: `src/components/ModeBar.tsx`, `src/ui/ModeToggle.tsx`, `src/components/admin/**` (presentation)
Do: the physical toggle (an Uiverse starting point is allowed, re-skinned and inlined), confirm dialog, rollback on error, ledger table. Keep `PUT /api/policy` calls and optimistic logic untouched.
Checks: gate; toggling still changes the explanation source (human check if no browser).

## F07 Login and motion polish
Prefer: AG
Depends: F03, F04, F05, F06
Priority: SHOULD
Owns: `src/pages/Login.tsx`, motion helpers in `src/ui/motion/**`
Do: login treatment (glass or liquid glass with solid fallback; Lenis only if the page scrolls); motion tokens applied consistently (list stagger, dialog and sheet, number ticker on first load); reduced-motion variants; performance check with CPU throttling 4x on the dashboard and overlap review (no long tasks above 200 ms during navigation, measured and pasted).

## F08 Review and hardening
Prefer: ANY
Depends: F07
Priority: SHOULD
Do: run `critique`, `audit`, `harden`, `clarify` (Impeccable, if installed) per page, or the Section 8 checklist manually; fix findings; keyboard-only walk through every flow; check 1366x768 and 390 px; long names, empty data and error states.

## F09 Cleanup and final verification
Prefer: ANY
Depends: F08
Priority: MUST
Do: delete old unused components and styles only when `grep` shows no references; remove unused dependencies only if the build and F00 suite pass; licence summary; confirm Agentation is absent from `dist/`; "after" screenshots; final report with a before/after table and the list of every dependency added with exact versions.
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-10-27T17:30:14+05:30.
</ADDITIONAL_METADATA>