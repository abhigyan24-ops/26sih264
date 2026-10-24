<USER_REQUEST>
# STAGE 6 SPEC: Overlap Engine (the innovation)

Work order for **CaseNexus** Stage 6. Companion to `AICTE_Prototype_Build_Guide.md` (Stage 6, sections 6.1 to 6.6). Where this file and the guide disagree, **this file wins**; the reason for every difference is listed in Section 3.

Split into two parts, each with its own prompt:

| Part | Prompt file | Scope |
|---|---|---|
| **6A** | `ANTIGRAVITY_PROMPT_STAGE_6A.md` | Embeddings service, institution resolver, resolver tuning, resolve endpoint, `CaseIn.institution_id` |
| **6B** | `ANTIGRAVITY_PROMPT_STAGE_6B.md` | Features, training, scan, backfill, explanation stub, create-case wiring, frontend result panel |

---

## 0. How to read the snippets (important)

All code in this file is **reference, not a drop-in**. Each snippet carries one of these labels:

| Label | Meaning |
|---|---|
| **Run-tested** | The pure logic was executed in a scratch environment (no PostgreSQL, a Python stand-in for `pg_trgm`). Behaviour was observed, but real `pg_trgm` scores differ slightly |
| **Sketch** | Written carefully from the guide and library documentation, **never executed**. Expect small fixes |
| **Guide code** | Unchanged from the build guide |

What was actually run while preparing this spec, so you know what to trust:

1. The guide's resolver was simulated on 60 institutions with 8 kinds of messy name variants. **About 4% of auto-accepted matches were the wrong institution** (see D1 and D2). The corrected design was simulated too and removed the exact-match and word-order failures, but still needed a margin guard (D3).
2. `CalibratedClassifierCV(cv=5)` **raises `ValueError` when any class has fewer than 5 examples**, and **accepts a list of group-aware splits as `cv`** (scikit-learn 1.9.1).
3. A draft unit test showed that tuning the review floor against *top-1* accuracy cannot reach a 0.95 recall target (it reached 0.91), because some variants legitimately rank a sibling name first. The spec therefore uses *recall at top 5*, which is also what the officer sees (D5).

Everything else in Section 3 marked **Reasoned** comes from reading the guide's code, not from running it.

---

## 1. Goal

When an officer registers a complaint, the system must:

1. work out **which institution** it is about (with a confidence and a human-review path),
2. turn the complaint text into a **384-number embedding** locally,
3. compare it with the institution's other cases and produce a **calibrated probability** plus a per-feature **explanation**,
4. classify each pair as **High / Medium / Info**, store it in `overlap_links`, and raise an alert for both Bureaus/Cells when High or Medium.

Out of scope for Stage 6 (do not build): the overlap review screen and link/lead/hold/dismiss actions (Stage 7), the real online/offline router and egress gateway (Stage 9), `evaluate.py`, model cards and shadow mode (Stage 10).

---

## 2. Preconditions and repository reconnaissance

The code base is not visible to the author of this spec, so the coding agent must **inspect before changing anything** and report differences.

### 2.1 Preconditions

- Stages 0 to 5 merged; PostgreSQL (with `pg_trgm` and `vector`) running in Docker; schema from Stage 1 applied.
- `python -m scripts.seed` has been run (about 60 institutions, 400 cases, every case has an embedding).
- This file copied to `docs/STAGE_6_SPEC.md`.

### 2.2 Reconnaissance commands (run first, report results)

```bash
git status && git log --oneline -15
ls backend/app backend/app/services backend/app/routers backend/ml backend/scripts backend/tests
grep -rn "services.resolution\|services.overlap\|services.routing\|services.embeddings" backend --include=*.py
grep -n "class CaseIn" -A 12 backend/app/routers/cases.py
grep -n "def create_case" -A 30 backend/app/routers/cases.py
grep -n "normalize_name\|def normalize" -r backend --include=*.py
docker compose exec db psql -U aicte -d aicte -c "SELECT count(*) AS cases, count(embedding) AS embedded FROM cases;"
docker compose exec db psql -U aicte -d aicte -c "SELECT parameter, value, origin FROM parameter_registry;"
cd backend && python -c "import fastembed, sklearn; print(fastembed.__version__, sklearn.__version__)"
```

Report a table of: files that exist vs files this spec expects, any Stage 3 stubs for `resolution`, `overlap`, `routing`, `embeddings` (Stage 3's router imports them before they exist), and any place Stages 3 to 5 already diverged from the guide.

---

## 3. Deltas from the guide (what changes and why)

| ID | Where | Problem | Evidence | Fix in this spec |
|---|---|---|---|---|
| **D1** | `resolution.py` score | `min(1.0, 0.5*trgm + 0.5*tok + 0.1*city)` is capped, so an exact match and a near-identical sibling both score 1.0 and the first row wins. "X College of Engineering, City" and "X Engineering College, City" are indistinguishable | **Run-tested** (wrong institution auto-accepted in 5 of 480 variants) | Weights sum to 1.0, no cap, ranking by raw score |
| **D2** | `resolution.py` | No exact normalised-name shortcut, so an exact name can lose to a sibling | **Run-tested** | Exact unique normalised-name match returns confidence 1.0 before the threshold rule (`resolve_ranked`) |
| **D3** | `resolution.py` | Auto-accept ignores the runner-up. When two institutions score almost the same, one is picked silently | **Run-tested** (4 wrong auto-accepts remained until a margin was required) | Auto-accept requires `best - second >= resolver_margin`, otherwise `needs_review` |
| **D4** | `resolution.py` | Thresholds hard-coded; candidate limit 5 can drop the right candidate when the city is missing | **Reasoned** | Thresholds read from `parameter_registry` (defaults until tuned); candidate limit 10 |
| **D5** | tuning | Guide defers tuning to Stage 10; Stage 6 needs working thresholds | **Run-tested** (recall@1 target unreachable) | `ml/tune_resolver.py` tunes on generated name variants and negative controls using **recall@5**; writes registry rows |
| **D6** | `seed.py` | Has its own copy of `normalize`; any change to the resolver's normaliser would silently diverge | **Reasoned** | Seed imports `normalize` from `app.services.resolution` |
| **D7** | `routers/cases.py` | The 422 message says "pick one manually" but `CaseIn` has no `institution_id`, so there is no way to do it | **Reasoned** | Add optional `institution_id`; add `GET /api/institutions/resolve` for the "did you mean" list |
| **D8** | `services/overlap.py` | Imports `explain_overlap` from `routing.py`, which belongs to Stage 9 | **Reasoned** | Create a stub `routing.py` that always returns the template explanation, same signature Stage 9 will keep |
| **D9** | `overlap.py` | Explanation (and, in Stage 9, an egress call) is computed for every candidate, even pairs that already exist; sensitivity checks only the new case | **Reasoned** | Check pair existence first; sensitive if **either** case is flagged; `egress.send` in Stage 9 commits mid-transaction, so run the scan in a SAVEPOINT |
| **D10** | `overlap.py` | Model cached forever; retraining needs a server restart. Pointer stored with joblib | **Reasoned** | Plain-text `ACTIVE` pointer, re-read on each scan, cache keyed by version |
| **D11** | `train_overlap.py` | `cv=5` inside the calibrator is not grouped by institution (leakage inside calibration), and it crashes with fewer than 5 positives | **Run-tested** (crash, and grouped-split list works) | `StratifiedGroupKFold` splits passed as `cv`; abort with a clear message under 25 positive training pairs |
| **D12** | `train_overlap.py` | Thresholds are chosen on the same test set that is then used to report precision and recall, so the reported numbers are optimistic | **Reasoned** | Thresholds from out-of-fold predictions on the training institutions; the held-out test institutions are touched only once, for reporting |
| **D13** | `train_overlap.py` | Silent fallback to 0.9 / 0.5 when no threshold meets the target, still labelled `learned_synthetic`; old models stay `active`; version id has minute resolution | **Reasoned** | Fallbacks labelled `default_pending_data`; previous active models set to `retired`; version id has seconds |
| **D14** | `train_overlap.py` | No baseline, no calibration check, no warning that synthetic data may be too easy; probabilities are calibrated to the synthetic base rate | **Reasoned** | Report a cosine-only baseline, Brier score, a 5-bin reliability table, and the share of positive pairs with near-identical text |
| **D15** | pipeline | After seed + train, `overlap_links` is empty, so the dashboard banner and Stage 7 screen have nothing to show | **Reasoned** | `scripts/scan_all.py` backfills (idempotent; `--rebuild` replaces suggested links only) |
| **D16** | `embeddings.py` | fastembed's default cache may be a temp directory (model re-downloaded or lost); no dimension check; first request is slow | **Reasoned** (verify the `cache_dir` argument in the installed version) | Explicit `cache_dir`, dimension assertion, warm-up at app start |
| **D17** | `overlap.py` | Train/serve skew if `FEATURES` changes after a model was trained | **Reasoned** | Artifact stores `features`; load fails loudly if they differ |
| **D18** | `routers/cases.py` `list_cases` | `"i.normalized_name % :inst OR i.name ILIKE :instl"` is appended without parentheses, so `OR` breaks the `AND` chain. With the institution filter plus other filters, rows ignore the other filters, **and the regional scope clause can be bypassed** | **Reasoned** (not run). Stage 5 may already have fixed it | Check; if present, wrap in parentheses and add a regression test |
| **D19** | design | **Decision needed.** The handbook (Section 6.2) and PPT content describe Medium as "same institution, different issue". The guide's classifier gives such pairs a very low probability, so **no overlap row is created** (they appear in the case page's "active siblings" banner and the institution page instead) | **Reasoned** | Default = guide behaviour (see Section 4.4). Option B in 4.4 if you want different-issue pairs to be Medium |

---

## 4. Design

### 4.1 Pipeline

```
POST /api/cases (name, city?, aicte_id?, institution_id?, category, description, ...)
   |
   +-- institution_id given?  yes -> confidence 1.0, no review
   |                          no  -> resolve_detailed(): ID -> exact name -> scored candidates -> decide()
   |        no institution and none picked -> 422 with candidates in the body
   |
   +-- embed description (384 numbers, local)  -> INSERT case (+ first action)
   |
   +-- SAVEPOINT: scan_overlaps(case_id)
          for each other case of the same institution (max 200):
             features(6) -> calibrated probability -> level -> INSERT overlap_link (new pairs only)
                                                    -> alerts for both Bureaus/Cells (High, Medium)
   +-- COMMIT; response includes institution_match and overlaps
```

### 4.2 Institution resolver

Score for each candidate (weights sum to 1.0, so the maximum is 1.0):

```
score = 0.45 * trigram_similarity + 0.45 * idf_weighted_token_overlap + 0.10 * city_matches
```

Decision order in `resolve_detailed`:

| Step | Rule | confidence | needs_review |
|---|---|---|---|
| 1 | AICTE Permanent ID exists | 1.0 | no |
| 2 | Exactly one candidate with the **same normalised name** (and the same city if a city was given) | 1.0 | no |
| 3 | `best < review_floor` | best | yes (no institution chosen) |
| 4 | `best >= auto_accept` and `best - second >= margin` | best | no |
| 5 | `best >= auto_accept` but within `margin` of the runner-up | best | yes (`ambiguous`) |
| 6 | between `review_floor` and `auto_accept` | best | yes (`review`) |

Defaults until tuned (origin `default_pending_data`): `resolver_auto_accept 0.85`, `resolver_review_floor 0.55`, `resolver_margin 0.05`.

### 4.3 Tuning policy (parameters learned from data, targets are policy)

| Policy target | Value | Meaning |
|---|---|---|
| Auto-accept precision | 0.98 | of matches accepted without review, at least this share are the right institution |
| Unknown institutions auto-accepted | 0 | a name that is not in the master list must never be auto-accepted |
| Review recall at top 5 | 0.95 | the right institution appears among the 5 shown candidates, with a score at or above the review floor |
| Overlap High precision | 0.90 | (training script) false alarms cause alert fatigue |
| Overlap Medium recall | 0.90 | (training script) |

Tuning picks the `(auto_accept, margin)` that **maximises the auto-accept rate** subject to the first two targets, then sets `review_floor` to the 5th percentile of the true institution's score among positives where it appears in the top 5. If no combination meets the targets, defaults are kept and registry origin is `default_pending_data`.

### 4.4 Overlap levels (decision D19)

| Level | Rule (guide behaviour, **default**) |
|---|---|
| High | `p >= t_high` and both cases open and different Bureaus/Cells |
| Medium | `p >= t_med` and both cases open (includes high-probability pairs in the same Bureau, and pairs between `t_med` and `t_high`) |
| Info | `p >= t_med` and at least one case closed |
| none | `p < t_med` (different-issue pairs usually land here) |

**Option B (only if you decide so):** also create a `medium` row for every pair of open cases at the same institution handled by different units, whatever the probability. That matches the handbook wording, but creates up to one Medium alert per such pair. Do **not** implement Option B unless the owner confirms; otherwise update the handbook and PPT wording instead.

### 4.5 Parameter registry rows written in Stage 6

| parameter | origin when targets met | origin otherwise | written by |
|---|---|---|---|
| `resolver_auto_accept`, `resolver_review_floor`, `resolver_margin` | `learned_synthetic` | `default_pending_data` | `ml/tune_resolver.py` |
| `overlap_threshold_high`, `overlap_threshold_medium` | `learned_synthetic` | `default_pending_data` | `ml/train_overlap.py` |

All values come from **synthetic** data and must be described that way anywhere they are shown.

---

## 5. Part 6A work order

### 5.1 File list

| File | Action |
|---|---|
| `backend/app/config.py` | add `embed_cache_dir: str = "./models"` |
| `backend/app/services/embeddings.py` | replace |
| `backend/app/services/resolution.py` | replace |
| `backend/ml/name_variants.py` | new |
| `backend/ml/tune_core.py` | new |
| `backend/ml/tune_resolver.py` | new |
| `backend/app/routers/institutions.py` | add `GET /resolve` (declare **before** `/{inst_id}`) |
| `backend/app/routers/cases.py` | `CaseIn.institution_id`, use `resolve_detailed`, 422 body with candidates |
| `backend/scripts/seed.py` | import `normalize` from `app.services.resolution` |
| `backend/app/main.py` | warm up the model at start |
| `backend/tests/test_resolution.py` | new |
| `.gitignore` | add `backend/models/` |

### 5.2 `app/config.py` and `app/services/embeddings.py` (**Sketch**)

```python
# config.py: add to Settings
embed_cache_dir: str = "./models"
```

```python
# services/embeddings.py
import logging
from functools import lru_cache
from fastembed import TextEmbedding
from ..config import settings

log = logging.getLogger(__name__)

@lru_cache(maxsize=1)
def _model() -> TextEmbedding:
    # cache_dir keeps the model on disk between runs (needed for the offline demo).
    # Verify that your installed fastembed accepts cache_dir; check TextEmbedding.__init__.
    return TextEmbedding(model_name=settings.embed_model, cache_dir=settings.embed_cache_dir)

def embed_many(texts: list[str]) -> list[list[float]]:
    clean = [(t or "").strip() for t in texts]
    if any(not t for t in clean):
        raise ValueError("cannot embed empty text")
    vecs = [v.tolist() for v in _model().embed(clean)]
    for v in vecs:
        if len(v) != settings.embed_dim:
            raise RuntimeError(f"embedding has {len(v)} dims, schema expects {settings.embed_dim} "
                               f"(model {settings.embed_model})")
    return vecs

def embed_one(text_: str) -> list[float]:
    return embed_many([text_])[0]

def vec_literal(v: list[float]) -> str:
    return "[" + ",".join(f"{x:.6f}" for x in v) + "]"

def warm_up() -> None:
    embed_one("warm up")
    log.info("embedding model ready: %s", settings.embed_model)
```

```python
# main.py: add
import logging
from contextlib import asynccontextmanager
from .services.embeddings import warm_up

@asynccontextmanager
async def lifespan(app):
    try:
        warm_up()
    except Exception:
        logging.getLogger(__name__).exception("embedding warm-up failed; first request will retry")
    yield

app = FastAPI(title="AICTE Complaint Dashboard API", lifespan=lifespan)
```

> The model name `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (384 dimensions, Apache-2.0) is listed in fastembed's supported-models table. After installing, still confirm with `TextEmbedding.list_supported_models()`.

### 5.3 `app/services/resolution.py` (**Run-tested** for the pure functions; the database helpers are a **Sketch**)

```python
"""Institution resolution. Pure functions are separated from database helpers so they can be unit-tested."""
import math
import re
from collections import Counter
from sqlalchemy import bindparam, text

W_TRGM, W_TOK, W_CITY = 0.45, 0.45, 0.10            # sum to 1.0; policy defaults (default_pending_data)
DEFAULTS = {"resolver_auto_accept": 0.85, "resolver_review_floor": 0.55, "resolver_margin": 0.05}
CANDIDATE_LIMIT = 10
ABBR = [(r"\bgovt\.?\b", "government"), (r"\bengg\.?\b", "engineering"),
        (r"\binst\.?\b", "institute"), (r"\btech\.?\b", "technology")]

# ---------------- pure functions
def normalize(s: str) -> str:
    s = (s or "").lower()
    for pat, rep in ABBR:
        s = re.sub(pat, rep, s)
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()

def idf_from_names(names: list[str]) -> dict[str, float]:
    n = len(names) or 1
    df = Counter(t for nm in names for t in set(nm.split()))
    return {t: math.log((n + 1) / (c + 1)) + 1.0 for t, c in df.items()}

def idf_overlap(a: list[str], b: list[str], idf: dict[str, float]) -> float:
    sa, sb = set(a), set(b)
    if not sa or not sb:
        return 0.0
    default = math.log(2) + 1.0
    w = lambda t: idf.get(t, default)
    union = sum(w(t) for t in sa | sb)
    return sum(w(t) for t in sa & sb) / union if union else 0.0

def city_equal(a, b) -> bool:
    return bool(a) and bool(b) and a.strip().lower() == b.strip().lower()

def score_candidate(q_tokens, c_tokens, trgm: float, city_match: bool, idf) -> float:
    return W_TRGM * trgm + W_TOK * idf_overlap(q_tokens, c_tokens, idf) + (W_CITY if city_match else 0.0)

def decide(ranked: list[dict], th: dict):
    """ranked sorted by score desc. Returns (institution_id | None, confidence, needs_review, reason)."""
    if not ranked:
        return None, 0.0, True, "no_candidates"
    best = ranked[0]
    second = ranked[1]["score"] if len(ranked) > 1 else 0.0
    if best["score"] < th["resolver_review_floor"]:
        return None, best["score"], True, "low_score"
    if best["score"] >= th["resolver_auto_accept"]:
        if best["score"] - second >= th["resolver_margin"]:
            return best["id"], best["score"], False, "auto"
        return best["id"], best["score"], True, "ambiguous"
    return best["id"], best["score"], True, "review"

def resolve_ranked(ranked, qn: str, city, th: dict):
    """Exact normalised-name shortcut first, then the threshold rule."""
    exact = [c for c in ranked if c["normalized_name"] == qn]
    if city:
        exact = [c for c in exact if city_equal(city, c["city"])]
    if len(exact) == 1:
        return exact[0]["id"], 1.0, False, "exact_name"
    return decide(ranked, th)

# ---------------- database helpers
def load_thresholds(db) -> dict:
    q = text("""SELECT DISTINCT ON (parameter) parameter, value FROM parameter_registry
                WHERE parameter IN :names ORDER BY parameter, created_at DESC, id DESC""")
    q = q.bindparams(bindparam("names", expanding=True))
    th = dict(DEFAULTS)
    for r in db.execute(q, {"names": list(DEFAULTS)}):
        try:
            th[r.parameter] = float(r.value)
        except ValueError:
            pass
    return th

def rank_candidates(db, name: str, city, limit: int = CANDIDATE_LIMIT) -> list[dict]:
    qn = normalize(name)
    if not qn:
        return []
    cands = db.execute(text("""
        SELECT id, name, normalized_name, city, similarity(normalized_name, :n) AS trgm
        FROM institutions WHERE normalized_name % :n ORDER BY trgm DESC LIMIT :lim"""),
        {"n": qn, "lim": limit}).mappings().all()
    if not cands:
        return []
    idf = idf_from_names(db.execute(text("SELECT normalized_name FROM institutions")).scalars().all())
    q_tok = qn.split()
    out = [{"id": c["id"], "name": c["name"], "city": c["city"], "normalized_name": c["normalized_name"],
            "trgm": round(float(c["trgm"]), 3),
            "score": score_candidate(q_tok, c["normalized_name"].split(), float(c["trgm"]),
                                     city_equal(city, c["city"]), idf)} for c in cands]
    out.sort(key=lambda x: -x["score"])
    return out

def _public(ranked):
    return [{"id": c["id"], "name": c["name"], "city": c.get("city"), "score": round(c["score"], 3)} for c in ranked[:5]]

def resolve_detailed(db, aicte_id, name: str, city) -> dict:
    th = load_thresholds(db)
    if aicte_id:
        row = db.execute(text("SELECT id, name, city FROM institutions WHERE aicte_permanent_id=:a"),
                         {"a": aicte_id.strip()}).first()
        if row:
            return {"institution_id": row.id, "confidence": 1.0, "needs_review": False, "reason": "aicte_id",
                    "candidates": [{"id": row.id, "name": row.name, "city": row.city, "score": 1.0}]}
    ranked = rank_candidates(db, name, city)
    inst_id, conf, review, reason = resolve_ranked(ranked, normalize(name), city, th)
    return {"institution_id": inst_id, "confidence": round(conf, 4), "needs_review": review,
            "reason": reason, "candidates": _public(ranked)}

def resolve_institution(db, aicte_id, name, city):
    """Stage 3-compatible 3-tuple."""
    r = resolve_detailed(db, aicte_id, name, city)
    return r["institution_id"], r["confidence"], r["needs_review"]
```

Notes for the implementer:
- In `text()` a literal `%` (the `pg_trgm` operator) is escaped by SQLAlchemy automatically; do not double it.
- The `IN :names` expanding bind parameter is used instead of `ANY(:list)` to stay driver-neutral.
- `idf_from_names` re-reads all institution names on every call. That is fine at this size; add a 60-second cache if the master list grows.

### 5.4 Name variants and tuning

**`ml/name_variants.py`** (**Run-tested**): generates, per institution, 8 variants (`exact`, `abbr`, `upper`, `typo`, `trailing`, `drop_of`, `no_city`, `no_city_given_city`) with `truth_id`, plus **negative controls** with `truth_id = None`: `unknown_name` (a prefix that is not in the master list) and `other_city` (a real institution's name moved to a city where it does not exist).

```python
import random

NEG_PREFIXES = ["Kalinga Valley", "Narmada Heritage", "Himalayan Crest", "Deccan Pioneer", "Saraswati Vidya",
                "Coastal Horizon", "Aravalli Summit", "Godavari Frontier"]
TYPE_WORDS = ["Institute of Technology", "College of Engineering", "Engineering College",
              "Institute of Management", "College of Pharmacy"]
ALL_CITIES = ["Pune", "Nagpur", "Bengaluru", "Mysuru", "Chennai", "Coimbatore", "Hyderabad", "Jaipur", "Lucknow",
              "Kanpur", "Bhopal", "Indore", "Kolkata", "Bhubaneswar", "Patna", "Ahmedabad", "Surat", "Chandigarh"]

def _core(name, city):
    return name.rsplit(",", 1)[0].strip() if "," in name else name.replace(city, "").strip()

def variants_for(inst):                       # inst: {'id','name','city'}
    nm, city, core = inst["name"], inst["city"], _core(inst["name"], inst["city"])
    abbr = (nm.replace("College of Engineering", "Coll. of Engg.").replace("Engineering College", "Engg. College")
              .replace("Institute", "Inst.").replace("Technology", "Tech."))
    rows = [("exact", nm, city), ("abbr", abbr, city), ("upper", nm.upper(), city),
            ("typo", nm.replace("Technology", "Tecnology").replace("Engineering", "Enginering"), city),
            ("trailing", nm + " (AICTE approved)", city), ("drop_of", nm.replace(" of ", " "), city),
            ("no_city", core, None), ("no_city_given_city", core, city)]
    return [{"kind": k, "name": n, "city": c, "truth_id": inst["id"]} for k, n, c in rows]

def negatives(insts, seed=11, per_kind=40):
    rng = random.Random(seed)
    existing = {(_core(i["name"], i["city"]).lower(), i["city"].lower()) for i in insts}
    out = [{"kind": "unknown_name", "city": (c := rng.choice(ALL_CITIES)), "truth_id": None,
            "name": f"{rng.choice(NEG_PREFIXES)} {rng.choice(TYPE_WORDS)}, {c}"} for _ in range(per_kind)]
    tries = 0
    while sum(o["kind"] == "other_city" for o in out) < per_kind and tries < 2000:
        tries += 1
        i, c = rng.choice(insts), rng.choice(ALL_CITIES)
        core = _core(i["name"], i["city"])
        if (core.lower(), c.lower()) in existing or c.lower() == i["city"].lower():
            continue
        out.append({"kind": "other_city", "name": f"{core}, {c}", "city": c, "truth_id": None})
    return out
```

**`ml/tune_core.py`** (**Sketch**, revised from the run-tested draft to use **recall at top 5**):

```python
from app.services.resolution import resolve_ranked

AUTO_PRECISION_TARGET = 0.98
REVIEW_RECALL_TARGET = 0.95
TOPK = 5

def _truth_score(c):
    for r in c["ranked"][:TOPK]:
        if r["id"] == c["truth_id"]:
            return r["score"]
    return None

def evaluate(cases, th):
    """cases: [{'truth_id', 'qn', 'city', 'ranked': [{'id','score','normalized_name','city'}]}]"""
    auto = auto_ok = neg_auto = pos = hit = 0
    for c in cases:
        inst_id, _, _, reason = resolve_ranked(c["ranked"], c["qn"], c["city"], th)
        if reason in ("auto", "exact_name"):
            auto += 1
            auto_ok += int(inst_id == c["truth_id"])
            neg_auto += int(c["truth_id"] is None)
        if c["truth_id"] is not None:
            pos += 1
            s = _truth_score(c)
            hit += int(s is not None and s >= th["resolver_review_floor"])
    return {"auto": auto, "auto_precision": auto_ok / auto if auto else None, "neg_auto": neg_auto,
            "auto_rate": auto / len(cases) if cases else 0.0,
            "review_recall_at5": hit / pos if pos else None}

def choose(cases):
    """Returns (thresholds, metrics, targets_met)."""
    scores = sorted(s for c in cases if c["truth_id"] is not None and (s := _truth_score(c)) is not None)
    floor = scores[int(0.05 * len(scores))] if scores else 0.55
    best = best_m = None
    for margin in (0.03, 0.05, 0.08, 0.10, 0.15, 0.20):
        for a in [x / 100 for x in range(60, 101)]:
            th = {"resolver_auto_accept": a, "resolver_review_floor": min(floor, a), "resolver_margin": margin}
            m = evaluate(cases, th)
            if m["auto"] and m["auto_precision"] >= AUTO_PRECISION_TARGET and m["neg_auto"] == 0:
                if best_m is None or m["auto_rate"] > best_m["auto_rate"]:
                    best, best_m = th, m
    if best is None:
        th = {"resolver_auto_accept": 0.95, "resolver_review_floor": min(floor, 0.95), "resolver_margin": 0.10}
        return th, evaluate(cases, th), False
    met = (best_m["review_recall_at5"] or 0) >= REVIEW_RECALL_TARGET
    return best, best_m, met
```

**`ml/tune_resolver.py`** (**Sketch**): loads institutions, builds variants plus negatives, calls `rank_candidates` once per variant (real `pg_trgm`), runs `choose`, **prints a per-kind accuracy table** (so you can see which kinds fail), and with `--dry-run` writes nothing. Otherwise inserts three `parameter_registry` rows.

```python
"""Run from backend/:  python -m ml.tune_resolver [--dry-run]"""
import json, sys
from collections import defaultdict
from sqlalchemy import text
from app.db import SessionLocal
from app.services.resolution import rank_candidates, normalize, resolve_ranked, load_thresholds
from ml.name_variants import variants_for, negatives
from ml.tune_core import choose, AUTO_PRECISION_TARGET, REVIEW_RECALL_TARGET

def main(dry: bool):
    with SessionLocal() as db:
        insts = [dict(r) for r in db.execute(text("SELECT id, name, city FROM institutions"))
                 .mappings()]
        work = [v for i in insts for v in variants_for(i)] + negatives(insts)
        cases = [{"truth_id": v["truth_id"], "kind": v["kind"], "qn": normalize(v["name"]), "city": v["city"],
                  "ranked": rank_candidates(db, v["name"], v["city"])} for v in work]
        th, m, met = choose(cases)
        per_kind = defaultdict(lambda: {"n": 0, "auto_ok": 0, "auto_wrong": 0, "review": 0})
        for c in cases:
            iid, _, review, reason = resolve_ranked(c["ranked"], c["qn"], c["city"], th)
            k = per_kind[c["kind"]]; k["n"] += 1
            if reason in ("auto", "exact_name"):
                k["auto_ok" if iid == c["truth_id"] else "auto_wrong"] += 1
            else:
                k["review"] += 1
        print(json.dumps({"thresholds": th, "metrics": m, "targets_met": met,
                          "per_kind": per_kind, "cases": len(cases)}, indent=2, default=dict))
        if dry:
            return
        origin = "learned_synthetic" if met else "default_pending_data"
        for p, v in th.items():
            db.execute(text("""INSERT INTO parameter_registry (parameter,value,origin,derived_from,metrics)
                               VALUES (:p,:v,:o,:d,CAST(:m AS jsonb))"""),
                       {"p": p, "v": f"{v:.4f}", "o": origin,
                        "d": f"synthetic name variants; auto precision >= {AUTO_PRECISION_TARGET}, 0 unknown auto-accepted, "
                             f"recall@5 >= {REVIEW_RECALL_TARGET}", "m": json.dumps(m)})
        db.commit()

if __name__ == "__main__":
    main("--dry-run" in sys.argv)
```

### 5.5 API changes (**Sketch**)

```python
# routers/institutions.py   (declare BEFORE @router.get("/{inst_id}"))
from ..services.resolution import resolve_detailed

@router.get("/resolve")
def resolve(name: str, city: str | None = None, aicte_id: str | None = None,
            db=Depends(get_db), user=Depends(current_user)):
    return resolve_detailed(db, aicte_id, name, city)
```

Apply whatever **region scoping** Stage 5 used for institution routes. If none exists, filter candidates to the user's region for `regional` users and return 403 from `create_case` when the chosen institution is outside it.

```python
# routers/cases.py
class CaseIn(BaseModel):
    institution_name: str
    institution_id: int | None = None      # officer-picked; skips resolution
    aicte_id: str | None = None
    city: str | None = None
    category: str
    description: str
    bureau_code: str
    sensitive: bool = False

# inside create_case, replace the resolution lines:
if body.institution_id:
    exists = db.execute(text("SELECT 1 FROM institutions WHERE id=:i"), {"i": body.institution_id}).first()
    if not exists:
        raise HTTPException(422, "institution_id does not exist")
    inst_id, conf, needs_review, reason = body.institution_id, 1.0, False, "officer_confirmed"
else:
    r = resolve_detailed(db, body.aicte_id, body.institution_name, body.city)
    inst_id, conf, needs_review, reason = r["institution_id"], r["confidence"], r["needs_review"], r["reason"]
    if inst_id is None:
        raise HTTPException(422, detail={"message": "Institution could not be resolved; pick one",
                                         "candidates": r["candidates"]})
```

### 5.6 Seed change

In `scripts/seed.py` delete the local `normalize` and add `from app.services.resolution import normalize`. Re-run seed (it truncates and rebuilds), then tune.

### 5.7 Part 6A run order

```bash
cd backend
python -m scripts.seed
python -m ml.tune_resolver --dry-run     # inspect per-kind table first
python -m ml.tune_resolver               # write registry rows
pytest -q tests/test_resolution.py
```

---

## 6. Part 6B work order

### 6.1 File list

| File | Action |
|---|---|
| `backend/app/services/features.py` | guide code (remove unused import) |
| `backend/ml/train_overlap.py` | replace the guide's version |
| `backend/app/services/routing.py` | **stub** (replaced in Stage 9) |
| `backend/app/services/overlap.py` | replace |
| `backend/scripts/scan_all.py` | new |
| `backend/app/routers/cases.py` | scan inside a SAVEPOINT; richer response |
| `backend/tests/test_overlap.py`, `backend/tests/test_train_select.py` | new |
| frontend | register-case dialog result panel; case detail overlap chips (Section 6.8) |

### 6.2 `features.py` (**Guide code**)

```python
import math

FEATURES = ["inst_conf", "cos", "same_category", "log_days", "both_active", "cross_bureau"]

def pair_features(a: dict, b: dict, cos: float) -> list[float]:
    days = abs((a["received_date"] - b["received_date"]).days)
    return [min(a["inst_match_conf"], b["inst_match_conf"]), cos,
            1.0 if a["category"] == b["category"] else 0.0, math.log1p(days),
            1.0 if (a["closed_date"] is None and b["closed_date"] is None) else 0.0,
            1.0 if a["bureau_id"] != b["bureau_id"] else 0.0]
```

### 6.3 `ml/train_overlap.py` (**Sketch**; the sklearn pieces marked below were checked against scikit-learn 1.9.1)

Procedure:

1. Load all same-institution case pairs (guide's `load_pairs`); label = same `issue_key`.
2. **Abort with a clear message** if there are fewer than 50 positive pairs overall or fewer than 25 in training.
3. `GroupShuffleSplit(test_size=0.2)` by institution → TRAIN / TEST. TEST is used **once**, for reporting.
4. On TRAIN: 5 `StratifiedGroupKFold` folds produce **out-of-fold calibrated probabilities**.
5. Choose thresholds from those out-of-fold probabilities.
6. Fit the final calibrated model and the explanation model on all of TRAIN; report on TEST at the chosen thresholds.
7. Save artifact, write `ACTIVE`, retire old models, write registry rows.

```python
"""Run from backend/:  python -m ml.train_overlap"""
import datetime, itertools, json
from collections import defaultdict
from pathlib import Path
import joblib, numpy as np
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, brier_score_loss, precision_recall_curve
from sklearn.model_selection import GroupShuffleSplit, StratifiedGroupKFold
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sqlalchemy import text
from app.db import engine
from app.services.features import FEATURES, pair_features

TARGET_PRECISION_HIGH = 0.90      # policy
TARGET_RECALL_MEDIUM = 0.90       # policy
MIN_FLAGGED = 10                  # a threshold must flag at least this many out-of-fold pairs to count
MIN_POS_ALL, MIN_POS_TRAIN = 50, 25
ART = Path("ml/artifacts")

def _base():
    return make_pipeline(StandardScaler(), LogisticRegression(class_weight="balanced", max_iter=1000))

def make_calibrated(X, y, g):
    """Calibration folds are grouped by institution (no leakage). Needs >= 5 positives per fold's training part."""
    splits = list(StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=7).split(X, y, g))
    return CalibratedClassifierCV(_base(), method="sigmoid", cv=splits).fit(X, y)

def oof_probs(X, y, g):
    oof = np.zeros(len(y))
    for tr, va in StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=11).split(X, y, g):
        oof[va] = make_calibrated(X[tr], y[tr], g[tr]).predict_proba(X[va])[:, 1]
    return oof

def select_thresholds(y, p):
    prec, rec, thr = precision_recall_curve(y, p)
    prec, rec = prec[:-1], rec[:-1]
    flagged = (p[:, None] >= thr[None, :]).sum(axis=0)
    ok_hi = thr[(prec >= TARGET_PRECISION_HIGH) & (flagged >= MIN_FLAGGED)]
    ok_me = thr[rec >= TARGET_RECALL_MEDIUM]
    hi_met, me_met = len(ok_hi) > 0, len(ok_me) > 0
    t_high = float(ok_hi.min()) if hi_met else 0.90          # fallback, labelled default_pending_data
    t_med = float(ok_me.max()) if me_met else 0.50
    return {"t_high": t_high, "t_med": min(t_med, t_high), "high_origin": "learned_synthetic" if hi_met else "default_pending_data",
            "med_origin": "learned_synthetic" if me_met else "default_pending_data"}

def at(y, p, t):
    pred = p >= t; tp = int((pred & (y == 1)).sum()); n = int(pred.sum())
    return {"flagged": n, "precision": tp / n if n else None, "recall": tp / max(1, int(y.sum()))}

# load_pairs(): as in the guide (returns X, y, g), plus diagnostics below

def main():
    X, y, g = load_pairs()
    print(f"pairs={len(y)} positives={int(y.sum())} ({y.mean():.1%}) institutions={len(set(g))}")
    if y.sum() < MIN_POS_ALL:
        raise SystemExit(f"Only {int(y.sum())} positive pairs; need >= {MIN_POS_ALL}. Re-seed with more institutions.")
    tr, te = next(GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=7).split(X, y, g))
    if y[tr].sum() < MIN_POS_TRAIN:
        raise SystemExit("Too few positive training pairs; re-seed with more institutions.")
    p_oof = oof_probs(X[tr], y[tr], g[tr])
    sel = select_thresholds(y[tr], p_oof)
    cal = make_calibrated(X[tr], y[tr], g[tr])
    explain = _base().fit(X[tr], y[tr])
    p_te = cal.predict_proba(X[te])[:, 1]
    cos_te = X[te][:, FEATURES.index("cos")]
    base_pred = cos_te >= 0.80                                   # baseline: cosine alone at a fixed cutoff
    btp = int((base_pred & (y[te] == 1)).sum())
    frac, mean_p = calibration_curve(y[te], p_te, n_bins=5, strategy="quantile")
    metrics = {"split": "grouped by institution, 20% test, thresholds from out-of-fold predictions on train",
               "n_pairs": int(len(y)), "n_pos_train": int(y[tr].sum()), "n_pos_test": int(y[te].sum()),
               "pr_auc_test": float(average_precision_score(y[te], p_te)), "brier_test": float(brier_score_loss(y[te], p_te)),
               "high": at(y[te], p_te, sel["t_high"]), "medium": at(y[te], p_te, sel["t_med"]),
               "baseline_cos_0.80": {"flagged": int(base_pred.sum()),
                                     "precision": btp / int(base_pred.sum()) if base_pred.sum() else None,
                                     "recall": btp / max(1, int(y[te].sum()))},
               "reliability_5bin": {"mean_predicted": mean_p.round(3).tolist(), "observed": frac.round(3).tolist()},
               "positives_with_cos>=0.99": float((X[:, FEATURES.index("cos")][y == 1] >= 0.99).mean()),
               "note": "synthetic data; probabilities calibrated to the synthetic base rate"}
    version = "overlap-" + datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    ART.mkdir(parents=True, exist_ok=True)
    joblib.dump({"calibrated": cal, "explain": explain, "features": FEATURES, "t_high": sel["t_high"],
                 "t_med": sel["t_med"], "version": version}, ART / f"{version}.joblib")
    (ART / "ACTIVE").write_text(version)
    with engine.begin() as c:
        c.execute(text("UPDATE model_versions SET status='retired' WHERE kind='overlap' AND status='active'"))
        c.execute(text("INSERT INTO model_versions (id,kind,trained_on,metrics,status) "
                       "VALUES (:i,'overlap',:t,CAST(:m AS jsonb),'active')"),
                  {"i": version, "t": "synthetic seed", "m": json.dumps(metrics)})
        for name, val, origin in [("overlap_threshold_high", sel["t_high"], sel["high_origin"]),
                                  ("overlap_threshold_medium", sel["t_med"], sel["med_origin"])]:
            c.execute(text("""INSERT INTO parameter_registry (parameter,value,origin,derived_from,metrics,model_version)
                              VALUES (:p,:v,:o,:d,CAST(:m AS jsonb),:mv)"""),
                      {"p": name, "v": f"{val:.4f}", "o": origin, "mv": version, "m": json.dumps(metrics),
                       "d": f"out-of-fold; target precision {TARGET_PRECISION_HIGH} / recall {TARGET_RECALL_MEDIUM}"})
    print(json.dumps(metrics, indent=2))
```

Interpretation rules the agent must print at the end of training:

- If `high.precision` on TEST is below 0.90, say so (the target was met out-of-fold but not on held-out institutions).
- If `positives_with_cos>=0.99` is above 0.5, print: *"Positive pairs are mostly near-identical text; this synthetic set is probably too easy. Do not quote these numbers as accuracy."*
- If the baseline matches the model within 0.02 on both precision and recall, print that the extra features add little on this data.

### 6.4 `services/routing.py` stub (**Sketch**)

```python
"""STAGE 6 STUB. Stage 9 replaces this file with the real capability router; keep these two names and signatures."""
import math

def template_explanation(breakdown: dict, a: dict, b: dict) -> str:
    if not breakdown:
        return "Same institution; similarity estimated from text only (model not trained)."
    parts = []
    cos = breakdown.get("cos", {}).get("value")
    if cos is not None:
        parts.append(f"complaint text {cos:.0%} similar")
    if breakdown.get("same_category", {}).get("value") == 1.0:
        parts.append("same category")
    ld = breakdown.get("log_days", {}).get("value")
    if ld is not None:
        parts.append(f"received about {round(math.expm1(ld))} days apart")
    if breakdown.get("cross_bureau", {}).get("value") == 1.0:
        parts.append("handled by different Bureaus/Cells")
    ic = breakdown.get("inst_conf", {}).get("value")
    if ic is not None and ic < 0.9:
        parts.append(f"institution match confidence only {ic:.0%}")
    return "Same institution; " + ", ".join(parts) + "."

def explain_overlap(db, breakdown, a, b, sensitive=False):
    return template_explanation(breakdown, a, b), "template"
```

### 6.5 `services/overlap.py` (**Sketch**)

```python
import json, logging
from pathlib import Path
import joblib
from sqlalchemy import text
from .features import FEATURES, pair_features
from .routing import explain_overlap

log = logging.getLogger(__name__)
ART = Path("ml/artifacts")
UNTRAINED_T_HIGH, UNTRAINED_T_MED = 0.85, 0.60
_cache: dict = {}

def load_model():
    ptr = ART / "ACTIVE"
    if not ptr.exists():
        return None
    ver = ptr.read_text().strip()
    if _cache.get("ver") != ver:
        m = joblib.load(ART / f"{ver}.joblib")          # trusted local file; never load artifacts from elsewhere
        if m["features"] != FEATURES:
            raise RuntimeError(f"model {ver} was trained on {m['features']}, code expects {FEATURES}; retrain")
        _cache.update(ver=ver, m=m)
    return _cache["m"]

def score_pair(m, a, b, cos):
    x = [pair_features(a, b, cos)]
    if not m:
        return float(cos), {}                          # untrained fallback: cosine only, labelled 'untrained'
    p = float(m["calibrated"].predict_proba(x)[0, 1])
    scaler, lr = m["explain"].steps[0][1], m["explain"].steps[1][1]
    contrib = (scaler.transform(x)[0] * lr.coef_[0]).tolist()
    return p, {f: {"value": round(v, 3), "contribution": round(c, 3)} for f, v, c in zip(m["features"], x[0], contrib)}

def classify(p, a, b, t_high, t_med):
    both_active = a["closed_date"] is None and b["closed_date"] is None
    if p >= t_high and both_active and a["bureau_id"] != b["bureau_id"]:
        return "high"
    if p >= t_med and both_active:
        return "medium"
    if p >= t_med:
        return "info"
    return None

def scan_overlaps(db, case_id: int, max_candidates: int = 200):
    m = load_model()
    t_high = m["t_high"] if m else UNTRAINED_T_HIGH
    t_med = m["t_med"] if m else UNTRAINED_T_MED
    me = db.execute(text("""SELECT id,institution_id,category,bureau_id,closed_date,received_date,inst_match_conf,
                                   sensitivity_flag FROM cases WHERE id=:i"""), {"i": case_id}).mappings().one()
    others = db.execute(text("""
        SELECT c.id,c.case_ref,c.category,c.bureau_id,c.closed_date,c.received_date,c.inst_match_conf,c.sensitivity_flag,
               1 - (c.embedding <=> m.embedding) AS cos
        FROM cases c, (SELECT embedding FROM cases WHERE id=:i) m
        WHERE c.institution_id=:inst AND c.id<>:i AND c.embedding IS NOT NULL AND m.embedding IS NOT NULL
        ORDER BY c.received_date DESC LIMIT :lim"""),
        {"i": case_id, "inst": me["institution_id"], "lim": max_candidates}).mappings().all()
    found = []
    for o in map(dict, others):
        a_id, b_id = sorted((case_id, o["id"]))
        if db.execute(text("SELECT 1 FROM overlap_links WHERE case_a=:a AND case_b=:b"), {"a": a_id, "b": b_id}).first():
            continue                                   # idempotent: never recompute or duplicate an existing pair
        p, breakdown = score_pair(m, dict(me), o, float(o["cos"]))
        level = classify(p, dict(me), o, t_high, t_med)
        if not level:
            continue
        sensitive = bool(me["sensitivity_flag"]) or bool(o["sensitivity_flag"])
        expl, src = explain_overlap(db, breakdown, dict(me), o, sensitive=sensitive)
        row = db.execute(text("""INSERT INTO overlap_links (case_a,case_b,level,probability,breakdown,model_version,
                                                            explanation,explanation_src)
            VALUES (:a,:b,:l,:p,CAST(:bd AS jsonb),:mv,:ex,:src) ON CONFLICT (case_a,case_b) DO NOTHING RETURNING id"""),
            {"a": a_id, "b": b_id, "l": level, "p": p, "bd": json.dumps(breakdown),
             "mv": m["version"] if m else "untrained", "ex": expl, "src": src}).first()
        if row and level in ("high", "medium"):
            msg = ("Potential Overlapping Cases – Coordination Required" if level == "high"
                   else "Related cases found for the same institution")
            for bureau in {me["bureau_id"], o["bureau_id"]}:
                db.execute(text("INSERT INTO alerts (kind,case_id,overlap_id,bureau_id,message) "
                                "VALUES (:k,:c,:o,:b,:m)"),
                           {"k": f"overlap_{level}", "c": case_id, "o": row.id, "b": bureau, "m": msg})
        if row:
            found.append({"overlap_id": row.id, "other_case_id": o["id"], "other_case_ref": o["case_ref"],
                          "level": level, "probability": round(p, 3)})
    return found
```

### 6.6 `scripts/scan_all.py` (**Sketch**)

```python
"""Run from backend/:  python -m scripts.scan_all [--rebuild]
--rebuild deletes ONLY overlap links with status='suggested' (their alerts cascade), then rescans.
Confirmed and dismissed links are officer decisions and are never deleted."""
import sys
from collections import Counter
from sqlalchemy import text
from app.db import SessionLocal
from app.services.overlap import scan_overlaps

def main(rebuild: bool):
    with SessionLocal() as db:
        if rebuild:
            n = db.execute(text("DELETE FROM overlap_links WHERE status='suggested'")).rowcount
            print("deleted suggested links:", n)
        ids = db.execute(text("SELECT id FROM cases ORDER BY id")).scalars().all()
        levels = Counter()
        for cid in ids:
            for f in scan_overlaps(db, cid):
                levels[f["level"]] += 1
        db.commit()
        print("cases scanned:", len(ids), "new links by level:", dict(levels))

if __name__ == "__main__":
    main("--rebuild" in sys.argv)
```

### 6.7 `create_case` wiring (**Sketch**)

```python
import logging
log = logging.getLogger(__name__)
# ... after the case and first action are inserted:
overlaps, scan_error = [], None
try:
    with db.begin_nested():                      # SAVEPOINT: a failing scan must not lose the case
        overlaps = scan_overlaps(db, cid)
except Exception:
    log.exception("overlap scan failed for case %s", cid)
    scan_error = "overlap scan failed; the case was saved"
db.commit()
return {"id": cid,
        "institution_match": {"confidence": conf, "needs_review": needs_review, "reason": reason},
        "institution_review_needed": needs_review,          # keep for backward compatibility
        "overlaps": overlaps, "overlap_scan_error": scan_error}
```

### 6.8 Frontend deltas

| # | Where | Change |
|---|---|---|
| F-D1 | Register-case dialog | While typing the institution name (400 ms debounce, at least 4 characters) call `GET /api/institutions/resolve` and show up to 5 candidates with score. If `needs_review` or no institution, require the officer to pick one; send `institution_id` |
| F-D2 | Register-case dialog | After submit show a result panel: institution match confidence (amber banner "Low-confidence institution match; please verify" when `institution_match.needs_review`), then a list of overlaps with level badge (High red, Medium amber, Info grey), probability %, other case reference as a link to `/cases/:id`, and the explanation text. If `overlap_scan_error` is set, show it as a warning |
| F-D3 | Case detail page | Under the pre-action banner show "Possible overlaps (n)" chips from the existing `overlaps` array (level, probability, other case ref). **Read-only**: Stage 7 adds actions |
| F-D4 | Dashboard | Banner already reads `overlaps.high_open`; no code change, but verify it now shows a count after the backfill |

---

## 7. Tests

### 7.1 Automated (pytest)

| File | Test | Asserts |
|---|---|---|
| `test_resolution.py` | normalise abbreviations | `normalize("Govt. Engg. College, Pune") == "government engineering college pune"` |
| | score cap | `score_candidate(...) <= 1.0` for identical inputs |
| | exact shortcut | for `exact`, `upper`, `abbr` variants of every institution (including sibling names such as "College of Engineering" vs "Engineering College"), `resolve_ranked` returns the right id with `needs_review == False` |
| | defaults never auto-accept unknowns | on `unknown_name` and `other_city` negatives, `evaluate(...)["neg_auto"] == 0` |
| | tuned thresholds meet policy | `choose(cases)` returns `auto_precision >= 0.98`, `neg_auto == 0`, `review_recall_at5 >= 0.95`, and `auto_rate > 0.3` (must not collapse to "review everything") |
| `test_overlap.py` | classify matrix | the four outcomes (high, medium, info, none) including same-bureau high-probability pair → medium, closed-case pair → info |
| | feature-order guard | loading an artifact whose `features` differ from `FEATURES` raises |
| `test_train_select.py` | `select_thresholds` | on a synthetic score vector: picks the lowest threshold with precision ≥ 0.9 and ≥ 10 flagged; labels fallbacks `default_pending_data`; `t_med <= t_high` |
| | grouped calibration | `make_calibrated` runs on a synthetic dataset with groups; raises or aborts cleanly with fewer than 5 positives |

A draft of the resolver tests already exists from the scratch run (`make_insts`, a Python trigram stand-in `py_rank`, and the five tests above). It uses a Python stand-in for `pg_trgm`, so it is a **fast unit test, not a replacement** for the database checks in Section 7.2.

### 7.2 Backend checks (run against the real database)

| # | Check | Expected |
|---|---|---|
| B1 | `docker compose exec db psql ... -c "SELECT similarity('Govt Engg College','Government Engineering College');"` | a number between 0 and 1 |
| B2 | Start the API with no model files in `./models` and internet available | model downloads once into `backend/models/`; log line "embedding model ready" |
| B3 | Restart with the network disabled (or `HF_HUB_OFFLINE=1`) | model loads from `backend/models/`; no download |
| B4 | `GET /api/institutions/resolve?name=Govt. Engg. College Pune` (use a real seeded institution) | `candidates` sorted by score; `reason` present |
| B5 | `GET /api/institutions/resolve` with an exact seeded name in UPPER CASE | `reason == "exact_name"`, confidence 1.0, correct sibling chosen |
| B6 | Resolve a name that is not in the master list | `institution_id == null`, `needs_review == true`, never `auto` |
| B7 | `POST /api/cases` with an unresolvable name and no `institution_id` | 422 whose body contains `candidates` |
| B8 | Same request with `institution_id` set | 201; stored `inst_match_conf == 1.0` |
| B9 | `python -m ml.tune_resolver --dry-run` | prints thresholds, metrics, `targets_met`, and a per-kind table; writes nothing |
| B10 | `python -m ml.tune_resolver` | three new `parameter_registry` rows; origin `learned_synthetic` if `targets_met`, otherwise `default_pending_data` |
| B11 | `python -m ml.train_overlap` | prints metrics including baseline, reliability table and the "too easy" diagnostic; `ml/artifacts/ACTIVE` exists; old active model retired; two registry rows |
| B12 | Train with fewer than 25 positive training pairs (temporarily seed a tiny set) | exits with the clear message, no stack trace |
| B13 | `python -m scripts.scan_all` | prints counts; `SELECT level, count(*) FROM overlap_links GROUP BY 1` shows high/medium/info rows; run it again: **0 new links, no duplicate alerts** |
| B14 | `python -m scripts.scan_all --rebuild` | suggested links rebuilt; confirmed/dismissed rows (insert one by hand to test) untouched |
| B15 | **Demo case:** pick an institution with an open PGRC case; `POST /api/cases` as an RB officer with a differently worded complaint of the same issue | response `overlaps` contains a **high** item with a breakdown; two alerts (RB and PGRC) exist |
| B16 | **Hard negative:** register a different-issue complaint at the same institution | no **high** overlap (decision D19 explains why no row may exist at all) |
| B17 | Retrain while the API is running | next scan uses the new model **without restart** (`model_version` on new rows changes) |
| B18 | Flag the other case as sensitive and scan | `explanation_src == "template"` (Stage 9 will also assert an empty egress ledger) |
| B19 | Force the scan to fail (rename `ACTIVE` target file) and create a case | case is saved, response has `overlap_scan_error`, no half-written overlap rows |
| B20 | Regional user: `GET /api/cases?institution=<name>&bureau=RB` | only rows from the user's region (regression test for D18) |
| B21 | `pytest -q` | all earlier stages' tests still pass |

### 7.3 Frontend checks

| # | Check | Expected |
|---|---|---|
| F1 | Type an institution name in the register dialog | candidate list appears after the debounce; no request per keystroke |
| F2 | Choose a candidate | selection shown; submit sends `institution_id` |
| F3 | Type an unknown name and submit without choosing | blocked with a clear message; candidates listed |
| F4 | Register the demo case from B15 | result panel shows a **High** badge, probability, other case link and explanation text |
| F5 | Low-confidence match | amber banner appears |
| F6 | Open a case that has overlaps | chips show; clicking the other case ref navigates |
| F7 | Dashboard after backfill | overlap banner shows the High count |
| F8 | Scan failure (B19) | warning shown; case still created |
| F9 | `npx tsc --noEmit` and `npm run build` | no errors |

---

## 8. Definition of done

1. All Section 7.1 tests pass; B1 to B21 and F1 to F9 reported with actual output.
2. Training and tuning scripts run end to end on the seeded data and print their diagnostics.
3. The demo case (B15) produces a High overlap with a feature breakdown and the hard negative (B16) does not.
4. Re-running the backfill creates nothing new.
5. A summary table of every deviation from this spec, with the reason.

---

## 9. Known limits (state them, do not hide them)

- Seed text comes from a small set of paraphrase templates, so true overlaps are usually near-identical text and **metrics will look very good**. They are not evidence of accuracy on real complaints. Quote them only with the baseline and the word "synthetic".
- Probabilities are calibrated to the synthetic base rate of related pairs, not to a production base rate.
- With about 60 institutions the held-out test set has few positive pairs, so precision and recall are **noisy**. Seed more institutions (for example 120) if the numbers jump between runs.
- Resolver tuning uses generated variants of the seeded names, which are more regular than real data.
- `similarity()` and `%` in real `pg_trgm` produce slightly different numbers from the Python stand-in used for the draft tests.
- Issue-type confusion (for example "fees too high" vs "refund denied") is only tested if the seed contains such look-alike pairs; check that it does.

---

## 10. Decisions needed from the project owner

| # | Decision | Default used if unanswered |
|---|---|---|
| 1 | Medium-level meaning (D19, Section 4.4) | Guide behaviour; handbook and PPT wording to be corrected |
| 2 | Increase seed size (for example 120 institutions) so evaluation is less noisy | Keep 60; accept noisy metrics |
| 3 | Exact normalised-name match counts as confidence 1.0 | Yes |
| 4 | Officer-picked institution counts as confidence 1.0 | Yes |
| 5 | Region scoping on resolve and create | Follow Stage 5's rule |

---

## 11. File manifest

```
backend/
  app/config.py                       (edit)
  app/main.py                         (edit: lifespan warm-up)
  app/routers/cases.py                (edit)
  app/routers/institutions.py         (edit: /resolve)
  app/services/embeddings.py          (replace)
  app/services/resolution.py          (replace)
  app/services/features.py            (guide code)
  app/services/overlap.py             (replace)
  app/services/routing.py             (NEW stub; Stage 9 replaces)
  ml/name_variants.py                 (new)
  ml/tune_core.py                     (new)
  ml/tune_resolver.py                 (new)
  ml/train_overlap.py                 (replace)
  scripts/seed.py                     (edit: import normalize)
  scripts/scan_all.py                 (new)
  tests/test_resolution.py            (new)
  tests/test_overlap.py               (new)
  tests/test_train_select.py          (new)
.gitignore                            (add backend/models/)
frontend/                             (register dialog panel, case detail chips)
```



CASENEXUS — RESUME FROM THE VERIFIED STAGE 5 CHECKPOINT

Continue the existing SIH 2026 PS 26264 project. Do not recreate the repository or repeat completed stages.

The latest project handoff reports Stage 5 complete:
- React + Vite + TypeScript frontend
- FastAPI backend
- PostgreSQL 16 with pgvector
- Cases list, case detail, Institution 360
- Authentication and regional authorization
- Case actions, document upload/download, filters, sorting, pagination
- 55 reported passing backend tests
- Frontend build and lint reported passing
- Git tag: stage-5

These are reported results. Verify the current repository before relying on them.

YOUR TASK:

1. Inspect Git status, recent commits, existing documentation, database schema, overlap-related models/services, API routers, frontend types, case detail page, and existing tests.
2. Run the current relevant test suite and record the actual baseline.
3. Preserve all existing work and uncommitted changes.
4. Implement Stage 6: explainable cross-bureau complaint-overlap detection.
5. Build a deterministic scoring service with transparent component scores and reason codes.
6. Distinguish same-institution/different-issue cases from genuinely related complaints.
7. Reuse existing pgvector, pg_trgm, embedding, overlap, and model-version infrastructure where available. Inspect before adding anything.
8. Persist candidate relationships idempotently, prevent self-links and duplicates, and preserve review status.
9. Add authorized APIs to retrieve candidates and confirm or dismiss proposed relationships.
10. Enforce authentication, regional scope, privacy, and server-side reviewer identity.
11. Integrate the overlap panel into the existing case detail page with score explanations, review status, and authorized review controls.
12. Add deterministic synthetic fixtures, unit tests, API authorization tests, regression tests, and synthetic evaluation metrics.
13. Run the backend tests, frontend build, and lint. Report only results actually observed.
14. Update the documentation and produce a concise Stage 6 completion report.

CONSTRAINTS:
- Do not rebuild or replace the existing application.
- Do not reset Git, discard changes, or modify unrelated features.
- Do not use real complaint data.
- Do not call external AI APIs or require internet access at runtime.
- Do not automatically merge, close, or transfer cases based on model scores.
- Do not leak embeddings, internal storage keys, checksums, or protected case details.
- Do not provision AWS resources or spend credits.
- Do not stop after writing a plan. Inspect, plan briefly, and begin implementation.

FIRST MILESTONE:
Deliver the overlap scoring service and deterministic unit tests. Then continue through persistence, scoped APIs, frontend review workflow, evaluation, and regression testing.

If the workspace differs from the handoff, adapt to the actual code rather than assuming files or schemas exist. If a genuine blocker occurs, document it precisely and continue with independent tasks.

Start now.

</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-10-24T15:20:22+05:30.

The user's current state is as follows:
Active Document: c:\Users\abhig\OneDrive\Desktop\CaseNexsus\docs\CaseNexus_Modules_Pipelines_Theory.md (LANGUAGE_MARKDOWN)
Cursor is on line: 19
Other open documents:
- c:\Users\abhig\OneDrive\Desktop\CaseNexsus\docs\requirements-traceability.md (LANGUAGE_MARKDOWN)
- c:\Users\abhig\OneDrive\Desktop\CaseNexsus\docs\CaseNexus_Modules_Pipelines_Theory.md (LANGUAGE_MARKDOWN)
- c:\Users\abhig\OneDrive\Desktop\CaseNexsus\backend\app\auth.py (LANGUAGE_PYTHON)
- c:\Users\abhig\OneDrive\Desktop\CaseNexsus\backend\app\config.py (LANGUAGE_PYTHON)
</ADDITIONAL_METADATA>