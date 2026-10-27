import io
from openpyxl import load_workbook
from sqlalchemy import text


def headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_ageing_totals_and_regional_scope(client, token_mgmt1, token_south1, db_session):
    all_rows = client.get("/api/reports/bureau-wise", headers=headers(token_mgmt1)).json()
    south = client.get("/api/reports/bureau-wise", headers=headers(token_south1)).json()
    assert sum(row["total"] for row in south) <= sum(row["total"] for row in all_rows)
    regions = client.get("/api/reports/region-wise", headers=headers(token_south1)).json()
    assert regions and {row["region"] for row in regions} == {"South"}
    for token, region in ((token_mgmt1, None), (token_south1, "South")):
        result = client.get("/api/reports/ageing", headers=headers(token))
        assert result.status_code == 200
        expected = db_session.execute(text("SELECT count(*) FROM cases c JOIN institutions i ON i.id=c.institution_id WHERE c.closed_date IS NULL" + (" AND i.region=:region" if region else "")), {"region":region}).scalar()
        assert sum(row["n"] for row in result.json()) == expected
        assert {row["bucket"] for row in result.json()} <= {"0-15","16-30","31-60","61-90","90+"}


def test_exports_equal_json_and_open(client, token_mgmt1, token_south1):
    for token in (token_mgmt1, token_south1):
        h = headers(token)
        rows = client.get("/api/reports/bureau-wise", headers=h).json()
        xlsx = client.get("/api/reports/bureau.xlsx", headers=h)
        assert xlsx.status_code == 200
        workbook = load_workbook(io.BytesIO(xlsx.content), read_only=True)
        table = list(workbook.active.values)
        assert table[0] == ("Bureau/Cell","Total","Open","Disposed","Overdue")
        assert table[1:] == [tuple(row[key] for key in ("bureau","total","open","disposed","overdue")) for row in rows]
        workbook.close()
        pdf = client.get("/api/reports/bureau.pdf", headers=h)
        assert pdf.status_code == 200 and pdf.content.startswith(b"%PDF")


def test_dates_period_empty_and_history_scope(client, token_mgmt1, token_south1, db_session):
    h = headers(token_mgmt1)
    institution = db_session.execute(text("SELECT id FROM institutions WHERE region<>'South' LIMIT 1")).scalar_one()
    assert client.get(f"/api/reports/institution/{institution}", headers=headers(token_south1)).json() == []
    endpoints = ["bureau-wise","region-wise",f"institution/{institution}","ageing","disposal-rate","overlaps","trend"]
    for endpoint in endpoints:
        path = "/api/reports/" + endpoint
        response = client.get(path, headers=h)
        assert response.status_code == 200, response.text
        assert client.get(path, headers=h, params={"date_from":"2999-01-01"}).json() == []
        assert client.get(path, headers=h, params={"date_from":"bad"}).status_code == 422
        assert client.get(path, headers=h, params={"date_from":"2026-02-01","date_to":"2026-01-01"}).status_code == 422
    assert client.get("/api/reports/trend", headers=h, params={"period":"quarter"}).status_code == 200
    assert client.get("/api/reports/trend", headers=h, params={"period":"year"}).status_code == 422
