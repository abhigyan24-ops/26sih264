"""
documents router — Stage 5 (BD9)

POST /api/actions/{action_id}/documents   — multipart upload (field: file)
GET  /api/documents/{doc_id}              — authenticated, scope-checked download
"""
import os
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response
from sqlalchemy import text

from ..db import get_db
from ..auth import current_user, scope_clause
from ..config import settings
from ..services.storage import (
    get_storage, validate_upload, MAX_UPLOAD_BYTES, CONTENT_TYPES
)

router = APIRouter(tags=["documents"])

_storage_instance = None


def _get_storage():
    global _storage_instance
    if _storage_instance is None:
        _storage_instance = get_storage(settings.storage_backend, settings.local_storage_dir)
    return _storage_instance


@router.post("/api/actions/{action_id}/documents", status_code=201)
async def upload_document(
    action_id: int,
    file: UploadFile = File(...),
    db=Depends(get_db),
    user=Depends(current_user),
):
    """
    Attach a document to an action.
    The action must belong to a case the user can see (scope check).
    """
    sc, sp = scope_clause(user)

    # Verify the action exists and is in scope
    action_row = db.execute(
        text(
            f"""
            SELECT a.id, a.case_id
            FROM actions a
            JOIN cases c ON c.id = a.case_id
            JOIN institutions i ON i.id = c.institution_id
            WHERE a.id = :aid {sc}
            """
        ),
        {"aid": action_id, **sp},
    ).mappings().first()

    if not action_row:
        raise HTTPException(404, "Action not found or out of scope")

    # Read entire file, enforcing 10 MB limit
    # Read MAX+1 bytes to detect oversized files without loading everything
    chunk_size = 64 * 1024  # 64 KB chunks
    data = b""
    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        data += chunk
        if len(data) > MAX_UPLOAD_BYTES:
            raise HTTPException(413, "File exceeds the 10 MB limit")

    filename = file.filename or "upload"
    safe_name, _content_type = validate_upload(filename, data)

    ext = Path(filename).suffix.lower()
    store = _get_storage()
    key, checksum, size = store.save(data, ext)

    doc_id = db.execute(
        text(
            """
            INSERT INTO documents
              (action_id, file_name, storage_key, storage_kind, checksum, uploaded_by)
            VALUES (:a, :fn, :key, :kind, :chk, :upd)
            RETURNING id
            """
        ),
        {
            "a": action_id,
            "fn": safe_name,
            "key": key,
            "kind": settings.storage_backend,
            "chk": checksum,
            "upd": user["id"],
        },
    ).scalar()
    db.commit()

    return {"id": doc_id, "file_name": safe_name}


@router.get("/api/documents/{doc_id}")
def download_document(
    doc_id: int,
    db=Depends(get_db),
    user=Depends(current_user),
):
    """
    Authenticated, scope-checked file download.
    Returns the file with Content-Disposition: attachment.
    storage_key and checksum are NEVER exposed in the response.
    """
    sc, sp = scope_clause(user)

    doc = db.execute(
        text(
            f"""
            SELECT d.id, d.file_name, d.storage_key
            FROM documents d
            JOIN actions a ON a.id = d.action_id
            JOIN cases c ON c.id = a.case_id
            JOIN institutions i ON i.id = c.institution_id
            WHERE d.id = :did {sc}
            """
        ),
        {"did": doc_id, **sp},
    ).mappings().first()

    if not doc:
        raise HTTPException(404, "Document not found or out of scope")

    key = doc["storage_key"]
    ext = Path(key).suffix.lower()
    content_type = CONTENT_TYPES.get(ext, "application/octet-stream")

    store = _get_storage()
    path = store.path_for(key)
    data = path.read_bytes()

    return Response(
        content=data,
        media_type=content_type,
        headers={
            "Content-Disposition": f'attachment; filename="{doc["file_name"]}"'
        },
    )
