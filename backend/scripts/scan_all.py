"""
Run from backend/:  python -m scripts.scan_all [--rebuild]

Batch scanner to backfill overlap links across all existing cases (D15).
--rebuild deletes ONLY overlap links with status='suggested' (alerts cascade).
Confirmed and dismissed links are officer decisions and are NEVER deleted.
"""
import sys
from collections import Counter

from sqlalchemy import text

from app.db import SessionLocal
from app.services.overlap import scan_overlaps


def main(rebuild: bool):
    with SessionLocal() as db:
        if rebuild:
            # Delete alerts pointing to suggested overlaps first if cascade isn't set, then suggested links
            n_alerts = db.execute(
                text("""
                    DELETE FROM alerts
                    WHERE overlap_id IN (SELECT id FROM overlap_links WHERE status='suggested')
                """)
            ).rowcount
            n = db.execute(text("DELETE FROM overlap_links WHERE status='suggested'")).rowcount
            print(f"Rebuild: deleted {n} suggested links and {n_alerts} corresponding alerts.")

        ids = db.execute(text("SELECT id FROM cases ORDER BY id")).scalars().all()
        levels = Counter()
        for cid in ids:
            for f in scan_overlaps(db, cid):
                levels[f["level"]] += 1

        db.commit()
        print(f"Cases scanned: {len(ids)}. New links created by level: {dict(levels)}")


if __name__ == "__main__":
    main("--rebuild" in sys.argv)
