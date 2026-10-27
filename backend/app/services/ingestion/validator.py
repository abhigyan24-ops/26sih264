"""
Row validation service for data import.
"""
from __future__ import annotations
import datetime
import re
from typing import Tuple, Dict, Any, List

DATE_FORMATS = [
    "%Y-%m-%d",
    "%d-%m-%Y",
    "%d/%m/%Y",
    "%Y/%m/%d",
    "%d.%m.%Y",
    "%m/%d/%Y",
]

DEFAULT_BUREAU_BY_SOURCE = {
    "rb": "RB",
    "pgrc": "PGRC",
    "regional": "ROC-N",
}


def parse_date(date_str: str | None) -> datetime.date:
    if not date_str or not str(date_str).strip():
        return datetime.date.today()
    clean = str(date_str).strip().split("T")[0].split(" ")[0]
    for fmt in DATE_FORMATS:
        try:
            return datetime.datetime.strptime(clean, fmt).date()
        except ValueError:
            continue
    return datetime.date.today()


def validate_row(
    row_num: int,
    mapped_data: Dict[str, str],
    valid_categories: set[str],
    valid_bureaus: set[str],
    source: str = "rb",
) -> Tuple[bool, Dict[str, Any], List[str]]:
    errors: List[str] = []

    # 1. source_case_id
    scid = str(mapped_data.get("source_case_id", "")).strip()
    if not scid:
        errors.append("Missing source case ID")

    # 2. description
    desc = str(mapped_data.get("description", "")).strip()
    if not desc:
        errors.append("Description is required")
    elif len(desc) < 10:
        errors.append("Description must be at least 10 characters")

    # 3. institution_name
    inst_name = str(mapped_data.get("institution_name", "")).strip()
    if not inst_name:
        errors.append("Institution name is required for resolution")

    # 4. category
    raw_cat = str(mapped_data.get("category", "")).strip().upper()
    if raw_cat in valid_categories:
        cat = raw_cat
    elif "OTHER" in valid_categories:
        cat = "OTHER"
    elif valid_categories:
        cat = sorted(list(valid_categories))[0]
    else:
        cat = "OTHER"

    # 5. bureau_code
    raw_bureau = str(mapped_data.get("bureau_code", "")).strip().upper()
    if raw_bureau in valid_bureaus:
        bureau = raw_bureau
    else:
        fallback = DEFAULT_BUREAU_BY_SOURCE.get(source.lower(), "RB")
        bureau = fallback if fallback in valid_bureaus else (sorted(list(valid_bureaus))[0] if valid_bureaus else "RB")

    # 6. received_date
    rec_date = parse_date(mapped_data.get("received_date"))

    # 7. priority
    raw_pri = str(mapped_data.get("priority", "")).strip().lower()
    priority = raw_pri if raw_pri in ("low", "normal", "high") else "normal"

    # 8. sensitive
    raw_sens = str(mapped_data.get("sensitive", "")).strip().lower()
    sensitive = raw_sens in ("true", "1", "yes", "sensitive", "t")

    cleaned: Dict[str, Any] = {
        "row_num": row_num,
        "source_case_id": scid,
        "description": desc,
        "institution_name": inst_name,
        "city": str(mapped_data.get("city", "")).strip() or None,
        "aicte_id": str(mapped_data.get("aicte_id", "")).strip() or None,
        "category": cat,
        "bureau_code": bureau,
        "received_date": rec_date,
        "priority": priority,
        "sensitive": sensitive,
    }

    return len(errors) == 0, cleaned, errors
