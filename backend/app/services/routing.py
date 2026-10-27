"""
Online/Offline mode router.

Precedence (strictest wins):
  1. Case sensitivity flag → always offline
  2. Per-capability policy_settings override
  3. Global policy_settings

Providers:
  - template_explanation: OFFLINE, deterministic, always available
  - llm_explanation: ONLINE stub (wire a real LLM if/when approved)

The circuit breaker (_fail counter) ensures a failing online provider
falls back to local, never propagating errors to the user.
"""
import math
import time
from sqlalchemy import text

from . import egress


CAPABILITIES = ("email", "explain", "enrich")
_retry_at: dict[str, float] = {}
COOLDOWN_SECONDS = 300
_fail: dict[str, int] = {}   # simple in-process circuit breaker counters


def get_setting(db, scope: str) -> str | None:
    return db.execute(
        text("SELECT value FROM policy_settings WHERE scope=:s"), {"s": scope}
    ).scalar()


def resolve_route(db, capability: str, sensitive: bool = False) -> str:
    """
    Return 'online' or 'offline'.
    Sensitive cases override everything → always offline.
    """
    if sensitive or capability not in CAPABILITIES:
        return "offline"
    override = get_setting(db, capability)
    selected = override if override is not None else get_setting(db, "global")
    return "online" if selected == "online" else "offline"


# ── Offline provider (always available) ─────────────────────────────────────

def template_explanation(breakdown: dict, a: dict, b: dict) -> str:
    """Deterministic text explanation from the feature breakdown."""
    if not breakdown:
        return (
            "Same institution; similarity estimated from complaint text only "
            "(model not yet trained on real data)."
        )
    parts = []
    cos = breakdown.get("cos", {}).get("value")
    if cos is not None:
        parts.append(f"complaint text {cos:.0%} similar")
    if breakdown.get("same_category", {}).get("value") == 1.0:
        parts.append("same complaint category")
    log_d = breakdown.get("log_days", {}).get("value")
    if log_d is not None:
        days = round(math.expm1(log_d))
        parts.append(f"received about {days} days apart")
    if breakdown.get("cross_bureau", {}).get("value") == 1.0:
        parts.append("handled by different Bureaus/Cells")
    if not parts:
        return "Same institution; no detailed feature breakdown available."
    return "Same institution; " + ", ".join(parts) + "."


# ── Online provider (stub) ───────────────────────────────────────────────────

def llm_explanation(db, breakdown: dict, a: dict, b: dict, sensitive: bool = False) -> str:
    """Online stub: goes through the egress gateway. Wire a real LLM here."""
    payload = {"breakdown": breakdown}
    egress.send(
        db,
        capability="explain",
        destination="llm.example (stub)",
        payload_kind="overlap_summary",
        case_ref=None,
        payload=payload,
        sensitive=sensitive,
    )
    # Stub returns the template explanation with a marker
    return template_explanation(breakdown, a, b) + " [LLM stub]"


# ── Router ───────────────────────────────────────────────────────────────────

def explain_overlap(
    db, breakdown: dict, a: dict, b: dict, sensitive: bool = False
) -> tuple[str, str]:
    """
    Return (explanation_text, source) where source is 'template' or 'llm'.
    Fails to local (template) on any online provider error — never fails open.
    """
    route = resolve_route(db, "explain", sensitive)
    if _fail.get("explain", 0) >= 3 and time.monotonic() >= _retry_at.get("explain", 0):
        _fail["explain"] = 0
    if route == "online" and _fail.get("explain", 0) < 3:
        try:
            explanation = llm_explanation(db, breakdown, a, b, sensitive=sensitive)
            _fail["explain"] = 0
            _retry_at.pop("explain", None)
            return explanation, "llm"
        except Exception:
            _fail["explain"] = _fail.get("explain", 0) + 1
            if _fail["explain"] >= 3:
                _retry_at["explain"] = time.monotonic() + COOLDOWN_SECONDS
    return template_explanation(breakdown, a, b), "template"
