from typing import List
import asyncio

from dawnchat_sdk import host


class EmbeddingService:
    async def embed_texts(self, texts: List[str], concurrency: int = 4) -> List[List[float]]:
        if not texts:
            return []
        sem = asyncio.Semaphore(max(1, concurrency))
        results: List[List[float]] = [[] for _ in range(len(texts))]
        async def run_one(idx: int, content: str):
            async with sem:
                try:
                    response = await host.ai.embedding(text=content)
                    if isinstance(response, list):
                        results[idx] = response
                    elif isinstance(response, dict):
                        results[idx] = response.get("embedding") or []
                    else:
                        results[idx] = []
                except Exception:
                    results[idx] = []
        tasks = [run_one(i, t) for i, t in enumerate(texts)]
        await asyncio.gather(*tasks)
        return results
