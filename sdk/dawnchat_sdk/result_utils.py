from __future__ import annotations

import json
from typing import Any


def normalize_tool_result(raw: Any) -> Any:
    value = _extract_content(raw)

    if isinstance(value, list) and value:
        first = value[0]
        if isinstance(first, dict) and isinstance(first.get("text"), str):
            try:
                parsed = json.loads(first["text"])
            except Exception:
                return value
            value = parsed

    if isinstance(value, dict):
        return _unwrap_envelope_data(value)
    return value


def extract_result_data(raw: Any) -> dict[str, Any]:
    normalized = normalize_tool_result(raw)
    if isinstance(normalized, dict) and isinstance(normalized.get("data"), dict):
        return normalized["data"]
    return {}


def _extract_content(raw: Any) -> Any:
    if isinstance(raw, dict) and "content" in raw:
        return raw.get("content")
    return raw


def _unwrap_envelope_data(result: dict[str, Any]) -> dict[str, Any]:
    if "code" not in result or "data" not in result:
        return result

    data = result.get("data")
    while isinstance(data, dict) and "code" in data and "data" in data:
        nested = data.get("data")
        if not isinstance(nested, dict):
            break
        data = nested

    normalized = dict(result)
    normalized["data"] = data
    return normalized

