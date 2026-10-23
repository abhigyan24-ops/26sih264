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
import json
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


def send(
    db,
    *,
    capability: str,
    destination: str,
    payload_kind: str,
    case_ref: str | None,
    payload: dict,
) -> dict:
    """
    Attempt to send data to an external service.

    Policy precedence (strictest wins):
      per-case sensitivity > per-capability setting > global mode

    sensitive parameter is handled by the caller (resolve_route) before calling send().
    """
    global_mode = db.execute(
        text("SELECT value FROM policy_settings WHERE scope='global'")
    ).scalar() or "offline"

    cap_mode = (
        db.execute(
            text("SELECT value FROM policy_settings WHERE scope=:c"),
            {"c": capability},
        ).scalar()
        or global_mode
    )

    if cap_mode == "offline":
        db.execute(
            text(
                "INSERT INTO egress_ledger "
                "(capability,destination,payload_kind,case_ref,mode,redacted,outcome) "
                "VALUES (:c,:d,:k,:r,'offline',TRUE,'blocked')"
            ),
            {"c": capability, "d": destination, "k": payload_kind, "r": case_ref},
        )
        db.commit()
        raise EgressBlocked(capability)

    # Online path: redact before sending
    clean = json.loads(redact(json.dumps(payload)))

    # Prototype: stub. Wire a real provider here when required.
    db.execute(
        text(
            "INSERT INTO egress_ledger "
            "(capability,destination,payload_kind,case_ref,mode,redacted,outcome) "
            "VALUES (:c,:d,:k,:r,'online',TRUE,'stub')"
        ),
        {"c": capability, "d": destination, "k": payload_kind, "r": case_ref},
    )
    db.commit()
    return clean
