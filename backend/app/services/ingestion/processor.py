"""
Ingestion processing pipeline.
Parses file, applies column mapping, validates rows, resolves institutions (holds rows needing review),
embeds case text, registers cases (idempotently), and scans for overlaps.
"""
from __future__ import annotations
import json
import logging
from datetime import date, timedelta
from typing import Any, Dict, List, Optional
from sqlalchemy import text

from app.config import settings
from app.services.embeddings import embed_one, vec_literal
from app.services.overlap import scan_overlaps
from app.services.resolution import resolve_detailed
from .mapping import get_mapping, guess_mapping
from .parser import parse_file_contents
from .validator import validate_row

logger = logging.getLogger("ingestion")


def process_import(
    db,
    source: str,
    filename: str,
    content: bytes,
    mapping_override: Optional[Dict[str, str]] = None,
    dry_run: bool = False,
    user: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    source_clean = (source or "rb").strip().lower()
    headers, raw_rows = parse_file_contents(filename, content)

    if not headers or not raw_rows:
        return {
            "source": source_clean,
            "filename": filename,
            "total_rows": 0,
            "imported_rows": 0,
            "held_rows": 0,
            "error_rows": 0,
            "duplicate_rows": 0,
            "new_overlaps": 0,
            "is_dry_run": dry_run,
            "errors": [{"row": 0, "errors": ["File is empty or contains no valid rows"]}],
            "held": [],
            "preview": [],
        }

    # Resolve mapping: use override if supplied; else db/default; fallback to guessing
    effective_mapping = mapping_override or get_mapping(db, source_clean)
    if not effective_mapping:
        effective_mapping = guess_mapping(headers, source_clean)

    # Reference data for validation
    categories_res = db.execute(text("SELECT code FROM categories")).scalars().all()
    valid_categories = set(categories_res)

    bureaus_res = db.execute(text("SELECT code, id FROM bureaus")).all()
    bureau_id_map = {b.code: b.id for b in bureaus_res}
    valid_bureaus = set(bureau_id_map.keys())

    sla_res = db.execute(text("SELECT category, deadline_days FROM sla_rules")).all()
    sla_map = {r.category: r.deadline_days for r in sla_res}

    # Existing source_case_ids for idempotency
    existing_scids = set(
        db.execute(
            text("SELECT source_case_id FROM cases WHERE source = :s AND source_case_id IS NOT NULL"),
            {"s": source_clean},
        ).scalars().all()
    )

    imported_cases: List[Dict[str, Any]] = []
    error_list: List[Dict[str, Any]] = []
    held_list: List[Dict[str, Any]] = []
    duplicate_count = 0
    total_new_overlaps = 0
    seen_in_batch: set[str] = set()

    officer_id = (user or {}).get("id") or 1

    for row_idx, raw in enumerate(raw_rows, start=1):
        # 1. Transform raw row through mapping
        mapped_data: Dict[str, str] = {}
        for src_col, target_field in effective_mapping.items():
            if src_col in raw and raw[src_col]:
                mapped_data[target_field] = raw[src_col]

        scid = mapped_data.get("source_case_id", "").strip()

        # 2. Check duplicate / idempotency
        if scid and (scid in existing_scids or scid in seen_in_batch):
            duplicate_count += 1
            continue
        if scid:
            seen_in_batch.add(scid)

        # 3. Validate mapped row
        is_valid, cleaned, val_errors = validate_row(
            row_idx, mapped_data, valid_categories, valid_bureaus, source=source_clean
        )
        if not is_valid:
            error_list.append({
                "row": row_idx,
                "errors": val_errors,
                "data": raw,
            })
            continue

        # 4. Resolve institution (held if needs review or unresolvable)
        res = resolve_detailed(
            db,
            cleaned["aicte_id"],
            cleaned["institution_name"],
            cleaned["city"],
        )
        inst_id = res["institution_id"]
        inst_conf = res["confidence"]
        needs_review = res["needs_review"]
        reason = res["reason"]

        if needs_review or inst_id is None:
            held_list.append({
                "row": row_idx,
                "source_case_id": cleaned["source_case_id"],
                "reason": reason,
                "institution_query": cleaned["institution_name"],
                "city_query": cleaned["city"],
                "candidates": res.get("candidates", []),
                "data": raw,
            })
            continue

        # 5. Row is valid and institution resolved
        bureau_code = cleaned["bureau_code"]
        b_id = bureau_id_map.get(bureau_code) or list(bureau_id_map.values())[0]
        sla_days = sla_map.get(cleaned["category"], 30)
        due_date = cleaned["received_date"] + timedelta(days=sla_days)

        if dry_run:
            imported_cases.append({
                "row": row_idx,
                "source_case_id": cleaned["source_case_id"],
                "institution_id": inst_id,
                "institution_name": cleaned["institution_name"],
                "category": cleaned["category"],
                "bureau_code": bureau_code,
                "description": cleaned["description"][:120] + ("..." if len(cleaned["description"]) > 120 else ""),
                "received_date": cleaned["received_date"].isoformat(),
                "sla_due_date": due_date.isoformat(),
                "inst_match_conf": inst_conf,
            })
        else:
            # Generate embedding
            vec = embed_one(cleaned["description"])

            # Insert into cases table
            case_id = db.execute(
                text("""
                    INSERT INTO cases
                        (source, source_case_id, institution_id, inst_match_conf,
                         category, description, received_date, status,
                         bureau_id, officer_id, sla_due_date, priority,
                         sensitivity_flag, embedding, embedding_model)
                    VALUES
                        (:src, :scid, :inst, :conf,
                         :cat, :desc, :rdate, 'registered',
                         :bid, :oid, :due, :pri,
                         :sens, CAST(:vec AS vector), :model)
                    RETURNING id
                """),
                {
                    "src": source_clean,
                    "scid": cleaned["source_case_id"],
                    "inst": inst_id,
                    "conf": inst_conf,
                    "cat": cleaned["category"],
                    "desc": cleaned["description"],
                    "rdate": cleaned["received_date"],
                    "bid": b_id,
                    "oid": officer_id,
                    "due": due_date,
                    "pri": cleaned["priority"],
                    "sens": cleaned["sensitive"],
                    "vec": vec_literal(vec),
                    "model": settings.embed_model,
                },
            ).scalar()

            # Set case_ref
            db.execute(
                text("UPDATE cases SET case_ref = 'CASE-' || LPAD(id::text, 6, '0') WHERE id = :i"),
                {"i": case_id},
            )

            # Insert registered action
            db.execute(
                text("""
                    INSERT INTO actions (case_id, bureau_id, officer_id, action_type, remarks)
                    VALUES (:c, :b, :o, 'registered', :rem)
                """),
                {
                    "c": case_id,
                    "b": b_id,
                    "o": officer_id,
                    "rem": f"Imported from {source_clean.upper()} (Ref: {cleaned['source_case_id']})",
                },
            )

            # Scan for overlaps inside savepoint
            overlaps_found = []
            try:
                with db.begin_nested():
                    overlaps_found = scan_overlaps(db, case_id)
            except Exception:
                logger.exception("Overlap scan failed during import of case %s", case_id)

            total_new_overlaps += len(overlaps_found)
            existing_scids.add(cleaned["source_case_id"])

            imported_cases.append({
                "id": case_id,
                "case_ref": f"CASE-{str(case_id).zfill(6)}",
                "source_case_id": cleaned["source_case_id"],
                "institution_id": inst_id,
                "category": cleaned["category"],
                "bureau_code": bureau_code,
                "overlaps_detected": len(overlaps_found),
            })

    # Record in import_logs and import_held_rows if not dry_run
    import_log_id = None
    if not dry_run:
        import_log_id = db.execute(
            text("""
                INSERT INTO import_logs
                    (source, filename, total_rows, imported_rows, held_rows,
                     error_rows, duplicate_rows, new_overlaps, is_dry_run, errors)
                VALUES
                    (:s, :f, :tot, :imp, :held, :err, :dup, :ovl, :dry, CAST(:err_json AS jsonb))
                RETURNING id
            """),
            {
                "s": source_clean,
                "f": filename,
                "tot": len(raw_rows),
                "imp": len(imported_cases),
                "held": len(held_list),
                "err": len(error_list),
                "dup": duplicate_count,
                "ovl": total_new_overlaps,
                "dry": False,
                "err_json": json.dumps(error_list[:100]),
            },
        ).scalar()

        for h in held_list:
            db.execute(
                text("""
                    INSERT INTO import_held_rows
                        (import_log_id, source, source_case_id, raw_data, reason,
                         institution_query, city_query, candidates, status)
                    VALUES
                        (:lid, :src, :scid, CAST(:raw AS jsonb), :reason,
                         :iq, :cq, CAST(:cands AS jsonb), 'held')
                """),
                {
                    "lid": import_log_id,
                    "src": source_clean,
                    "scid": h.get("source_case_id"),
                    "raw": json.dumps(h["data"]),
                    "reason": h["reason"],
                    "iq": h.get("institution_query"),
                    "cq": h.get("city_query"),
                    "cands": json.dumps(h.get("candidates", [])),
                },
            )

        db.commit()

    return {
        "import_log_id": import_log_id,
        "source": source_clean,
        "filename": filename,
        "total_rows": len(raw_rows),
        "imported_rows": len(imported_cases),
        "held_rows": len(held_list),
        "error_rows": len(error_list),
        "duplicate_rows": duplicate_count,
        "new_overlaps": total_new_overlaps,
        "is_dry_run": dry_run,
        "errors": error_list,
        "held": held_list,
        "preview": imported_cases[:10],
    }
