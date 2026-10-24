from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import text

from .config import settings
from .db import get_db

oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except ValueError:
        return False


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def make_token(officer_id: int, role: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_minutes)
    return jwt.encode(
        {"sub": str(officer_id), "role": role, "exp": exp},
        settings.jwt_secret,
        settings.jwt_alg,
    )


def current_user(token: str = Depends(oauth2), db=Depends(get_db)):
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_alg]
        )
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    row = db.execute(
        text(
            "SELECT id, username, full_name, role, bureau_id, region "
            "FROM officers WHERE id=:i AND active"
        ),
        {"i": int(payload["sub"])},
    ).mappings().first()
    if not row:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Unknown user")
    return dict(row)


def require_roles(*roles: str):
    def dep(user=Depends(current_user)):
        if user["role"] not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not allowed")
        return user
    return dep


def scope_clause(user: dict, table_alias: str = "i") -> tuple[str, dict]:
    """Row-level scoping: regional officers see only their region's institutions."""
    if user["role"] == "regional" and user.get("region"):
        return f" AND {table_alias}.region = :scope_region", {"scope_region": user["region"]}
    return "", {}
