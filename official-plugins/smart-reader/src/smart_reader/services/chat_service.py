from typing import List

from dawnchat_sdk import host

from ..core.storage.lancedb_store import ChunkRecord, LanceDBStore
from .embedding_service import EmbeddingService


class ChatService:
    def __init__(self, store: LanceDBStore, embedding: EmbeddingService) -> None:
        self.store = store
        self.embedding = embedding

    async def answer(self, file_id: str, question: str, top_k: int = 4) -> str:
        vectors = await self.embedding.embed_texts([question])
        query_vector = vectors[0] if vectors else []
        chunks = self.store.query(file_id, query_vector, top_k=top_k)
        context = self._build_context(chunks)
        system_prompt = "请基于提供的上下文回答，并引用页码。"
        user_prompt = f"问题：{question}\n\n上下文：\n{context}"
        response = await host.ai.chat(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
        )
        return response.get("content") or ""

    def _build_context(self, chunks: List[ChunkRecord]) -> str:
        if not chunks:
            return "无可用上下文。"
        parts = []
        for chunk in chunks:
            parts.append(f"[页码 {chunk.page}] {chunk.text}")
        return "\n".join(parts)
