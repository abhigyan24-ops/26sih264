"""
Parameter registry helper.

get_param reads the newest value for a named parameter from parameter_registry
and returns it as a float, falling back to `default` if no row exists.

Results are cached in-process for 60 seconds to avoid hitting the DB on every scan.

Real parameter_registry columns (from \d+ parameter_registry):
  id             bigint (identity)
  parameter      text NOT NULL
  value          text NOT NULL
  origin         text NOT NULL  CHECK (origin IN ('learned','learned_synthetic','policy','default_pending_data'))
  derived_from   text
  metrics        jsonb
  model_version  text
  approved_by    bigint (FK → officers.id)
  created_at     timestamptz NOT NULL DEFAULT now()
"""
import time
from sqlalchemy import text

_cache: dict[str, tuple[float, float]] = {}   # name → (value_float, expires_at)
_TTL = 60.0   # seconds


def get_param(db, name: str, default: float) -> float:
    """
    Return the most recently inserted value for `name` in parameter_registry
    as a float.  Falls back to `default` when no row exists.
    Results are cached for 60 seconds.
    """
    now = time.monotonic()
    cached = _cache.get(name)
    if cached is not None and now < cached[1]:
        return cached[0]

    row = db.execute(
        text(
            """
            SELECT value FROM parameter_registry
            WHERE parameter = :n
            ORDER BY created_at DESC
            LIMIT 1
            """
        ),
        {"n": name},
    ).scalar()

    result: float
    if row is None:
        result = default
    else:
        try:
            result = float(row)
        except (TypeError, ValueError):
            result = default

    _cache[name] = (result, now + _TTL)
    return result


def invalidate_cache(name: str | None = None) -> None:
    """Invalidate a specific parameter or the entire cache."""
    if name is None:
        _cache.clear()
    else:
        _cache.pop(name, None)
