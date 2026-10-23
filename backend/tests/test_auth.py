from fastapi.testclient import TestClient


def test_a1_health(client: TestClient):
    """A1: GET /api/health -> 200 {"ok": true}"""
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json().get("ok") is True


def test_a2_login_rb1(client: TestClient):
    """A2: Login rb1 / demo123 -> 200 with token"""
    resp = client.post(
        "/api/auth/login",
        data={"username": "rb1", "password": "demo123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_a3_login_invalid_and_long_password(client: TestClient):
    """A3: Login with wrong password; login with an 80-character password -> Both 401, never 500 (D4)"""
    resp_wrong = client.post(
        "/api/auth/login",
        data={"username": "rb1", "password": "wrong_password_here"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp_wrong.status_code == 401

    long_password = "A" * 80
    resp_long = client.post(
        "/api/auth/login",
        data={"username": "rb1", "password": long_password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp_long.status_code == 401


def test_a4_auth_me(client: TestClient, token_rb1: str):
    """A4: GET /api/auth/me with the token -> Correct username and role"""
    resp = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token_rb1}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["username"] == "rb1"
    assert data["role"] in ("officer", "bureau_officer", "bureau_head", "admin", "management")


def test_a5_cases_no_token(client: TestClient):
    """A5: GET /api/cases with no token -> 401"""
    resp = client.get("/api/cases")
    assert resp.status_code == 401
