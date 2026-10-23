import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.main import app
from app.db import SessionLocal


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


def login_token(client: TestClient, username: str, password: str = "demo123") -> str:
    resp = client.post(
        "/api/auth/login",
        data={"username": username, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 200, f"Login failed for {username}: {resp.text}"
    return resp.json()["access_token"]


@pytest.fixture(scope="session")
def token_rb1(client: TestClient):
    return login_token(client, "rb1")


@pytest.fixture(scope="session")
def token_mgmt1(client: TestClient):
    return login_token(client, "mgmt1")


@pytest.fixture(scope="session")
def token_south1(client: TestClient):
    return login_token(client, "south1")


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
