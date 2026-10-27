"""Scoped report queries shared by JSON and export endpoints."""
from sqlalchemy import text
from ..auth import scope_clause

JOINS = "FROM cases c JOIN institutions i ON i.id=c.institution_id JOIN bureaus b ON b.id=c.bureau_id"


def filters(user, date_from=None, date_to=None, date_column="c.received_date"):
    scope, params = scope_clause(user)
    where = "TRUE" + scope
    if user["role"] == "regional" and not user.get("region"):
        where += " AND FALSE"
    if date_from is not None:
        where += f" AND {date_column}>=:date_from"
        params["date_from"] = date_from
    if date_to is not None:
        where += f" AND {date_column}<=:date_to"
        params["date_to"] = date_to
    return where, params


def rows(db, sql, params):
    return [dict(row) for row in db.execute(text(sql), params).mappings()]


def bureau(db, user, date_from=None, date_to=None):
    where, params = filters(user, date_from, date_to)
    return rows(db, f"""SELECT b.code AS bureau,count(*) AS total,
        count(*) FILTER(WHERE c.closed_date IS NULL) AS open,
        count(*) FILTER(WHERE c.status='disposed') AS disposed,
        count(*) FILTER(WHERE c.closed_date IS NULL AND c.sla_due_date<CURRENT_DATE) AS overdue
        {JOINS} WHERE {where} GROUP BY b.code ORDER BY b.code""", params)


def region(db, user, date_from=None, date_to=None):
    where, params = filters(user, date_from, date_to)
    return rows(db, f"""SELECT i.region,count(*) AS total,
        count(*) FILTER(WHERE c.closed_date IS NULL) AS open,
        count(*) FILTER(WHERE c.status='disposed') AS disposed,
        count(*) FILTER(WHERE c.closed_date IS NULL AND c.sla_due_date<CURRENT_DATE) AS overdue
        {JOINS} WHERE {where} GROUP BY i.region ORDER BY i.region""", params)


def institution(db, user, institution_id, date_from=None, date_to=None):
    where, params = filters(user, date_from, date_to)
    return rows(db, f"""SELECT c.id,c.case_ref,c.category,c.status,c.received_date,c.closed_date,
        b.code AS bureau {JOINS} WHERE {where} AND i.id=:institution_id
        ORDER BY c.received_date,c.id""", {**params, "institution_id": institution_id})


def ageing(db, user, date_from=None, date_to=None):
    where, params = filters(user, date_from, date_to)
    return rows(db, f"""SELECT CASE WHEN age<=15 THEN '0-15' WHEN age<=30 THEN '16-30'
        WHEN age<=60 THEN '31-60' WHEN age<=90 THEN '61-90' ELSE '90+' END AS bucket,
        count(*) AS n FROM (SELECT greatest(CURRENT_DATE-c.received_date,0) AS age
        {JOINS} WHERE {where} AND c.closed_date IS NULL) ages
        GROUP BY 1 ORDER BY min(age)""", params)


def disposal(db, user, date_from=None, date_to=None):
    incoming, params = filters(user, date_from, date_to)
    outgoing, _ = filters(user, date_from, date_to, "c.closed_date")
    return rows(db, f"""WITH received AS (
        SELECT date_trunc('month',c.received_date)::date AS month,count(*) AS n
        {JOINS} WHERE {incoming} GROUP BY 1), disposed AS (
        SELECT date_trunc('month',c.closed_date)::date AS month,count(*) AS n
        {JOINS} WHERE {outgoing} AND c.status='disposed' AND c.closed_date IS NOT NULL GROUP BY 1)
        SELECT coalesce(r.month,d.month) AS month,coalesce(r.n,0) AS received,
        coalesce(d.n,0) AS disposed,CASE WHEN r.n>0 THEN coalesce(d.n,0)::float/r.n ELSE NULL END AS rate
        FROM received r FULL JOIN disposed d USING(month) ORDER BY 1""", params)


def overlaps(db, user, date_from=None, date_to=None):
    where, params = filters(user, date_from, date_to)
    if user["role"] == "regional":
        where += " AND other_inst.region=:other_region"
        params["other_region"] = user.get("region")
    return rows(db, f"""SELECT l.level,l.status,count(*) AS n FROM overlap_links l
        JOIN cases c ON c.id=l.case_a JOIN institutions i ON i.id=c.institution_id
        JOIN cases other_case ON other_case.id=l.case_b
        JOIN institutions other_inst ON other_inst.id=other_case.institution_id
        WHERE {where} GROUP BY l.level,l.status ORDER BY l.level,l.status""", params)


def trend(db, user, period, date_from=None, date_to=None):
    where, params = filters(user, date_from, date_to)
    return rows(db, f"""SELECT date_trunc(:period,CAST(c.received_date AS timestamp))::date AS period,
        count(*) AS received,count(*) FILTER(WHERE c.status='disposed') AS disposed
        {JOINS} WHERE {where} GROUP BY 1 ORDER BY 1""", {**params, "period": period})
