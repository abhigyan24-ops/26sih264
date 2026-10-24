"""
Run from backend/:  python -m ml.tune_resolver [--dry-run]

Tunes resolver parameters (auto_accept, review_floor, margin) using synthetic
name variants and negative controls against the real pg_trgm candidate rankings.
Writes parameters to parameter_registry.
"""
import json
import sys
from collections import defaultdict

from sqlalchemy import text

from app.db import SessionLocal
from app.services.resolution import rank_candidates, normalize, resolve_ranked
from ml.name_variants import variants_for, negatives
from ml.tune_core import choose, AUTO_PRECISION_TARGET, REVIEW_RECALL_TARGET


def main(dry: bool):
    with SessionLocal() as db:
        insts = [
            dict(r)
            for r in db.execute(text("SELECT id, name, city FROM institutions")).mappings()
        ]
        if not insts:
            print("No institutions in database. Run seed first.")
            return

        work = [v for i in insts for v in variants_for(i)] + negatives(insts)
        print(f"Generated {len(work)} test cases across {len(insts)} institutions...")

        cases = [
            {
                "truth_id": v["truth_id"],
                "kind": v["kind"],
                "qn": normalize(v["name"]),
                "city": v["city"],
                "ranked": rank_candidates(db, v["name"], v["city"]),
            }
            for v in work
        ]

        th, m, met = choose(cases)

        per_kind = defaultdict(lambda: {"n": 0, "auto_ok": 0, "auto_wrong": 0, "review": 0})
        for c in cases:
            iid, _, review, reason = resolve_ranked(c["ranked"], c["qn"], c["city"], th)
            k = per_kind[c["kind"]]
            k["n"] += 1
            if reason in ("auto", "exact_name"):
                if iid == c["truth_id"]:
                    k["auto_ok"] += 1
                else:
                    k["auto_wrong"] += 1
            else:
                k["review"] += 1

        result = {
            "thresholds": th,
            "metrics": m,
            "targets_met": met,
            "per_kind": dict(per_kind),
            "cases": len(cases),
        }
        print(json.dumps(result, indent=2))

        if dry:
            print("[DRY RUN] No database changes written.")
            return

        origin = "learned_synthetic" if met else "default_pending_data"
        for p, v in th.items():
            db.execute(
                text("""
                    INSERT INTO parameter_registry (parameter, value, origin, derived_from, metrics)
                    VALUES (:p, :v, :o, :d, CAST(:m AS jsonb))
                """),
                {
                    "p": p,
                    "v": f"{v:.4f}",
                    "o": origin,
                    "d": (
                        f"synthetic name variants; auto precision >= {AUTO_PRECISION_TARGET}, "
                        f"0 unknown auto-accepted, recall@5 >= {REVIEW_RECALL_TARGET}"
                    ),
                    "m": json.dumps(m),
                },
            )
        db.commit()
        print("Tuned parameters committed to parameter_registry successfully.")


if __name__ == "__main__":
    main("--dry-run" in sys.argv)
