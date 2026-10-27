"""
File parsing service for CSV and XLSX files.
"""
from __future__ import annotations
import csv
import io
from typing import Tuple, List, Dict, Any


def parse_csv(content: bytes) -> Tuple[List[str], List[Dict[str, str]]]:
    # Try decoding UTF-8 with BOM handling, fallback to latin-1
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    # Detect delimiter
    sample = text[:4096]
    delimiter = ","
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",\t;|")
        delimiter = dialect.delimiter
    except Exception:
        delimiter = ","

    f = io.StringIO(text)
    reader = csv.reader(f, delimiter=delimiter)
    try:
        raw_headers = next(reader)
    except StopIteration:
        return [], []

    headers = [h.strip() for h in raw_headers if h is not None]
    rows: List[Dict[str, str]] = []

    for row_idx, row in enumerate(reader, start=2):
        if not row or not any(cell.strip() for cell in row if isinstance(cell, str)):
            continue
        row_dict: Dict[str, str] = {}
        for col_idx, h in enumerate(headers):
            val = row[col_idx].strip() if col_idx < len(row) and row[col_idx] else ""
            row_dict[h] = val
        rows.append(row_dict)

    return headers, rows


def parse_xlsx(content: bytes) -> Tuple[List[str], List[Dict[str, str]]]:
    import openpyxl

    wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    sheet = wb.active
    if not sheet:
        return [], []

    rows_iter = sheet.iter_rows(values_only=True)
    try:
        first_row = next(rows_iter)
    except StopIteration:
        return [], []

    headers = [str(cell).strip() for cell in first_row if cell is not None]
    rows: List[Dict[str, str]] = []

    for row in rows_iter:
        if not row or not any(row):
            continue
        row_dict: Dict[str, str] = {}
        for col_idx, h in enumerate(headers):
            val = str(row[col_idx]).strip() if col_idx < len(row) and row[col_idx] is not None else ""
            row_dict[h] = val
        rows.append(row_dict)

    return headers, rows


def parse_file_contents(filename: str, content: bytes) -> Tuple[List[str], List[Dict[str, str]]]:
    fn = filename.lower()
    if fn.endswith(".xlsx") or fn.endswith(".xls"):
        return parse_xlsx(content)
    return parse_csv(content)
