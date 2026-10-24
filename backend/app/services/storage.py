"""
Storage service — Stage 5 (BD9)

LocalStorage: stores files under LOCAL_STORAGE_DIR/documents/<uuid><ext>.
The key is a random UUID — never derived from user input.

Security checks:
- Maximum 10 MB (MAX_UPLOAD_BYTES)
- Allowed extensions: .pdf .png .jpg .jpeg .docx .txt
- Magic-number check for pdf/png/jpg/jpeg/docx (txt skipped)
- Final path resolved and asserted to be inside storage directory
- Filename sanitised (basename, control chars stripped, capped at 200 chars)

S3 backend: raises NotImplementedError immediately; keeps the interface contract.
"""
import hashlib
import os
import re
import uuid
from pathlib import Path
from typing import Protocol

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".docx", ".txt"}

CONTENT_TYPES = {
    ".pdf":  "application/pdf",
    ".png":  "image/png",
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".txt":  "text/plain",
}

# Magic bytes: (offset, bytes_to_check)
MAGIC = {
    ".pdf":  (0, b"%PDF"),
    ".png":  (0, b"\x89PNG\r\n\x1a\n"),
    ".jpg":  (0, b"\xff\xd8"),
    ".jpeg": (0, b"\xff\xd8"),
    ".docx": (0, b"PK"),
    ".txt":  None,   # no magic check for plain text
}


def _sanitise_filename(name: str) -> str:
    """Return a safe display filename: basename only, control chars removed, capped."""
    name = os.path.basename(name)                    # strip any directory components
    name = re.sub(r"[\x00-\x1f\x7f]", "", name)     # remove control characters
    return name[:200] if name else "upload"


class Storage(Protocol):
    def save(self, data: bytes, suffix: str) -> tuple[str, str, int]:
        """Persist bytes; return (key, sha256_hex, size)."""
        ...

    def path_for(self, key: str) -> Path:
        """Return the filesystem path for a stored key."""
        ...


class LocalStorage:
    def __init__(self, base_dir: str):
        self.base = Path(base_dir).resolve() / "documents"
        self.base.mkdir(parents=True, exist_ok=True)

    def path_for(self, key: str) -> Path:
        # key is UUID + ext; resolve and verify stays inside base
        p = (self.base / key).resolve()
        if not str(p).startswith(str(self.base)):
            raise ValueError("Path traversal attempt detected")
        return p

    def save(self, data: bytes, suffix: str) -> tuple[str, str, int]:
        key = f"{uuid.uuid4()}{suffix}"
        dest = self.path_for(key)
        dest.write_bytes(data)
        checksum = hashlib.sha256(data).hexdigest()
        return key, checksum, len(data)


class S3Storage:
    def save(self, data: bytes, suffix: str) -> tuple[str, str, int]:
        raise NotImplementedError(
            "S3 storage is not implemented in this prototype. "
            "Set STORAGE_BACKEND=local in .env."
        )

    def path_for(self, key: str) -> Path:
        raise NotImplementedError("S3 storage is not implemented in this prototype.")


def get_storage(backend: str, local_dir: str) -> LocalStorage | S3Storage:
    if backend == "s3":
        return S3Storage()
    return LocalStorage(local_dir)


def validate_upload(filename: str, data: bytes) -> tuple[str, str]:
    """
    Check extension and magic bytes.
    Returns (sanitised_filename, content_type).
    Raises HTTPException on failure (caller must import from fastapi).
    """
    from fastapi import HTTPException

    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(415, f"File type '{ext}' is not allowed")

    magic = MAGIC.get(ext)
    if magic is not None:
        offset, sig = magic
        if not data[offset: offset + len(sig)] == sig:
            raise HTTPException(415, f"File content does not match extension {ext}")

    return _sanitise_filename(filename), CONTENT_TYPES[ext]
