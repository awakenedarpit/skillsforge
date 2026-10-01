"""Demo seed. M0 provides a no-op so startup can call it; M2 fills in the data."""

from sqlalchemy.orm import Session


def seed_if_empty(db: Session) -> bool:
    return False
