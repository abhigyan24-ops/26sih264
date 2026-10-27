"""
Tests for the Online/Offline mode router.
These tests prove the routing guarantee without needing a database.

Policy precedence (strictest wins):
  1. sensitive=True → always offline
  2. per-capability override beats global
  3. global applies when no override
"""
from app.services.routing import resolve_route


class FakeDB:
    """Minimal fake DB returning values from a policy dict."""
    def __init__(self, settings: dict):
        self._s = settings

    def execute(self, query, params=None):
        key = (params or {}).get("s") or (params or {}).get("c")
        return _FakeResult(self._s.get(key))


class _FakeResult:
    def __init__(self, val):
        self._val = val

    def scalar(self):
        return self._val


# ── Test cases ────────────────────────────────────────────────────────────────

def test_sensitive_case_forces_offline_regardless_of_global():
    """Per-case sensitivity must beat global=online."""
    db = FakeDB({"global": "online"})
    assert resolve_route(db, "explain", sensitive=True) == "offline"


def test_sensitive_case_forces_offline_even_with_capability_online():
    """Per-case sensitivity beats per-capability override."""
    db = FakeDB({"global": "online", "explain": "online"})
    assert resolve_route(db, "explain", sensitive=True) == "offline"


def test_capability_override_beats_global():
    """Per-capability offline beats global=online."""
    db = FakeDB({"global": "online", "explain": "offline"})
    assert resolve_route(db, "explain", sensitive=False) == "offline"


def test_capability_override_online_beats_global_offline():
    """Per-capability online beats global=offline."""
    db = FakeDB({"global": "offline", "explain": "online"})
    assert resolve_route(db, "explain", sensitive=False) == "online"


def test_global_applies_when_no_capability_override():
    """Global mode applies when no per-capability setting exists."""
    db = FakeDB({"global": "online"})
    assert resolve_route(db, "email", sensitive=False) == "online"


def test_global_offline_applies_when_no_override():
    db = FakeDB({"global": "offline"})
    assert resolve_route(db, "enrich", sensitive=False) == "offline"


def test_defaults_to_offline_when_no_settings():
    """When no settings exist, fail closed (offline)."""
    db = FakeDB({})
    assert resolve_route(db, "explain", sensitive=False) == "offline"


def test_unknown_values_fail_closed():
    assert resolve_route(FakeDB({"global": "typo"}), "explain") == "offline"
    assert resolve_route(FakeDB({"global": "online", "explain": "typo"}), "explain") == "offline"
    assert resolve_route(FakeDB({"global": "online"}), "unknown") == "offline"


def test_breaker_success_and_cooldown(monkeypatch):
    from app.services import routing
    routing._fail.clear()
    routing._retry_at.clear()
    now = [10.0]
    monkeypatch.setattr(routing.time, "monotonic", lambda: now[0])
    def fail(*args, **kwargs):
        raise RuntimeError("provider unavailable")
    monkeypatch.setattr(routing, "llm_explanation", fail)
    db = FakeDB({"global": "online"})
    for _ in range(3):
        assert routing.explain_overlap(db, {}, {}, {})[1] == "template"
    monkeypatch.setattr(routing, "llm_explanation", lambda *args, **kwargs: "recovered")
    assert routing.explain_overlap(db, {}, {}, {})[1] == "template"
    now[0] += routing.COOLDOWN_SECONDS + 1
    assert routing.explain_overlap(db, {}, {}, {}) == ("recovered", "llm")
    assert routing._fail["explain"] == 0
    routing._fail["explain"] = 2
    assert routing.explain_overlap(db, {}, {}, {})[1] == "llm"
    assert routing._fail["explain"] == 0
    routing._retry_at.clear()
