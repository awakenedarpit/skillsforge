"""JSON envelope helpers. Dates and pydantic models are serialized."""

import json
from datetime import date, datetime
from typing import Any

from fastapi.responses import JSONResponse
from pydantic import BaseModel


def _default(value: Any) -> Any:
    if isinstance(value, BaseModel):
        return value.model_dump(mode="json")
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, set):
        return list(value)
    raise TypeError(f"Not JSON serializable: {type(value)!r}")


def to_jsonable(data: Any) -> Any:
    return json.loads(json.dumps(data, default=_default))


def ok(data: Any, status_code: int = 200) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"success": True, "data": to_jsonable(data)})


def fail(
    message: str,
    code: str,
    status_code: int = 400,
    details: dict | None = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "error": message,
            "code": code,
            "details": to_jsonable(details or {}),
        },
    )
