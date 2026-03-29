import importlib.util
import json
from pathlib import Path
import sys

import pytest
from httpx import ASGITransport, AsyncClient


def _load_main_module():
    repo_root = Path(__file__).resolve().parents[6]
    sdk_path = repo_root / "dawnchat-plugins" / "sdk"
    if str(sdk_path) not in sys.path:
        sys.path.insert(0, str(sdk_path))
    sidecar_root = Path(__file__).resolve().parent.parent
    entry_dir = sidecar_root / "entry"
    if str(sidecar_root) not in sys.path:
        sys.path.insert(0, str(sidecar_root))
    if str(entry_dir) not in sys.path:
        sys.path.insert(0, str(entry_dir))
    module_path = entry_dir / "main.py"
    spec = importlib.util.spec_from_file_location("assistant_python_sidecar_main_error", module_path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.mark.asyncio
async def test_mcp_unknown_tool_error_response():
    module = _load_main_module()
    plugin_root = Path(__file__).resolve().parents[3]
    app = module.create_app(plugin_root)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/mcp",
            json={
                "jsonrpc": "2.0",
                "id": 9,
                "method": "tools/call",
                "params": {"name": "unknown.tool", "arguments": {}},
            },
        )
    payload = response.json()
    assert response.status_code == 200
    text = payload["result"]["content"][0]["text"]
    result = json.loads(text)
    assert result["code"] == 404
    assert "not found" in str(result["message"]).lower()
