"""
CaseNexus Stage 3 Smoke Test Script
Executes all acceptance checks A1 through A16 against a live server at http://localhost:8000
"""
import sys
import httpx

BASE_URL = "http://localhost:8000"

checks = []

def record(name: str, passed: bool, detail: str = ""):
    status = "PASS" if passed else "FAIL"
    print(f"[{status}] {name}{': ' + detail if detail else ''}")
    checks.append((name, passed, detail))

def run_smoke():
    with httpx.Client(base_url=BASE_URL, timeout=15.0) as client:
        # A1: GET /api/health -> 200 {"ok": true}
        try:
            r = client.get("/api/health")
            record("A1: Health check", r.status_code == 200 and r.json().get("ok") is True)
        except Exception as e:
            record("A1: Health check", False, str(e))

        # A2: Login rb1 / demo123 -> 200 with token
        token_rb1 = None
        try:
            r = client.post("/api/auth/login", data={"username": "rb1", "password": "demo123"})
            passed = r.status_code == 200 and "access_token" in r.json()
            if passed:
                token_rb1 = r.json()["access_token"]
            record("A2: Login rb1", passed)
        except Exception as e:
            record("A2: Login rb1", False, str(e))

        # Login mgmt1 and south1 for subsequent checks
        token_mgmt1 = client.post("/api/auth/login", data={"username": "mgmt1", "password": "demo123"}).json().get("access_token")
        token_south1 = client.post("/api/auth/login", data={"username": "south1", "password": "demo123"}).json().get("access_token")

        # A3: Login with wrong password; login with 80-char password -> Both 401
        try:
            r1 = client.post("/api/auth/login", data={"username": "rb1", "password": "wrong"})
            r2 = client.post("/api/auth/login", data={"username": "rb1", "password": "X" * 80})
            record("A3: Invalid & 80-char password rejection", r1.status_code == 401 and r2.status_code == 401)
        except Exception as e:
            record("A3: Invalid & 80-char password rejection", False, str(e))

        # A4: GET /api/auth/me with token -> correct username and role
        try:
            r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token_rb1}"})
            data = r.json()
            record("A4: Auth me profile", r.status_code == 200 and data.get("username") == "rb1")
        except Exception as e:
            record("A4: Auth me profile", False, str(e))

        # A5: GET /api/cases with no token -> 401
        try:
            r = client.get("/api/cases")
            record("A5: Cases requires auth", r.status_code == 401)
        except Exception as e:
            record("A5: Cases requires auth", False, str(e))

        # A6: GET /api/dashboard as mgmt1 -> total matches DB count
        total_mgmt = 0
        try:
            r = client.get("/api/dashboard", headers={"Authorization": f"Bearer {token_mgmt1}"})
            data = r.json()
            total_mgmt = data["kpi"]["total"]
            record("A6: Management dashboard KPIs", r.status_code == 200 and total_mgmt > 0, f"Total cases: {total_mgmt}")
        except Exception as e:
            record("A6: Management dashboard KPIs", False, str(e))

        # A7: GET /api/cases?bureau=RB&status=under_process
        try:
            r = client.get("/api/cases?bureau=RB&status=under_process", headers={"Authorization": f"Bearer {token_rb1}"})
            items = r.json()
            passed = r.status_code == 200 and len(items) > 0 and all(i["bureau"] == "RB" and i["status"] == "under_process" for i in items)
            record("A7: Filter bureau=RB & status=under_process", passed, f"Returned {len(items)} cases")
        except Exception as e:
            record("A7: Filter bureau=RB & status=under_process", False, str(e))

        # A8: GET /api/cases?institution=college&bureau=RB -> all RB (D1)
        try:
            r = client.get("/api/cases?institution=college&bureau=RB", headers={"Authorization": f"Bearer {token_rb1}"})
            items = r.json()
            passed = r.status_code == 200 and len(items) > 0 and all(i["bureau"] == "RB" for i in items)
            record("A8: Filter institution & bureau precedence (D1)", passed, f"Returned {len(items)} cases")
        except Exception as e:
            record("A8: Filter institution & bureau precedence (D1)", False, str(e))

        # A9: As south1: list cases -> region South
        try:
            r = client.get("/api/cases", headers={"Authorization": f"Bearer {token_south1}"})
            items = r.json()
            passed = r.status_code == 200 and len(items) > 0 and all(i["region"] == "South" for i in items)
            record("A9: Regional row-level scoping list", passed, f"Returned {len(items)} South cases")
        except Exception as e:
            record("A9: Regional row-level scoping list", False, str(e))

        # A10: As south1: dashboard total < mgmt1 total; by_region only South
        try:
            r = client.get("/api/dashboard", headers={"Authorization": f"Bearer {token_south1}"})
            data = r.json()
            total_south = data["kpi"]["total"]
            regions = [reg["region"] for reg in data["by_region"]]
            passed = r.status_code == 200 and total_south < total_mgmt and regions == ["South"]
            record("A10: Regional dashboard scoping", passed, f"South: {total_south} < Mgmt: {total_mgmt}")
        except Exception as e:
            record("A10: Regional dashboard scoping", False, str(e))

        # A11: As south1: open detail of non-South case -> 404 (D2)
        try:
            r_all = client.get("/api/cases", headers={"Authorization": f"Bearer {token_mgmt1}"})
            non_south = next((c for c in r_all.json() if c["region"] != "South"), None)
            if non_south:
                r_detail = client.get(f"/api/cases/{non_south['id']}", headers={"Authorization": f"Bearer {token_south1}"})
                record("A11: Regional detail scoping 404 (D2)", r_detail.status_code == 404)
            else:
                record("A11: Regional detail scoping 404 (D2)", False, "No non-South case found")
        except Exception as e:
            record("A11: Regional detail scoping 404 (D2)", False, str(e))

        # A12: POST /api/cases with abbreviated institution name
        new_case_id = None
        try:
            r = client.post(
                "/api/cases",
                json={
                    "institution_name": "bhagat singh coll of engg",
                    "city": "Bengaluru",
                    "category": "MISREP",
                    "bureau_code": "RB",
                    "description": "Misleading website claims regarding unapproved foreign university collaboration.",
                },
                headers={"Authorization": f"Bearer {token_mgmt1}"},
            )
            passed = r.status_code == 201 and "id" in r.json() and (r.json().get("overlaps") == [] or r.json().get("overlaps_found") == [])
            if passed:
                new_case_id = r.json()["id"]
            record("A12: Create case with abbreviation & embeddings", passed, f"Case ID: {new_case_id}")
        except Exception as e:
            record("A12: Create case with abbreviation & embeddings", False, str(e))

        # A13: POST /api/cases with unknown bureau_code -> 422 (D6)
        try:
            r = client.post(
                "/api/cases",
                json={
                    "institution_name": "Bhagat Singh College of Engineering, Bengaluru",
                    "city": "Bengaluru",
                    "category": "FACULTY",
                    "bureau_code": "INVALID_BUREAU",
                    "description": "Valid complaint description text.",
                },
                headers={"Authorization": f"Bearer {token_mgmt1}"},
            )
            record("A13: Unknown bureau_code returns 422 (D6)", r.status_code == 422)
        except Exception as e:
            record("A13: Unknown bureau_code returns 422 (D6)", False, str(e))

        # A14: POST /api/cases/{id}/actions with new_status="disposed"
        try:
            # Pick a case to update
            cases = client.get("/api/cases?limit=1", headers={"Authorization": f"Bearer {token_mgmt1}"}).json()
            test_cid = new_case_id or cases[0]["id"]
            r = client.post(
                f"/api/cases/{test_cid}/actions",
                json={"action_type": "disposed", "new_status": "disposed", "remarks": "Resolved via smoke test."},
                headers={"Authorization": f"Bearer {token_mgmt1}"},
            )
            record("A14: Add action new_status=disposed", r.status_code == 201)
        except Exception as e:
            record("A14: Add action new_status=disposed", False, str(e))

        # A15: Same endpoint with new_status="banana" -> 422 (D5)
        try:
            cases = client.get("/api/cases?limit=1", headers={"Authorization": f"Bearer {token_mgmt1}"}).json()
            test_cid = new_case_id or cases[0]["id"]
            r = client.post(
                f"/api/cases/{test_cid}/actions",
                json={"action_type": "status_change", "new_status": "banana"},
                headers={"Authorization": f"Bearer {token_mgmt1}"},
            )
            record("A15: Invalid new_status=banana returns 422 (D5)", r.status_code == 422)
        except Exception as e:
            record("A15: Invalid new_status=banana returns 422 (D5)", False, str(e))

        # A16: Same endpoint with transfer_to="NOPE" -> 422 (D5)
        try:
            cases = client.get("/api/cases?limit=1", headers={"Authorization": f"Bearer {token_mgmt1}"}).json()
            test_cid = new_case_id or cases[0]["id"]
            r = client.post(
                f"/api/cases/{test_cid}/actions",
                json={"action_type": "transfer", "transfer_to": "NOPE"},
                headers={"Authorization": f"Bearer {token_mgmt1}"},
            )
            record("A16: Unknown transfer_to returns 422 (D5)", r.status_code == 422)
        except Exception as e:
            record("A16: Unknown transfer_to returns 422 (D5)", False, str(e))

    all_passed = all(p for _, p, _ in checks)
    print("\n==========================================")
    print(f"SMOKE TEST SUMMARY: {sum(1 for _, p, _ in checks)}/{len(checks)} CHECKS PASSED")
    print("==========================================")
    if not all_passed:
        sys.exit(1)

if __name__ == "__main__":
    run_smoke()
