"""
Column mapping service for data import adapter.
Maps source system columns to CaseNexus schema fields.
"""
from __future__ import annotations
import json
import re
from typing import Any
from sqlalchemy import text

# Standard CaseNexus schema target fields
SCHEMA_FIELDS = {
    "source_case_id": "Unique identifier from source system (e.g. Case #, Ticket ID)",
    "description": "Grievance text / incident description",
    "institution_name": "Institution / college name for resolution",
    "city": "Institution city or district (optional)",
    "aicte_id": "Permanent AICTE ID (optional)",
    "category": "Grievance category code (optional, e.g. FACULTY, FEES)",
    "bureau_code": "Handling bureau code (optional, e.g. RB, PGRC, ROC-N)",
    "received_date": "Date grievance was filed/received (optional, YYYY-MM-DD)",
    "priority": "Priority level ('low', 'normal', 'high', optional)",
    "sensitive": "Flag for sensitive/confidential grievance (optional boolean)",
}

# Synonyms for auto-detection
FIELD_SYNONYMS: dict[str, list[str]] = {
    "source_case_id": [
        "source_case_id", "case_no", "complaint_id", "ref_no", "ticket_no",
        "pgrc_id", "case_id", "grievance_id", "id", "file_no", "ref_num", "reference_no"
    ],
    "description": [
        "description", "complaint_details", "incident_details", "details",
        "summary", "grievance_description", "remarks", "allegation", "facts", "complaint_text"
    ],
    "institution_name": [
        "institution_name", "college_name", "institution", "college",
        "institute_name", "institute", "university", "centre"
    ],
    "city": ["city", "district", "location", "town", "hq_city"],
    "aicte_id": ["aicte_id", "permanent_id", "aicte_permanent_id", "inst_id", "pid"],
    "category": ["category", "type", "nature_of_complaint", "grievance_category", "subject_code"],
    "bureau_code": ["bureau_code", "bureau", "cell", "office", "dept", "department"],
    "received_date": [
        "received_date", "date_of_complaint", "submission_date", "filing_date",
        "entry_date", "received_on", "date", "incident_date"
    ],
    "priority": ["priority", "severity", "urgency"],
    "sensitive": ["sensitive", "confidential", "is_sensitive"],
}

DEFAULT_MAPPINGS: dict[str, dict[str, str]] = {
    "rb": {
        "case_no": "source_case_id",
        "complaint_details": "description",
        "college_name": "institution_name",
        "city": "city",
        "category": "category",
        "bureau": "bureau_code",
        "date_of_complaint": "received_date",
        "severity": "priority",
    },
    "pgrc": {
        "grievance_id": "source_case_id",
        "grievance_description": "description",
        "institution": "institution_name",
        "city": "city",
        "category": "category",
        "submission_date": "received_date",
        "priority": "priority",
    },
    "regional": {
        "file_no": "source_case_id",
        "allegation": "description",
        "institution_name": "institution_name",
        "city": "city",
        "category": "category",
        "entry_date": "received_date",
        "priority": "priority",
    },
}


def _normalize_header(header: str) -> str:
    s = header.strip().lower()
    return re.sub(r"[^a-z0-9]+", "_", s).strip("_")


def guess_mapping(headers: list[str], source: str | None = None) -> dict[str, str]:
    """
    Intelligently suggest mapping for given raw headers using known synonyms
    and source-specific conventions.
    """
    guessed: dict[str, str] = {}
    assigned_targets: set[str] = set()

    # If known source has explicit defaults, check those first
    source_defaults = DEFAULT_MAPPINGS.get((source or "").lower(), {})
    for h in headers:
        nh = _normalize_header(h)
        if nh in source_defaults:
            target = source_defaults[nh]
            if target not in assigned_targets:
                guessed[h] = target
                assigned_targets.add(target)
                continue

    # Fallback to synonym matching
    for h in headers:
        if h in guessed:
            continue
        nh = _normalize_header(h)
        for target, synonyms in FIELD_SYNONYMS.items():
            if target in assigned_targets:
                continue
            if nh in synonyms or any(syn in nh for syn in synonyms):
                guessed[h] = target
                assigned_targets.add(target)
                break

    return guessed


def get_mapping(db, source: str) -> dict[str, str]:
    """
    Retrieve stored column mapping for a source from the database.
    If none exists, falls back to source default.
    """
    row = db.execute(
        text("SELECT mapping FROM import_mappings WHERE source = :s"),
        {"s": source.lower().strip()},
    ).first()
    if row and row.mapping:
        if isinstance(row.mapping, str):
            return json.loads(row.mapping)
        return dict(row.mapping)

    return DEFAULT_MAPPINGS.get(source.lower().strip(), {})


def save_mapping(db, source: str, mapping: dict[str, str]) -> dict[str, str]:
    """
    Save or update column mapping for a source system.
    """
    s = source.lower().strip()
    mapping_clean = {k: v for k, v in mapping.items() if v in SCHEMA_FIELDS}
    db.execute(
        text("""
            INSERT INTO import_mappings (source, mapping, created_at, updated_at)
            VALUES (:s, CAST(:m AS jsonb), NOW(), NOW())
            ON CONFLICT (source) DO UPDATE
            SET mapping = EXCLUDED.mapping,
                updated_at = NOW()
        """),
        {"s": s, "m": json.dumps(mapping_clean)},
    )
    db.commit()
    return mapping_clean
