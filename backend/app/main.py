"""FastAPI application. Tables, optional seed, and the expiry scheduler start here."""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from app.core.config import ROOT_DIR, get_settings
from app.core.envelope import fail
from app.core.errors import AppError
from app.db import Base, SessionFactory, configure_engine, get_engine

logger = logging.getLogger("skillmatrix")
DIST_DIR = ROOT_DIR / "frontend" / "dist"


def _scheduler_wanted() -> bool:
    # pytest sets this for the duration of each test, including fixtures.
    if os.environ.get("PYTEST_CURRENT_TEST"):
        return False
    return os.environ.get("SCHEDULER_ENABLED", "true").lower() not in {"0", "false", "no"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_engine()
    # Import models so metadata is populated before create_all.
    import app.models  # noqa: F401

    Base.metadata.create_all(bind=get_engine())
    settings = get_settings()
    if settings.auto_seed:
        from app.seed import seed_if_empty

        db = SessionFactory()
        try:
            seed_if_empty(db)
            db.commit()
        finally:
            db.close()
    if _scheduler_wanted():
        from app.jobs import maybe_catchup, start_scheduler

        start_scheduler()
        db = SessionFactory()
        try:
            maybe_catchup(db)
            db.commit()
        finally:
            db.close()
    yield
    if _scheduler_wanted():
        from app.jobs import shutdown_scheduler

        shutdown_scheduler()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Operator Skill Matrix", version=settings.app_version, lifespan=lifespan)

    origins = [item.strip() for item in settings.cors_origins.split(",") if item.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins or ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    from app.routers import register

    register(app)

    @app.exception_handler(AppError)
    async def _app_error(_request: Request, exc: AppError) -> JSONResponse:
        return fail(exc.message, exc.code, exc.status_code, exc.details)

    @app.exception_handler(RequestValidationError)
    async def _validation(_request: Request, exc: RequestValidationError) -> JSONResponse:
        details = []
        for item in exc.errors():
            details.append(
                {
                    "loc": [str(part) for part in item.get("loc", [])],
                    "msg": str(item.get("msg", "")),
                    "type": str(item.get("type", "")),
                }
            )
        return fail("Validation failed", "VALIDATION_ERROR", 422, {"errors": details})

    @app.exception_handler(Exception)
    async def _unexpected(_request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled error")
        return fail("Unexpected error", "INTERNAL_ERROR", 500)

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa_fallback(full_path: str):
        if full_path == "api" or full_path.startswith("api/"):
            return fail("Not found", "NOT_FOUND", 404)
        if DIST_DIR.exists():
            candidate = (DIST_DIR / full_path).resolve()
            dist_resolved = DIST_DIR.resolve()
            if full_path and str(candidate).startswith(str(dist_resolved)) and candidate.is_file():
                return FileResponse(candidate)
            index = DIST_DIR / "index.html"
            if index.exists():
                return FileResponse(index)
        return fail("Not found", "NOT_FOUND", 404)

    return app


app = create_app()
