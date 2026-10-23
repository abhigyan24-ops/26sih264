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
