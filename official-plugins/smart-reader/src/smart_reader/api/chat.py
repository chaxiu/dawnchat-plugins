from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .deps import get_chat_service, get_library_store, get_session_manager


router = APIRouter(prefix="/api")


class ChatRequest(BaseModel):
    question: str
    file_id: str | None = None
    top_k: int = 4


@router.post("/chat/completions")
async def chat(request: ChatRequest):
    file_id = request.file_id
    if not file_id:
        session = get_session_manager()
        file_id = session.get_current_file()
    if not file_id:
        raise HTTPException(status_code=400, detail="未选择文件")
    store = get_library_store()
    record = store.get_file(file_id)
    if not record:
        raise HTTPException(status_code=404, detail="文件不存在")
    if record.status != "ready":
        raise HTTPException(status_code=400, detail="索引尚未完成")
    service = get_chat_service()
    answer = await service.answer(file_id, request.question, top_k=request.top_k)
    return {"status": "ok", "answer": answer}
