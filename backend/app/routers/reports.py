import io

from datetime import date
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from sqlalchemy import text

from ..db import get_db
from ..auth import current_user, scope_clause
from ..services import reports as queries

router = APIRouter(prefix="/api", tags=["dashboard", "reports"])


@router.get("/dashboard")
def dashboard(db=Depends(get_db), user=Depends(current_user)):
    sc, sp = scope_clause(user)
    base = f"FROM cases c JOIN institutions i ON i.id=c.institution_id WHERE 1=1 {sc}"

    kpi = db.execute(
        text(
            f"""
            SELECT
              count(*) AS total,
              count(*) FILTER (WHERE status IN ('received','registered','assigned')) AS pending,
              count(*) FILTER (WHERE status IN ('under_process','action_taken','reopened')) AS under_process,
              count(*) FILTER (WHERE status='disposed') AS disposed,
              count(*) FILTER (WHERE status='transferred') AS transferred,
              count(*) FILTER (WHERE status='escalated') AS escalated,
              count(*) FILTER (WHERE closed_date IS NULL AND sla_due_date < CURRENT_DATE) AS overdue,
              count(*) FILTER (WHERE hold_parallel=TRUE AND closed_date IS NULL) AS on_hold
            {base}
            """
        ),
        sp,
    ).mappings().one()

    by_bureau = db.execute(
        text(
            f"""
            SELECT b.code AS bureau,
                   count(*) FILTER (WHERE c.closed_date IS NULL) AS open,
                   count(*) FILTER (WHERE c.closed_date IS NOT NULL) AS closed,
                   count(*) FILTER (WHERE c.closed_date IS NULL AND c.sla_due_date < CURRENT_DATE) AS overdue
            FROM cases c
            JOIN institutions i ON i.id=c.institution_id
            JOIN bureaus b ON b.id=c.bureau_id
            WHERE 1=1 {sc}
            GROUP BY b.code ORDER BY open DESC
            """
        ),
        sp,
    ).mappings().all()

    by_region = db.execute(
        text(
            f"""
            SELECT i.region,
                   count(*) FILTER (WHERE c.closed_date IS NULL) AS open,
                   count(*) AS total
            FROM cases c
            JOIN institutions i ON i.id=c.institution_id
            WHERE 1=1 {sc}
            GROUP BY i.region
            """
        ),
        sp,
    ).mappings().all()

    overlaps = db.execute(
        text(
            f"""
            SELECT
              count(*) FILTER (WHERE l.level='high'   AND l.status='suggested') AS high_open,
              count(*) FILTER (WHERE l.level='medium' AND l.status='suggested') AS medium_open,
              count(*) FILTER (WHERE l.status='confirmed') AS confirmed,
              count(*) FILTER (WHERE l.status='dismissed') AS dismissed
            FROM overlap_links l
            JOIN cases c ON c.id = l.case_a
            JOIN institutions i ON i.id = c.institution_id
            WHERE 1=1 {sc}
            """
        ),
        sp,
    ).mappings().one()

    ageing = db.execute(
        text(
            f"""
            SELECT
              CASE WHEN age<=15 THEN '0-15'
                   WHEN age<=30 THEN '16-30'
                   WHEN age<=60 THEN '31-60'
                   WHEN age<=90 THEN '61-90'
                   ELSE '90+'
              END AS bucket,
              count(*) AS n
            FROM (
              SELECT (CURRENT_DATE - c.received_date) AS age
              FROM cases c JOIN institutions i ON i.id=c.institution_id
              WHERE c.closed_date IS NULL {sc}
            ) t
            GROUP BY 1
            ORDER BY min(age)
            """
        ),
        sp,
    ).mappings().all()

    return {
        "kpi": dict(kpi),
        "by_bureau": [dict(r) for r in by_bureau],
        "by_region": [dict(r) for r in by_region],
        "overlaps": dict(overlaps),
        "ageing": [dict(r) for r in ageing],
    }


def report_dates(date_from: date | None = None, date_to: date | None = None):
    if date_from is not None and date_to is not None and date_from > date_to:
        raise HTTPException(422, "date_from must not be after date_to")
    return date_from, date_to


@router.get("/reports/bureau-wise")
def bureau_report(dates=Depends(report_dates), db=Depends(get_db), user=Depends(current_user)):
    return queries.bureau(db, user, *dates)


@router.get("/reports/region-wise")
def region_report(dates=Depends(report_dates), db=Depends(get_db), user=Depends(current_user)):
    return queries.region(db, user, *dates)


@router.get("/reports/institution/{institution_id}")
def institution_report(institution_id: int, dates=Depends(report_dates), db=Depends(get_db), user=Depends(current_user)):
    return queries.institution(db, user, institution_id, *dates)


@router.get("/reports/ageing")
def ageing_report(dates=Depends(report_dates), db=Depends(get_db), user=Depends(current_user)):
    return queries.ageing(db, user, *dates)


@router.get("/reports/disposal-rate")
def disposal_report(dates=Depends(report_dates), db=Depends(get_db), user=Depends(current_user)):
    return queries.disposal(db, user, *dates)


@router.get("/reports/overlaps")
def overlap_report(dates=Depends(report_dates), db=Depends(get_db), user=Depends(current_user)):
    return queries.overlaps(db, user, *dates)


@router.get("/reports/trend")
def trend_report(period: Literal["month", "quarter"] = "month", dates=Depends(report_dates),
                 db=Depends(get_db), user=Depends(current_user)):
    return queries.trend(db, user, period, *dates)


HEADERS = ["Bureau/Cell", "Total", "Open", "Disposed", "Overdue"]


def table_rows(db, user, dates):
    return [[row[key] for key in ("bureau", "total", "open", "disposed", "overdue")]
            for row in queries.bureau(db, user, *dates)]


@router.get("/reports/bureau.xlsx")
def bureau_xlsx(dates=Depends(report_dates), db=Depends(get_db), user=Depends(current_user)):
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Bureau Report"
    sheet.append(HEADERS)
    for row in table_rows(db, user, dates):
        sheet.append(row)
    sheet.freeze_panes = "A2"
    sheet.auto_filter.ref = sheet.dimensions
    buf = io.BytesIO()
    workbook.save(buf)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                             headers={"Content-Disposition": "attachment; filename=bureau_report.xlsx"})


@router.get("/reports/bureau.pdf")
def bureau_pdf(dates=Depends(report_dates), db=Depends(get_db), user=Depends(current_user)):
    buf = io.BytesIO()
    styles = getSampleStyleSheet()
    table = Table([HEADERS, *table_rows(db, user, dates)], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), colors.darkblue),
        ("TEXTCOLOR", (0,0), (-1,0), colors.white),
        ("GRID", (0,0), (-1,-1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.lightblue]),
    ]))
    document = SimpleDocTemplate(buf, pagesize=A4)
    document.build([
        Paragraph("AICTE CaseNexus Bureau/Cell Report", styles["Title"]),
        Paragraph("Generated: " + date.today().isoformat(), styles["Normal"]),
        Paragraph("Prototype data: synthetic", styles["Normal"]),
        table,
    ])
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/pdf",
                             headers={"Content-Disposition": "attachment; filename=bureau_report.pdf"})
