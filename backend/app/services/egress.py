"""
Egress gateway: the only path by which data can leave the application to an
external service. All calls MUST go through this module.

Prototype implementation:
- Policy resolution reads from policy_settings table (no hardcoding)
- Sensitive cases always use offline path
- Offline mode: log to egress_ledger and raise EgressBlocked
- Online mode: redact PII, log stub (real HTTP call stubbed for prototype)
- Never fail open: if policy is unclear, default to offline

Production roadmap:
- Real HTTP provider calls here (LLM, email, enrichment)
- VPC-level network controls in addition to app-layer
"""
import re

from sqlalchemy import text

# Simple PII redaction patterns (prototype-level; extend for production)
_PII_PATTERNS = [
    (re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+"), "[email]"),
    (re.compile(r"\b\d{10}\b"), "[phone]"),
    (re.compile(r"\b[A-Z]{5}\d{4}[A-Z]\b"), "[aadhaar_pan]"),
]


def redact(s: str) -> str:
    for pat, rep in _PII_PATTERNS:
        s = pat.sub(rep, s)
    return s


class EgressBlocked(Exception):
    """Raised when an outbound call is blocked by policy."""
    pass


def send(db, *, capability: str, destination: str, payload_kind: str,
         case_ref: str | None, payload: dict, sensitive: bool = False) -> dict:
    """Resolve policy once; persist ledger independently of the caller transaction."""
    from .routing import resolve_route
    from ..db import SessionLocal
    mode = resolve_route(db, capability, sensitive)
    def scrub(value):
        if isinstance(value, str):
            return redact(value)
        if isinstance(value, dict):
            return {key: scrub(item) for key, item in value.items()}
        if isinstance(value, list):
            return [scrub(item) for item in value]
        if isinstance(value, int) and re.fullmatch(r"\d{10}", str(value)):
            return "[phone]"
        return value
    clean = scrub(payload)
    with SessionLocal() as ledger_db:
        ledger_db.execute(text(
            "INSERT INTO egress_ledger (capability,destination,payload_kind,case_ref,mode,redacted,outcome) "
            "VALUES (:c,:d,:k,:r,:mode,TRUE,:outcome)"),
            {"c": capability, "d": destination, "k": payload_kind, "r": case_ref,
             "mode": mode, "outcome": "stub" if mode == "online" else "blocked"})
        ledger_db.commit()
    if mode != "online":
        raise EgressBlocked(capability)
    return clean
