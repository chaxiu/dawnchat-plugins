"""
Storage Module

本地缓存和数据持久化。
"""

from typing import TYPE_CHECKING

__all__ = ["TaskCache", "CacheEntry"]

if TYPE_CHECKING:
    from .cache import CacheEntry, TaskCache


def __getattr__(name):
    """延迟导入，避免相对导入问题"""
    if name in ("TaskCache", "CacheEntry"):
        from storage.cache import TaskCache, CacheEntry
        return TaskCache if name == "TaskCache" else CacheEntry
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
