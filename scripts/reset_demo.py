"""Reset one explicitly named local demo database using the backend environment."""
import argparse
import logging
import os
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
log = logging.getLogger("reset_demo")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", required=True, help="Exact configured local demo DB name")
    parser.add_argument("--retrain", action="store_true")
    args = parser.parse_args()
    os.chdir(BACKEND)
    sys.path.insert(0, str(BACKEND))
    from app.config import settings
    from sqlalchemy.engine import make_url
    url = make_url(settings.database_url)
    if url.host not in ("localhost", "127.0.0.1") or url.database != args.database:
        parser.error("Database must match the configured local database")
    if not re.fullmatch(r"aicte(?:_l[0-9]+)?", args.database):
        parser.error("Only the aicte demo database or an aicte_lN lane is supported")
    log.info("Resetting synthetic demo data in %s", args.database)
    for migration in sorted((ROOT / "db" / "migrations").glob("[0-9]*.sql")):
        from app.db import engine
        with engine.begin() as conn:
            conn.exec_driver_sql(migration.read_text(encoding="utf-8"))
    from app.db import engine
    from sqlalchemy import text
    subprocess.run([sys.executable, "-m", "scripts.seed"], check=True)
    # Seed truncates officers and cascades policy rows; demo always restarts offline.
    with engine.begin() as conn:
        conn.execute(text("INSERT INTO policy_settings(scope,value) VALUES('global','offline') "
                          "ON CONFLICT(scope) DO UPDATE SET value='offline'"))
    if args.retrain:
        subprocess.run([sys.executable, "-m", "ml.tune_resolver"], check=True)
        subprocess.run([sys.executable, "-m", "ml.train_overlap"], check=True)
    elif not (BACKEND / "ml" / "artifacts" / "ACTIVE").exists():
        parser.error("No active model; rerun with --retrain")
    subprocess.run([sys.executable, "-m", "scripts.scan_all", "--rebuild"], check=True)
    log.info("Demo: login rb1/demo123; dashboard; select an institution with open PGRC case; "
             "register same-issue RB complaint; inspect High overlap; link with RB lead and hold; "
             "check both timelines and alerts; show a hard negative; SLA/reports; "
             "toggle offline and verify sensitive cases stay local. All data is synthetic.")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    main()
