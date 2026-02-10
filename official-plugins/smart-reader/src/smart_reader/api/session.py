from fastapi import APIRouter, HTTPException
import os
from pydantic import BaseModel

from .deps import get_library_store, get_session_manager


router = APIRouter(prefix="/api")


class OpenSessionRequest(BaseModel):
    file_id: str


@router.post("/session/open")
async def open_session(request: OpenSessionRequest):
    store = get_library_store()
    record = store.get_file(request.file_id)
    if not record:
        raise HTTPException(status_code=404, detail="文件不存在")
    session = get_session_manager()
    session.set_current_file(request.file_id)
    return {"status": "ok", "file": {"id": record.id, "name": record.name, "status": record.status}}


@router.get("/session/status")
async def session_status():
    session = get_session_manager()
    current_id = session.get_current_file()
    if not current_id:
        return {"status": "ok", "file": None}
    store = get_library_store()
    record = store.get_file(current_id)
    if not record:
        return {"status": "ok", "file": None}
    return {
        "status": "ok",
        "file": {
            "id": record.id,
            "name": record.name,
            "status": record.status,
            "message": record.message,
            "page_count": record.page_count,
        },
    }


@router.get("/host/config")
async def host_config():
    host = os.environ.get("DAWNCHAT_HOST_HOST") or os.environ.get("DAWNCHAT_API_HOST", "127.0.0.1")
    port = os.environ.get("DAWNCHAT_HOST_PORT") or os.environ.get("DAWNCHAT_API_PORT") or "8000"
    base_path = os.environ.get("DAWNCHAT_PLUGIN_BASE_PATH", "").strip().rstrip("/")
    ws_url = f"ws://{host}:{port}/ws/zmp"
    return {
        "status": "ok",
        "host": host,
        "port": int(port),
        "ws_url": ws_url,
        "base_path": base_path,
    }
