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
    spec = importlib.util.spec_from_file_location("assistant_python_sidecar_main", module_path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.mark.asyncio
async def test_health_endpoint_ok():
    module = _load_main_module()
    plugin_root = Path(__file__).resolve().parents[3]
    app = module.create_app(plugin_root)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
    payload = response.json()
    assert response.status_code == 200
    assert payload["status"] == "ok"
    assert payload["service"] == "python-sidecar"
    assert "plugin_id" in payload


@pytest.mark.asyncio
async def test_mcp_tools_list_and_call():
    module = _load_main_module()
    plugin_root = Path(__file__).resolve().parents[3]
    app = module.create_app(plugin_root)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        list_resp = await client.post("/mcp", json={"jsonrpc": "2.0", "id": 1, "method": "tools/list"})
        list_payload = list_resp.json()["result"]
        names = [tool.get("name") for tool in list_payload.get("tools", [])]
        assert "assistant.python.echo" in names

        call_resp = await client.post(
            "/mcp",
            json={
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/call",
                "params": {"name": "assistant.python.echo", "arguments": {"message": "hello"}},
            },
        )
        text = call_resp.json()["result"]["content"][0]["text"]
        payload = json.loads(text)
        assert payload["code"] == 200
        assert payload["message"] == "success"
        data = payload["data"]
        assert data["message"] == "hello"
        assert data["service"] == "python-sidecar"
