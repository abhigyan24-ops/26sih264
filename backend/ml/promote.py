"""Atomic active-model publication with a database and filesystem boundary."""
import argparse
from contextlib import contextmanager
import json
import os
from pathlib import Path
import re
import tempfile
import joblib
from sqlalchemy import text
from app.db import engine
from app.services.features import FEATURES

ART = Path(__file__).resolve().parent / "artifacts"


def write_active_pointer(version):
    ART.mkdir(parents=True, exist_ok=True)
    descriptor, name = tempfile.mkstemp(prefix=".ACTIVE-", dir=ART)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
            stream.write(version)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(name, ART / "ACTIVE")
    finally:
        if os.path.exists(name):
            os.unlink(name)


@contextmanager
def publication_connection():
    # Session lock survives commit and serializes pointer publication as well as DB changes.
    with engine.connect() as connection:
        connection.execute(text("SELECT pg_advisory_lock(60050)"))
        connection.commit()
        try:
            yield connection
        finally:
            connection.rollback()
            connection.execute(text("SELECT pg_advisory_unlock(60050)"))
            connection.commit()


def activate(version=None, officer_id=None, rollback=False):
    with publication_connection() as connection:
        with connection.begin():
            if rollback:
                version = connection.execute(text("SELECT detail->>'previous' FROM audit_log "
                    "WHERE action IN ('model_promote','model_rollback') ORDER BY id DESC LIMIT 1")).scalar()
                if not version:
                    raise ValueError("No previous model is available")
            if not version or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,127}", version):
                raise ValueError("Invalid model version")
            target = connection.execute(text("SELECT id,status FROM model_versions WHERE id=:v AND kind='overlap' FOR UPDATE"), {"v": version}).mappings().first()
            if not target:
                raise ValueError("Model version not found")
            artifact = joblib.load(ART / f"{version}.joblib")
            if artifact.get("features") != FEATURES or artifact.get("version") != version:
                raise ValueError("Model artifact does not match the registered version/features")
            previous = connection.execute(text("SELECT id FROM model_versions WHERE status='active' FOR UPDATE")).scalar()
            if previous != version:
                connection.execute(text("UPDATE model_versions SET status='retired' WHERE status='active'"))
                connection.execute(text("UPDATE model_versions SET status='active' WHERE id=:v"), {"v": version})
                connection.execute(text("INSERT INTO audit_log(actor_id,action,entity,entity_id,detail) "
                    "VALUES(:u,:action,'model',:v,CAST(:detail AS jsonb))"),
                    {"u": officer_id, "action": "model_rollback" if rollback else "model_promote", "v": version,
                     "detail": json.dumps({"previous": previous, "version": version})})
        # Only publish after the DB transaction committed; the session lock is still held.
        write_active_pointer(version)
    return {"version": version, "previous": previous}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("version", nargs="?")
    parser.add_argument("--rollback", action="store_true")
    options = parser.parse_args()
    result = activate(options.version, rollback=options.rollback)
    import logging
    logging.basicConfig(level=logging.INFO)
    logging.info("Published model %s", result)
