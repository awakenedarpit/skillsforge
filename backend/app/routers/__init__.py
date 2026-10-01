"""HTTP routes."""

from fastapi import APIRouter, Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.envelope import ok
from app.db import get_db

router = APIRouter()


def db_status(db: Session) -> str:
    try:
        db.execute(text("SELECT 1"))
        return "up"
    except Exception:
        return "down"


@router.get("/health")
def health(db: Session = Depends(get_db)):
    state = db_status(db)
    return ok({"ok": state == "up", "db": state, "version": get_settings().app_version})


def register(app: FastAPI) -> None:
    app.include_router(router, prefix="/api")
