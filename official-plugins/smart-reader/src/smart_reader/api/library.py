import asyncio
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from .deps import get_lancedb_store, get_library_store
from ..core.config import LIBRARY_DIR
from ..core.ingestion.pdf_ingestor import PdfIngestor
from ..core.storage.lancedb_store import ChunkRecord
from ..services.embedding_service import EmbeddingService


router = APIRouter(prefix="/api")


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.get("/library/list")
async def list_library():
    store = get_library_store()
    files = store.list_files()
    return {
        "status": "ok",
        "files": [
            {
                "id": item.id,
                "name": item.name,
                "status": item.status,
                "message": item.message,
                "page_count": item.page_count,
                "created_at": item.created_at,
            }
            for item in files
        ],
    }


@router.post("/library/add")
async def add_file(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="仅支持 PDF 文件")
    store = get_library_store()
    file_id = _generate_file_id()
    target_dir = LIBRARY_DIR / file_id
    target_dir.mkdir(parents=True, exist_ok=True)
    target_path = target_dir / file.filename
    content = await file.read()
    target_path.write_bytes(content)
    record = store.add_file(file.filename, target_path, file_id=file_id)
    asyncio.create_task(_index_pdf(record.id, target_path))
    return {"status": "ok", "file": _record_to_payload(record)}


@router.get("/library/file/{file_id}")
async def get_file(file_id: str):
    store = get_library_store()
    record = store.get_file(file_id)
    if not record:
        raise HTTPException(status_code=404, detail="文件不存在")
    path = Path(record.path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="文件不存在")
    return FileResponse(path, media_type="application/pdf", filename=path.name)


async def _index_pdf(file_id: str, pdf_path: Path) -> None:
    store = get_library_store()
    lancedb_store = get_lancedb_store()
    embedding = EmbeddingService()
    try:
        ingestor = PdfIngestor(pdf_path)
        chunks, page_count = await asyncio.to_thread(ingestor.extract_chunks)
        texts = [chunk.text for chunk in chunks]
        vectors = await embedding.embed_texts(texts)
        records = []
        for chunk, vector in zip(chunks, vectors):
            if not vector:
                continue
            records.append(ChunkRecord(text=chunk.text, page=chunk.page, vector=vector))
        if records:
            await asyncio.to_thread(lancedb_store.upsert_chunks, file_id, records)
        store.update_status(file_id, "ready", page_count=page_count)
    except Exception as exc:
        store.update_status(file_id, "error", message=str(exc))


def _generate_file_id() -> str:
    import uuid

    return uuid.uuid4().hex


def _record_to_payload(record) -> dict[str, object]:
    return {
        "id": record.id,
        "name": record.name,
        "status": record.status,
        "message": record.message,
        "page_count": record.page_count,
        "created_at": record.created_at,
    }
