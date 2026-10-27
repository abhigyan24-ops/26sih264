"""
SLA scanner worker. Run as a separate process.

Usage:
    python -m app.worker   (from backend/)

Runs a scan immediately on start, then every 15 minutes.
"""
from datetime import datetime, timedelta
import logging
from typing import Any
from apscheduler.schedulers.blocking import BlockingScheduler

from .db import SessionLocal
from .services.sla import scan_sla

logger = logging.getLogger("app.worker")


def run_once() -> dict[str, Any]:
    """
    Run one SLA scan cycle inside an isolated database session.
    Catches and logs exceptions so the worker loop survives intermittent failures.
    Returns the scan summary dictionary.
    """
    logger.info("Executing SLA scan cycle...")
    try:
        with SessionLocal() as db:
            summary = scan_sla(db)
            logger.info(
                "SLA scan completed: created=%d, by_kind=%s, skipped_dupes=%d",
                summary.get("created", 0),
                summary.get("by_kind", {}),
                summary.get("skipped_dupes", 0),
            )
            print(
                f"SLA scan completed: {summary.get('created', 0)} new alerts created, "
                f"{summary.get('skipped_dupes', 0)} skipped duplicates"
            )
            return summary
    except Exception as exc:
        logger.exception("SLA scan cycle failed: %s", exc)
        print(f"SLA scan error: {exc}")
        return {"created": 0, "by_kind": {}, "skipped_dupes": 0, "error": str(exc)}


def build_scheduler() -> BlockingScheduler:
    """
    Build and configure the APScheduler instance.
    NOTE: In APScheduler 3.x, specifying `next_run_time=None` initializes
    the job in a paused state. We remove `next_run_time=None` and set an explicit
    initial fire time (15 minutes from creation) so the job is active and has
    a valid non-None next_run_time.
    """
    scheduler = BlockingScheduler(timezone="Asia/Kolkata")
    first_run = datetime.now().astimezone() + timedelta(minutes=15)
    scheduler.add_job(run_once, "interval", minutes=15, next_run_time=first_run)
    return scheduler


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    logger.info("SLA worker starting — running initial scan...")
    run_once()

    scheduler = build_scheduler()
    logger.info("SLA scheduler configured (interval: 15 minutes). Starting scheduler...")
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("SLA worker stopped by signal.")


if __name__ == "__main__":
    main()
