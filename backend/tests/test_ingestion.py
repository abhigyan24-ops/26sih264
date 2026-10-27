import uuid
from pathlib import Path
import io
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db import engine, get_db
from app.main import app
from app.services.ingestion.mapping import guess_mapping, get_mapping, save_mapping
from tests.conftest import login_token


@pytest.fixture(scope="module", autouse=True)
def apply_schema():
    migration = Path(__file__).resolve().parents[2] / "db/migrations/070_ingestion.sql"
    with engine.begin() as conn:
        for stmt in migration.read_text().split(";"):
            if stmt.strip():
                conn.execute(text(stmt))


@pytest.fixture
def auth_client():
    with TestClient(app) as client:
        token = login_token(client, "admin", "demo123")
        client.headers.update({"Authorization": f"Bearer {token}"})
        yield client


@pytest.fixture
def db_session():
    with engine.connect() as conn:
        outer = conn.begin()
        db = Session(bind=conn, join_transaction_mode="create_savepoint")
        try:
            yield db
        finally:
            db.close()
            outer.rollback()


def test_mapping_heuristics_and_storage(db_session):
    # Test synonym guessing
    headers = ["Case_No", "College_Name", "Complaint_Details", "Date_Filed", "Severity_Level"]
    guessed = guess_mapping(headers, "rb")
    assert guessed.get("Case_No") == "source_case_id"
    assert guessed.get("College_Name") == "institution_name"
    assert guessed.get("Complaint_Details") == "description"
    assert guessed.get("Severity_Level") == "priority"

    # Test saving custom mapping
    custom = {"Case_No": "source_case_id", "Complaint_Details": "description", "College_Name": "institution_name"}
    saved = save_mapping(db_session, "test_source", custom)
    assert saved == custom
    loaded = get_mapping(db_session, "test_source")
    assert loaded == custom


def test_dry_run_writes_nothing(auth_client, db_session):
    # Count cases before dry run
    cases_before = db_session.execute(text("SELECT count(*) FROM cases")).scalar()
    overlaps_before = db_session.execute(text("SELECT count(*) FROM overlap_links")).scalar()

    # Find a valid institution
    inst = db_session.execute(text("SELECT name, city FROM institutions LIMIT 1")).mappings().one()

    csv_data = (
        "case_no,college_name,city,complaint_details,category\n"
        f'DRY-001,"{inst["name"]}",{inst["city"]},"Teachers at this college have not received salaries for six months",FACULTY\n'
    )

    response = auth_client.post(
        "/ingestion/upload",
        data={"source": "rb", "dry_run": "true"},
        files={"file": ("dry_run_test.csv", csv_data.encode("utf-8"), "text/csv")},
    )
    assert response.status_code == 200
    res = response.json()
    assert res["is_dry_run"] is True
    assert res["imported_rows"] == 1
    assert res["error_rows"] == 0

    # Ensure zero database changes were persisted
    cases_after = db_session.execute(text("SELECT count(*) FROM cases")).scalar()
    overlaps_after = db_session.execute(text("SELECT count(*) FROM overlap_links")).scalar()
    assert cases_after == cases_before
    assert overlaps_after == overlaps_before


def test_bad_rows_reported(auth_client):
    csv_data = (
        "case_no,college_name,city,complaint_details\n"
        ",Valid College,Pune,This is a valid long description but missing case_no\n"
        "BAD-002,,Pune,Valid description but missing institution name completely\n"
        "BAD-003,Valid College,Pune,Short\n"
    )

    response = auth_client.post(
        "/ingestion/upload",
        data={"source": "rb", "dry_run": "true"},
        files={"file": ("bad_rows.csv", csv_data.encode("utf-8"), "text/csv")},
    )
    assert response.status_code == 200
    res = response.json()
    assert res["total_rows"] == 3
    assert res["imported_rows"] == 0
    assert res["error_rows"] == 3
    assert len(res["errors"]) == 3

    errors = {e["row"]: e["errors"] for e in res["errors"]}
    assert any("Missing source case ID" in err for err in errors[1])
    assert any("Institution name is required" in err for err in errors[2])
    assert any("at least 10 characters" in err for err in errors[3])


def test_institution_needs_review_is_held(auth_client, db_session):
    # Completely fictional institution that will fail resolution or trigger review floor
    csv_data = (
        "case_no,college_name,city,complaint_details\n"
        "HELD-999,Xyz Nonexistent Fantasy Academy of Outer Space,UnknownCity,Students complain of complete absence of laboratory facilities\n"
    )

    response = auth_client.post(
        "/ingestion/upload",
        data={"source": "rb", "dry_run": "false"},
        files={"file": ("held_test.csv", csv_data.encode("utf-8"), "text/csv")},
    )
    assert response.status_code == 200
    res = response.json()
    assert res["held_rows"] == 1
    assert res["imported_rows"] == 0

    # Verify held row persisted in import_held_rows
    held_row = db_session.execute(
        text("SELECT * FROM import_held_rows WHERE source_case_id = 'HELD-999'")
    ).mappings().first()
    assert held_row is not None
    assert held_row["status"] == "held"
    assert held_row["reason"] in ("low_score", "no_candidates", "ambiguous")


def test_idempotency_duplicate_file_imports_nothing_new(auth_client, db_session):
    inst = db_session.execute(text("SELECT name, city FROM institutions LIMIT 1")).mappings().one()
    unique_scid = f"IDEM-{uuid.uuid4().hex[:8]}"

    csv_data = (
        "case_no,college_name,city,complaint_details,category\n"
        f'{unique_scid},"{inst["name"]}",{inst["city"]},"Students report unapproved fees collected without receipts",FEES\n'
    )

    # First upload (normal mode)
    r1 = auth_client.post(
        "/ingestion/upload",
        data={"source": "rb", "dry_run": "false"},
        files={"file": ("idem_test.csv", csv_data.encode("utf-8"), "text/csv")},
    )
    assert r1.status_code == 200
    res1 = r1.json()
    assert res1["imported_rows"] == 1
    assert res1["duplicate_rows"] == 0

    # Second upload with exact same source and source_case_id
    r2 = auth_client.post(
        "/ingestion/upload",
        data={"source": "rb", "dry_run": "false"},
        files={"file": ("idem_test.csv", csv_data.encode("utf-8"), "text/csv")},
    )
    assert r2.status_code == 200
    res2 = r2.json()
    assert res2["imported_rows"] == 0
    assert res2["duplicate_rows"] == 1


def test_sources_and_history_endpoints(auth_client):
    r_sources = auth_client.get("/ingestion/sources")
    assert r_sources.status_code == 200
    assert "sources" in r_sources.json()

    r_logs = auth_client.get("/ingestion/logs")
    assert r_logs.status_code == 200
    assert "items" in r_logs.json()

    r_held = auth_client.get("/ingestion/held")
    assert r_held.status_code == 200
    assert "items" in r_held.json()
