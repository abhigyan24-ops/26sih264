"""
Unit and integration tests for the SLA worker background scheduler (T31).
"""
from unittest.mock import patch
from app.worker import build_scheduler, run_once


def test_scheduler_configuration_has_active_job():
    """Verify scheduler builds with one active job and valid non-None next_run_time."""
    scheduler = build_scheduler()
    jobs = scheduler.get_jobs()
    assert len(jobs) == 1, "Expected exactly 1 job configured in SLA scheduler"
    job = jobs[0]
    assert job.next_run_time is not None, (
        "next_run_time must not be None (ensuring job is active, not paused)"
    )
    assert job.name == "run_once" or "run_once" in str(job.func)


def test_worker_run_once_execution():
    """Verify run_once executes scan_sla and returns summary dictionary."""
    summary = run_once()
    assert isinstance(summary, dict)
    assert "created" in summary
    assert "by_kind" in summary
    assert "skipped_dupes" in summary


def test_worker_run_once_exception_resilience():
    """Verify run_once catches exceptions and returns error dict without crashing process."""
    with patch("app.worker.scan_sla", side_effect=RuntimeError("Simulated DB timeout")):
        result = run_once()
        assert isinstance(result, dict)
        assert result.get("created") == 0
        assert "Simulated DB timeout" in result.get("error", "")
