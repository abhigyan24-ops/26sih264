"""
SLA scanner worker. Run as a separate process.

Usage:
    python -m app.worker   (from backend/)

Runs a scan immediately on start, then every 15 minutes.
"""
from apscheduler.schedulers.blocking import BlockingScheduler

from .db import SessionLocal
from .services.sla import scan_sla


def job():
    with SessionLocal() as db:
        created = scan_sla(db)
        print(f"SLA scan completed: {created} new alerts created")


if __name__ == "__main__":
    s = BlockingScheduler(timezone="Asia/Kolkata")
    s.add_job(job, "interval", minutes=15)
    print("SLA worker starting — running initial scan...")
    job()  # run once at start
    s.start()
