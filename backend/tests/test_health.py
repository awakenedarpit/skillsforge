"""Health endpoint smoke test."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{(tmp_path / 'health.db').as_posix()}")
    monkeypatch.setenv("AUTO_SEED", "false")
    from app.core.config import get_settings

    get_settings.cache_clear()
    from app.main import app

    with TestClient(app) as test_client:
        yield test_client
    get_settings.cache_clear()


def test_health_reports_database_up(client: TestClient):
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["ok"] is True
    assert body["data"]["db"] == "up"
    assert body["data"]["version"]


def test_postgres_url_normalization():
    from app.db import normalize_database_url

    assert normalize_database_url("postgres://user:pw@localhost:5432/db").startswith(
        "postgresql+psycopg://"
    )
    assert normalize_database_url("postgresql://user:pw@localhost/db").startswith(
        "postgresql+psycopg://"
    )


def test_unknown_route_is_enveloped(client: TestClient):
    response = client.get("/api/missing")
    assert response.status_code == 404
    body = response.json()
    assert body["success"] is False
    assert body["code"] == "NOT_FOUND"
