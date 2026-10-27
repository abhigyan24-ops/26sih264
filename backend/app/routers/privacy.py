from typing import Literal
from fastapi import APIRouter, Depends, Query, Response
from pydantic import BaseModel
from sqlalchemy import text
from ..db import get_db
from ..auth import current_user, require_roles
from ..services.audit import write_audit
from ..services.routing import CAPABILITIES, get_setting, resolve_route

router = APIRouter(prefix="/api", tags=["privacy"])


class PolicyIn(BaseModel):
    scope: Literal["global", "email", "explain", "enrich"]
    value: Literal["online", "offline"]


@router.get("/policy")
def get_policy(db=Depends(get_db), user=Depends(current_user)):
    rows = db.execute(text("SELECT scope,value,changed_at FROM policy_settings ORDER BY scope")).mappings()
    return {"settings": [dict(row) for row in rows]}


@router.put("/policy")
def set_policy(body: PolicyIn, db=Depends(get_db), user=Depends(require_roles("admin"))):
    db.execute(text("INSERT INTO policy_settings (scope,value,changed_by) VALUES (:s,:v,:u) "
                    "ON CONFLICT (scope) DO UPDATE SET value=:v,changed_by=:u,changed_at=now()"),
               {"s": body.scope, "v": body.value, "u": user["id"]})
    write_audit(db, user["id"], "policy_change", "policy", body.scope, {"value": body.value})
    db.commit()
    return {"ok": True}


@router.get("/policy/status")
def policy_status(db=Depends(get_db), user=Depends(current_user)):
    global_mode = get_setting(db, "global")
    capabilities = {name: resolve_route(db, name) for name in CAPABILITIES}
    return {"global": "online" if global_mode == "online" else "offline",
            "capabilities": capabilities,
            "no_external_calls": all(mode == "offline" for mode in capabilities.values())}


@router.get("/egress-ledger")
def ledger(response: Response, limit: int = Query(50, ge=1, le=200),
           offset: int = Query(0, ge=0), db=Depends(get_db),
           user=Depends(require_roles("admin", "management"))):
    response.headers["X-Total-Count"] = str(db.execute(text("SELECT count(*) FROM egress_ledger")).scalar())
    return [dict(row) for row in db.execute(text("SELECT * FROM egress_ledger "
                "ORDER BY created_at DESC,id DESC LIMIT :l OFFSET :o"), {"l": limit, "o": offset}).mappings()]
