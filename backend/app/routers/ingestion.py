"""
Data Ingestion API router for external files (RB, PGRC, Regional files).
"""
from __future__ import annotations
import json
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy import text

from ..auth import current_user
from ..db import get_db
from ..services.ingestion.mapping import (
    DEFAULT_MAPPINGS,
    SCHEMA_FIELDS,
    get_mapping,
    guess_mapping,
    save_mapping,
)
from ..services.ingestion.parser import parse_file_contents
from ..services.ingestion.processor import process_import

router = APIRouter(prefix="/ingestion", tags=["ingestion"])


class MappingUpdate(BaseModel):
    mapping: Dict[str, str]


@router.get("/sources")
def list_sources():
    """List supported source systems and target schema fields."""
    return {
        "sources": [
            {"id": "rb", "name": "Ragging / Regional Bureau (RB)", "default_bureau": "RB"},
            {"id": "pgrc", "name": "Public Grievance Redressal Cell (PGRC)", "default_bureau": "PGRC"},
            {"id": "regional", "name": "Regional Office Grievance Files", "default_bureau": "ROC-N"},
        ],
        "schema_fields": SCHEMA_FIELDS,
    }


@router.get("/mappings/{source}")
def get_source_mapping(source: str, db=Depends(get_db), user=Depends(current_user)):
    """Retrieve saved or default column mapping for a source."""
    s = source.lower().strip()
    return {
        "source": s,
        "mapping": get_mapping(db, s),
        "schema_fields": SCHEMA_FIELDS,
    }


@router.post("/mappings/{source}")
def set_source_mapping(
    source: str,
    body: MappingUpdate,
    db=Depends(get_db),
    user=Depends(current_user),
):
    """Save or update column mapping for a source."""
    s = source.lower().strip()
    saved = save_mapping(db, s, body.mapping)
    return {"source": s, "mapping": saved}


@router.post("/detect-headers")
async def detect_headers(
    source: str = Form("rb"),
    file: UploadFile = File(...),
    db=Depends(get_db),
    user=Depends(current_user),
):
    """Inspect file headers and return recommended mapping."""
    content = await file.read()
    headers, rows = parse_file_contents(file.filename or "upload.csv", content)
    if not headers:
        raise HTTPException(422, "No headers detected in file")

    saved_mapping = get_mapping(db, source)
    guessed = guess_mapping(headers, source)
    # Merge: saved mapping takes priority for recognized headers
    merged = {**guessed, **{k: v for k, v in saved_mapping.items() if k in headers}}

    sample_preview = rows[:3] if rows else []
    return {
        "headers": headers,
        "mapping": merged,
        "sample_preview": sample_preview,
        "total_rows_detected": len(rows),
    }


@router.post("/upload")
async def upload_import_file(
    source: str = Form("rb"),
    dry_run: bool = Form(False),
    mapping: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db=Depends(get_db),
    user=Depends(current_user),
):
    """
    Upload and process an import file (CSV or XLSX).
    Supports dry-run validation mode and live execution.
    """
    content = await file.read()
    if not content:
        raise HTTPException(422, "Uploaded file is empty")

    mapping_override: Optional[Dict[str, str]] = None
    if mapping:
        try:
            mapping_override = json.loads(mapping)
        except Exception:
            raise HTTPException(422, "Invalid JSON supplied in mapping field")

    result = process_import(
        db,
        source=source,
        filename=file.filename or "import.csv",
        content=content,
        mapping_override=mapping_override,
        dry_run=dry_run,
        user=user,
    )
    return result


@router.get("/logs")
def list_import_logs(
    source: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    db=Depends(get_db),
    user=Depends(current_user),
):
    """Retrieve history of import logs."""
    where = ["1=1"]
    params: Dict[str, Any] = {"lim": limit, "off": offset}
    if source:
        where.append("source = :s")
        params["s"] = source.lower().strip()

    rows = db.execute(
        text(f"""
            SELECT id, source, filename, total_rows, imported_rows, held_rows,
                   error_rows, duplicate_rows, new_overlaps, is_dry_run, created_at
            FROM import_logs
            WHERE {" AND ".join(where)}
            ORDER BY created_at DESC
            LIMIT :lim OFFSET :off
        """),
        params,
    ).mappings().all()

    total = db.execute(
        text(f"SELECT COUNT(*) FROM import_logs WHERE {' AND '.join(where)}"),
        params,
    ).scalar()

    return {"items": [dict(r) for r in rows], "total": total}


@router.get("/held")
def list_held_rows(
    source: Optional[str] = None,
    status: str = "held",
    limit: int = 50,
    offset: int = 0,
    db=Depends(get_db),
    user=Depends(current_user),
):
    """List held rows needing institution resolution or manual review."""
    where = ["status = :st"]
    params: Dict[str, Any] = {"st": status, "lim": limit, "off": offset}
    if source:
        where.append("source = :s")
        params["s"] = source.lower().strip()

    rows = db.execute(
        text(f"""
            SELECT id, import_log_id, source, source_case_id, raw_data, reason,
                   institution_query, city_query, candidates, status, created_at
            FROM import_held_rows
            WHERE {" AND ".join(where)}
            ORDER BY created_at DESC
            LIMIT :lim OFFSET :off
        """),
        params,
    ).mappings().all()

    total = db.execute(
        text(f"SELECT COUNT(*) FROM import_held_rows WHERE {' AND '.join(where)}"),
        params,
    ).scalar()

    return {"items": [dict(r) for r in rows], "total": total}
