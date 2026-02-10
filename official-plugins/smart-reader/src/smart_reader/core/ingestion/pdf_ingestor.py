from dataclasses import dataclass
from pathlib import Path
from typing import List, Tuple

import fitz

from .text_chunker import chunk_text


@dataclass
class PdfChunk:
    text: str
    page: int


class PdfIngestor:
    def __init__(self, pdf_path: Path) -> None:
        self.pdf_path = pdf_path

    def extract_chunks(self) -> Tuple[List[PdfChunk], int]:
        doc = fitz.open(self.pdf_path)
        chunks: List[PdfChunk] = []
        for page_index in range(len(doc)):
            page = doc.load_page(page_index)
            text_value = page.get_text("text")
            text = text_value if isinstance(text_value, str) else ""
            for piece in chunk_text(text):
                chunks.append(PdfChunk(text=piece, page=page_index + 1))
        return chunks, len(doc)
