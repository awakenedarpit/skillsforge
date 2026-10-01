"""Expiry scheduler. The job body is added with the alerts milestone."""

_scheduler = None


def start_scheduler() -> None:
    return None


def shutdown_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None


def maybe_catchup(db) -> None:
    return None
