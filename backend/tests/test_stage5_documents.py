"""
Stage 5 backend tests — documents (C11)

Cleans up created cases, actions, documents AND storage files on disk.
"""
import io
import struct
import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.db import SessionLocal
from app.config import settings
from tests.conftest import login_token


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _create_test_case(client: TestClient, h: dict, db) -> tuple[int, str]:
    """Create a minimal test case and return (case_id, case_ref)."""
    inst_id = db.execute(text(
        "SELECT c.institution_id FROM cases c JOIN bureaus b ON b.id=c.bureau_id "
        "WHERE b.code='RB' LIMIT 1"
    )).scalar()
    inst_name = db.execute(
        text("SELECT name FROM institutions WHERE id=:i"), {"i": inst_id}
    ).scalar()
    aicte_id = db.execute(
        text("SELECT aicte_permanent_id FROM institutions WHERE id=:i"), {"i": inst_id}
    ).scalar()
    cat = db.execute(text("SELECT category FROM sla_rules LIMIT 1")).scalar()

    r = client.post("/api/cases", json={
        "institution_name": inst_name,
        "aicte_id": aicte_id,
        "category": cat,
        "description": "Test case for document C11",
        "bureau_code": "RB",
    }, headers=h)
    assert r.status_code == 201, f"Create case failed: {r.text}"
    return r.json()["id"], r.json()["case_ref"]


def _add_action(client: TestClient, h: dict, case_id: int) -> int:
    r = client.post(f"/api/cases/{case_id}/actions", json={
        "action_type": "remark", "remarks": "Uploading document"
    }, headers=h)
    assert r.status_code == 201, f"Add action failed: {r.text}"
    return r.json()["action_id"]


def _make_pdf(content: bytes = b"Hello") -> bytes:
    return b"%PDF-1.4 test content " + content


def _make_png() -> bytes:
    return b"\x89PNG\r\n\x1a\n" + b"\x00" * 16


def _cleanup(db, case_id: int):
    """Remove test case and all related files from disk."""
    # Get storage keys before deleting
    keys = db.execute(text(
        "SELECT d.storage_key FROM documents d "
        "JOIN actions a ON a.id=d.action_id WHERE a.case_id=:i"
    ), {"i": case_id}).scalars().all()
    db.execute(text("DELETE FROM cases WHERE id=:i"), {"i": case_id})
    db.commit()
    # Clean up files
    base = Path(settings.local_storage_dir).resolve() / "documents"
    for key in keys:
        f = base / key
        if f.exists():
            f.unlink()


# ── C11: document upload and download ─────────────────────────────────────────

def test_c11_valid_pdf_upload_and_download(client: TestClient, token_rb1: str):
    h = _headers(token_rb1)
    db = SessionLocal()
    case_id = None
    try:
        case_id, _ = _create_test_case(client, h, db)
        action_id = _add_action(client, h, case_id)

        pdf_data = _make_pdf(b"real content")
        r = client.post(
            f"/api/actions/{action_id}/documents",
            files={"file": ("report.pdf", io.BytesIO(pdf_data), "application/pdf")},
            headers=h,
        )
        assert r.status_code == 201, f"Upload failed: {r.text}"
        doc_id = r.json()["id"]
        assert r.json()["file_name"] == "report.pdf"

        # Download and verify identical bytes
        dl = client.get(f"/api/documents/{doc_id}", headers=h)
        assert dl.status_code == 200
        assert dl.content == pdf_data
        assert "attachment" in dl.headers.get("content-disposition", "").lower()

    finally:
        if case_id:
            _cleanup(db, case_id)
        db.close()


def test_c11_disallowed_extension(client: TestClient, token_rb1: str):
    h = _headers(token_rb1)
    db = SessionLocal()
    case_id = None
    try:
        case_id, _ = _create_test_case(client, h, db)
        action_id = _add_action(client, h, case_id)

        r = client.post(
            f"/api/actions/{action_id}/documents",
            files={"file": ("virus.exe", io.BytesIO(b"MZ" + b"\x00" * 100), "application/octet-stream")},
            headers=h,
        )
        assert r.status_code == 415, f"Expected 415 for .exe, got {r.status_code}"
    finally:
        if case_id:
            _cleanup(db, case_id)
        db.close()


def test_c11_bad_magic_bytes(client: TestClient, token_rb1: str):
    h = _headers(token_rb1)
    db = SessionLocal()
    case_id = None
    try:
        case_id, _ = _create_test_case(client, h, db)
        action_id = _add_action(client, h, case_id)

        # Sends a .pdf extension but wrong magic
        r = client.post(
            f"/api/actions/{action_id}/documents",
            files={"file": ("fake.pdf", io.BytesIO(b"This is not a PDF"), "application/pdf")},
            headers=h,
        )
        assert r.status_code == 415, f"Expected 415 for bad magic, got {r.status_code}"
    finally:
        if case_id:
            _cleanup(db, case_id)
        db.close()


def test_c11_oversized_file(client: TestClient, token_rb1: str):
    h = _headers(token_rb1)
    db = SessionLocal()
    case_id = None
    try:
        case_id, _ = _create_test_case(client, h, db)
        action_id = _add_action(client, h, case_id)

        big_data = b"%PDF" + b"X" * (11 * 1024 * 1024)
        r = client.post(
            f"/api/actions/{action_id}/documents",
            files={"file": ("huge.pdf", io.BytesIO(big_data), "application/pdf")},
            headers=h,
        )
        assert r.status_code == 413, f"Expected 413 for oversized file, got {r.status_code}"
    finally:
        if case_id:
            _cleanup(db, case_id)
        db.close()


def test_c11_path_traversal_filename(client: TestClient, token_rb1: str):
    h = _headers(token_rb1)
    db = SessionLocal()
    case_id = None
    try:
        case_id, _ = _create_test_case(client, h, db)
        action_id = _add_action(client, h, case_id)

        pdf_data = _make_pdf()
        r = client.post(
            f"/api/actions/{action_id}/documents",
            files={"file": ("../../evil.pdf", io.BytesIO(pdf_data), "application/pdf")},
            headers=h,
        )
        assert r.status_code == 201, f"Upload failed: {r.text}"
        # Verify file is inside storage dir (key is UUID)
        doc_id = r.json()["id"]
        key = db.execute(text("SELECT storage_key FROM documents WHERE id=:i"), {"i": doc_id}).scalar()
        base = Path(settings.local_storage_dir).resolve() / "documents"
        stored_path = (base / key).resolve()
        assert str(stored_path).startswith(str(base)), "File stored outside storage dir!"
        # Filename sanitised (no path traversal)
        assert r.json()["file_name"] == "evil.pdf"
    finally:
        if case_id:
            _cleanup(db, case_id)
        db.close()


def test_c11_out_of_scope(client: TestClient, token_south1: str, token_rb1: str):
    """south1 cannot upload to a North/East/West case."""
    h_rb1 = _headers(token_rb1)
    h_south1 = _headers(token_south1)
    db = SessionLocal()
    case_id = None
    try:
        # Create a non-South case as rb1
        non_south_inst = db.execute(text(
            "SELECT id FROM institutions WHERE region != 'South' LIMIT 1"
        )).scalar()
        if not non_south_inst:
            pytest.skip("No non-South institution in DB")

        inst_name = db.execute(
            text("SELECT name FROM institutions WHERE id=:i"), {"i": non_south_inst}
        ).scalar()
        aicte_id = db.execute(
            text("SELECT aicte_permanent_id FROM institutions WHERE id=:i"), {"i": non_south_inst}
        ).scalar()
        cat = db.execute(text("SELECT category FROM sla_rules LIMIT 1")).scalar()

        r = client.post("/api/cases", json={
            "institution_name": inst_name,
            "aicte_id": aicte_id,
            "category": cat,
            "description": "Out of scope test case C11",
            "bureau_code": "RB",
        }, headers=h_rb1)
        assert r.status_code == 201
        case_id = r.json()["id"]

        action_id = _add_action(client, h_rb1, case_id)

        # south1 should get 404
        pdf_data = _make_pdf()
        r = client.post(
            f"/api/actions/{action_id}/documents",
            files={"file": ("doc.pdf", io.BytesIO(pdf_data), "application/pdf")},
            headers=h_south1,
        )
        assert r.status_code == 404, f"Expected 404 for out-of-scope, got {r.status_code}"

    finally:
        if case_id:
            _cleanup(db, case_id)
        db.close()


def test_c11_no_token(client: TestClient):
    r = client.post(
        "/api/actions/1/documents",
        files={"file": ("doc.pdf", io.BytesIO(b"%PDF test"), "application/pdf")},
    )
    assert r.status_code == 401
