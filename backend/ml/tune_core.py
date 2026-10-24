"""
Core optimization logic for institution resolver tuning.
Evaluates (auto_accept, review_floor, margin) against target policy:
- Auto-accept precision >= 0.98
- Unknown institutions auto-accepted == 0
- Review recall at top 5 >= 0.95
"""
from app.services.resolution import resolve_ranked

AUTO_PRECISION_TARGET = 0.98
REVIEW_RECALL_TARGET = 0.95
TOPK = 5


def _truth_score(c: dict) -> float | None:
    for r in c.get("ranked", [])[:TOPK]:
        if r["id"] == c["truth_id"]:
            return r["score"]
    return None


def evaluate(cases: list[dict], th: dict) -> dict:
    """
    cases: [{'truth_id', 'qn', 'city', 'ranked': [{'id','score','normalized_name','city'}]}]
    """
    auto = auto_ok = neg_auto = pos = hit = 0
    for c in cases:
        inst_id, _, _, reason = resolve_ranked(c["ranked"], c["qn"], c.get("city"), th)
        if reason in ("auto", "exact_name"):
            auto += 1
            auto_ok += int(inst_id == c["truth_id"])
            neg_auto += int(c["truth_id"] is None)
        if c["truth_id"] is not None:
            pos += 1
            s = _truth_score(c)
            hit += int(s is not None and s >= th["resolver_review_floor"])
    return {
        "auto": auto,
        "auto_precision": round(auto_ok / auto, 4) if auto else None,
        "neg_auto": neg_auto,
        "auto_rate": round(auto / len(cases), 4) if cases else 0.0,
        "review_recall_at5": round(hit / pos, 4) if pos else None,
    }


def choose(cases: list[dict]):
    """
    Returns (thresholds, metrics, targets_met).
    Picks the (auto_accept, margin) that maximises auto-accept rate
    subject to precision >= 0.98 and 0 unknown auto-accepts.
    Sets review_floor to the 5th percentile of true match scores in top 5.
    """
    scores = sorted(
        s for c in cases
        if c["truth_id"] is not None and (s := _truth_score(c)) is not None
    )
    floor = round(scores[int(0.05 * len(scores))], 4) if scores else 0.55
    best = best_m = None
    for margin in (0.03, 0.05, 0.08, 0.10, 0.15, 0.20):
        for a_int in range(60, 101):
            a = round(a_int / 100, 2)
            th = {
                "resolver_auto_accept": a,
                "resolver_review_floor": min(floor, a),
                "resolver_margin": margin,
            }
            m = evaluate(cases, th)
            if m["auto"] and m["auto_precision"] is not None and m["auto_precision"] >= AUTO_PRECISION_TARGET and m["neg_auto"] == 0:
                if best_m is None or m["auto_rate"] > best_m["auto_rate"]:
                    best, best_m = th, m

    if best is None:
        th = {
            "resolver_auto_accept": 0.95,
            "resolver_review_floor": min(floor, 0.95),
            "resolver_margin": 0.10,
        }
        return th, evaluate(cases, th), False

    met = (best_m["review_recall_at5"] or 0) >= REVIEW_RECALL_TARGET
    return best, best_m, met
