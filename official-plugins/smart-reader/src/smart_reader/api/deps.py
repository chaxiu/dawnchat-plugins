from pathlib import Path

from ..core.config import DATA_DIR, INDEX_DIR
from ..core.session import SessionManager
from ..core.storage.lancedb_store import LanceDBStore
from ..core.storage.library_store import LibraryStore
from ..services.chat_service import ChatService
from ..services.embedding_service import EmbeddingService


def get_library_store() -> LibraryStore:
    return _library_store


def get_session_manager() -> SessionManager:
    return _session_manager


def get_lancedb_store() -> LanceDBStore:
    return _lancedb_store


def get_chat_service() -> ChatService:
    return _chat_service


_library_store = LibraryStore(Path(DATA_DIR) / "library.json")
_session_manager = SessionManager()
_lancedb_store = LanceDBStore(Path(INDEX_DIR))
_embedding_service = EmbeddingService()
_chat_service = ChatService(_lancedb_store, _embedding_service)
