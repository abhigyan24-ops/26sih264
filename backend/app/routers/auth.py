from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import text

from ..db import get_db
from ..auth import verify_password, make_token, current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db=Depends(get_db)):
    row = db.execute(
        text(
            "SELECT id, password_hash, role FROM officers "
            "WHERE username=:u AND active"
        ),
        {"u": form.username},
    ).first()
    if not row or not verify_password(form.password, row.password_hash):
        raise HTTPException(401, "Invalid credentials")
    return {
        "access_token": make_token(row.id, row.role),
        "token_type": "bearer",
    }


@router.get("/me")
def me(user=Depends(current_user)):
    return user
