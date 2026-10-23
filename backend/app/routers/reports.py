import io

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from sqlalchemy import text

from ..db import get_db
from ..auth import current_user, scope_clause

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
            """
            SELECT
              count(*) FILTER (WHERE level='high'   AND status='suggested') AS high_open,
              count(*) FILTER (WHERE level='medium' AND status='suggested') AS medium_open,
              count(*) FILTER (WHERE status='confirmed') AS confirmed,
              count(*) FILTER (WHERE status='dismissed') AS dismissed
            FROM overlap_links
            """
        )
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


@router.get("/reports/ageing")
def ageing_report(db=Depends(get_db), user=Depends(current_user)):
    sc, sp = scope_clause(user)
    rows = db.execute(
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
    return [dict(r) for r in rows]


@router.get("/reports/bureau.xlsx")
def bureau_xlsx(db=Depends(get_db), user=Depends(current_user)):
    rows = db.execute(
        text(
            """
            SELECT b.code,
                   count(*) AS total,
                   count(*) FILTER (WHERE c.closed_date IS NULL) AS open,
                   count(*) FILTER (WHERE c.status='disposed') AS disposed,
                   count(*) FILTER (WHERE c.closed_date IS NULL AND c.sla_due_date<CURRENT_DATE) AS overdue
            FROM cases c
            JOIN bureaus b ON b.id=c.bureau_id
            GROUP BY b.code ORDER BY b.code
            """
        )
    ).all()
    wb = Workbook()
    ws = wb.active
    ws.title = "Bureau Report"
    ws.append(["Bureau/Cell", "Total", "Open", "Disposed", "Overdue"])
    for r in rows:
        ws.append(list(r))
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=bureau_report.xlsx"},
    )


@router.get("/reports/bureau.pdf")
def bureau_pdf(db=Depends(get_db), user=Depends(current_user)):
    rows = db.execute(
        text(
            """
            SELECT b.code,
                   count(*) AS total,
                   count(*) FILTER (WHERE c.closed_date IS NULL) AS open,
                   count(*) FILTER (WHERE c.status='disposed') AS disposed,
                   count(*) FILTER (WHERE c.closed_date IS NULL AND c.sla_due_date<CURRENT_DATE) AS overdue
            FROM cases c
            JOIN bureaus b ON b.id=c.bureau_id
            GROUP BY b.code ORDER BY b.code
            """
        )
    ).all()

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = [
        Paragraph("AICTE CaseNexus — Bureau/Cell Report", styles["Title"]),
        Paragraph("Synthetic evaluation data — not real complaint records", styles["Normal"]),
    ]
    data = [["Bureau/Cell", "Total", "Open", "Disposed", "Overdue"]]
    for r in rows:
        data.append([str(v) for v in r])
    t = Table(data)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.darkblue),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.lightblue]),
    ]))
    elements.append(t)
    doc.build(elements)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=bureau_report.pdf"},
    )
