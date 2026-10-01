"""Engine and session factory. Configured only by DATABASE_URL."""

from collections.abc import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import BACKEND_DIR, get_settings

Base = declarative_base()

_engine: Engine | None = None
_SessionFactory: sessionmaker[Session] | None = None


def normalize_database_url(url: str) -> str:
    """Rewrite postgres schemes and anchor relative SQLite paths to /backend."""
    if url.startswith("postgres://"):
        url = "postgresql+psycopg://" + url[len("postgres://") :]
    elif url.startswith("postgresql+psycopg2://"):
        url = "postgresql+psycopg://" + url[len("postgresql+psycopg2://") :]
    elif url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://") :]

    if url.startswith("sqlite:///"):
        raw = url[len("sqlite:///") :]
        if raw.startswith(":memory:") or raw.startswith("file:"):
            return url
        from pathlib import Path

        path = Path(raw)
        if not path.is_absolute():
            path = (BACKEND_DIR / path).resolve()
        return "sqlite:///" + path.as_posix()
    return url


def configure_engine(url: str | None = None) -> Engine:
    global _engine, _SessionFactory
    if _engine is not None:
        _engine.dispose()
    raw = url or get_settings().database_url
    normalized = normalize_database_url(raw)
    connect_args: dict = {}
    kwargs: dict = {}
    if normalized.startswith("sqlite"):
        connect_args["check_same_thread"] = False
        if ":memory:" in normalized:
            kwargs["poolclass"] = StaticPool
    engine = create_engine(normalized, connect_args=connect_args, **kwargs)

    @event.listens_for(engine, "connect")
    def _enable_sqlite_fk(dbapi_conn, _record) -> None:  # pragma: no cover - driver hook
        if engine.dialect.name == "sqlite":
            cursor = dbapi_conn.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    _engine = engine
    _SessionFactory = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    return engine


def get_engine() -> Engine:
    if _engine is None:
        configure_engine()
    assert _engine is not None
    return _engine


def SessionFactory() -> Session:
    if _SessionFactory is None:
        configure_engine()
    assert _SessionFactory is not None
    return _SessionFactory()


def get_db() -> Generator[Session, None, None]:
    db = SessionFactory()
    try:
        yield db
    finally:
        db.close()
