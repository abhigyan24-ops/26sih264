"""
Verification script for B80: imports sample CSVs for RB, PGRC, and Regional files.
Prints row counts, held items, error reports, and newly flagged cross-bureau overlaps.
"""
from pathlib import Path
from sqlalchemy import text
from app.db import SessionLocal
from app.services.ingestion.processor import process_import

def run_checks():
    db = SessionLocal()
    samples_dir = Path(__file__).resolve().parents[2] / "data/samples"
    sources = [
        ("rb", "sample_rb.csv"),
        ("pgrc", "sample_pgrc.csv"),
        ("regional", "sample_regional.csv"),
    ]

    print("==================================================================")
    print("B80 INGESTION VERIFICATION: SAMPLE FILE BATCH RUNS")
    print("==================================================================")

    for src, filename in sources:
        filepath = samples_dir / filename
        if not filepath.exists():
            print(f"Error: {filepath} does not exist!")
            continue

        content = filepath.read_bytes()
        print(f"\n>>> Importing Source: {src.upper()} from {filename}")
        res = process_import(
            db=db,
            source=src,
            filename=filename,
            content=content,
            dry_run=False,
        )

        print(f"    Total Rows in File  : {res['total_rows']}")
        print(f"    Successfully Imported: {res['imported_rows']}")
        print(f"    Held for Review     : {res['held_rows']}")
        print(f"    Validation Errors   : {res['error_rows']}")
        print(f"    Duplicate (Skipped) : {res['duplicate_rows']}")
        print(f"    New Overlaps Flagged: {res['new_overlaps']}")

        if res["preview"]:
            print("    Sample Created Cases:")
            for c in res["preview"][:3]:
                print(f"      - {c.get('case_ref')} | SourceRef: {c.get('source_case_id')} | Overlaps: {c.get('overlaps_detected')}")

    print("\n------------------------------------------------------------------")
    print("CROSS-BUREAU OVERLAPS DETECTED FOR NSIT LUCKNOW:")
    overlaps = db.execute(text("""
        SELECT l.id, l.level, l.probability,
               ca.case_ref AS a_ref, ba.code AS a_bureau, ca.description AS a_desc,
               cb.case_ref AS b_ref, bb.code AS b_bureau, cb.description AS b_desc
        FROM overlap_links l
        JOIN cases ca ON ca.id = l.case_a
        JOIN cases cb ON cb.id = l.case_b
        JOIN bureaus ba ON ba.id = ca.bureau_id
        JOIN bureaus bb ON bb.id = cb.bureau_id
        WHERE (ca.source_case_id LIKE '%SAMPLE%' OR cb.source_case_id LIKE '%SAMPLE%')
    """)).mappings().all()

    for o in overlaps:
        print(f"  Overlap #{o['id']} [{o['level'].upper()} - {round(o['probability']*100)}%]")
        print(f"    Case A: {o['a_ref']} ({o['a_bureau']}) -> {o['a_desc'][:70]}...")
        print(f"    Case B: {o['b_ref']} ({o['b_bureau']}) -> {o['b_desc'][:70]}...")
    print("==================================================================")

if __name__ == "__main__":
    run_checks()
