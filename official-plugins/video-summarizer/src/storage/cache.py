"""
Task Cache - 任务缓存

基于文件系统的任务缓存，使用源 hash 作为唯一标识。
"""

import json
import hashlib
from pathlib import Path
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum


class TaskStatus(Enum):
    """任务状态"""
    PENDING = "pending"
    DOWNLOADING = "downloading"
    PROCESSING = "processing"
    TRANSCRIBING = "transcribing"
    SUMMARIZING = "summarizing"
    COMPLETED = "completed"
    ERROR = "error"


@dataclass
class KeyPoint:
    """关键点"""
    timestamp: float
    content: str
    speaker: Optional[str] = None


@dataclass
class Segment:
    """转录片段"""
    start: float
    end: float
    text: str
    speaker: Optional[str] = None


@dataclass
class CacheEntry:
    """缓存条目"""
    id: str  # source_hash
    source: str  # 原始输入（URL 或文件路径）
    source_type: str  # "local" or "online"
    title: str
    status: TaskStatus
    created_at: str
    updated_at: str
    
    # 处理结果
    duration: Optional[float] = None
    thumbnail: Optional[str] = None
    audio_path: Optional[str] = None
    
    # 转录结果
    text: Optional[str] = None
    language: Optional[str] = None
    segments: List[Segment] = field(default_factory=list)
    speakers: List[str] = field(default_factory=list)
    
    # 摘要结果
    summary: Optional[str] = None
    key_points: List[KeyPoint] = field(default_factory=list)
    full_summary: Optional[str] = None
    
    # 使用的模型
    model: Optional[str] = None
    
    # 错误信息
    error: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        data = asdict(self)
        data["status"] = self.status.value
        # 转换 Segment 和 KeyPoint
        data["segments"] = [asdict(s) for s in self.segments]
        data["key_points"] = [asdict(k) for k in self.key_points]
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CacheEntry":
        """从字典创建"""
        data["status"] = TaskStatus(data["status"])
        data["segments"] = [Segment(**s) for s in data.get("segments", [])]
        data["key_points"] = [KeyPoint(**k) for k in data.get("key_points", [])]
        return cls(**data)


class TaskCache:
    """
    任务缓存管理器
    
    使用文件系统存储任务数据，支持：
    - 根据源 hash 快速查找
    - 任务状态持久化
    - 结果缓存
    """
    
    def __init__(self, cache_dir: Optional[Path] = None):
        """
        初始化缓存管理器
        
        Args:
            cache_dir: 缓存目录，默认为 ~/.dawnchat/plugins/video-summarizer/cache
        """
        if cache_dir is None:
            cache_dir = Path.home() / ".dawnchat" / "plugins" / "video-summarizer" / "cache"
        
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        self.tasks_dir = self.cache_dir / "tasks"
        self.tasks_dir.mkdir(exist_ok=True)
        
        self.audio_dir = self.cache_dir / "audio"
        self.audio_dir.mkdir(exist_ok=True)
        
        # 内存缓存
        self._tasks: Dict[str, CacheEntry] = {}
        self._load_all()
    
    def _load_all(self):
        """加载所有缓存的任务"""
        for task_file in self.tasks_dir.glob("*.json"):
            try:
                with open(task_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    entry = CacheEntry.from_dict(data)
                    self._tasks[entry.id] = entry
            except Exception:
                pass  # 忽略损坏的缓存文件
    
    def _save(self, entry: CacheEntry):
        """保存任务到文件"""
        task_file = self.tasks_dir / f"{entry.id}.json"
        with open(task_file, "w", encoding="utf-8") as f:
            json.dump(entry.to_dict(), f, ensure_ascii=False, indent=2)
    
    def compute_hash(self, source: str) -> str:
        """计算源的唯一哈希值"""
        return hashlib.sha256(source.encode()).hexdigest()[:16]
    
    def exists(self, source: str) -> bool:
        """检查源是否已存在"""
        source_hash = self.compute_hash(source)
        return source_hash in self._tasks
    
    def get(self, task_id: str) -> Optional[CacheEntry]:
        """获取任务"""
        return self._tasks.get(task_id)
    
    def get_by_source(self, source: str) -> Optional[CacheEntry]:
        """根据源获取任务"""
        source_hash = self.compute_hash(source)
        return self._tasks.get(source_hash)
    
    def create(
        self,
        source: str,
        source_type: str,
        title: str
    ) -> CacheEntry:
        """创建新任务"""
        source_hash = self.compute_hash(source)
        now = datetime.now().isoformat()
        
        entry = CacheEntry(
            id=source_hash,
            source=source,
            source_type=source_type,
            title=title,
            status=TaskStatus.PENDING,
            created_at=now,
            updated_at=now
        )
        
        self._tasks[source_hash] = entry
        self._save(entry)
        return entry
    
    def update(
        self,
        task_id: str,
        status: Optional[TaskStatus] = None,
        **kwargs
    ) -> Optional[CacheEntry]:
        """更新任务"""
        entry = self._tasks.get(task_id)
        if not entry:
            return None
        
        if status is not None:
            entry.status = status
        
        for key, value in kwargs.items():
            if hasattr(entry, key):
                setattr(entry, key, value)
        
        entry.updated_at = datetime.now().isoformat()
        self._save(entry)
        return entry
    
    def delete(self, task_id: str) -> bool:
        """删除任务"""
        if task_id not in self._tasks:
            return False
        
        # 删除文件
        task_file = self.tasks_dir / f"{task_id}.json"
        if task_file.exists():
            task_file.unlink()
        
        # 从内存中删除
        del self._tasks[task_id]
        return True
    
    def list_all(self) -> List[CacheEntry]:
        """列出所有任务（按更新时间倒序）"""
        tasks = list(self._tasks.values())
        tasks.sort(key=lambda t: t.updated_at, reverse=True)
        return tasks
    
    def list_by_status(self, status: TaskStatus) -> List[CacheEntry]:
        """按状态筛选任务"""
        return [t for t in self._tasks.values() if t.status == status]
    
    def get_audio_dir(self, task_id: str) -> Path:
        """获取任务的音频目录"""
        task_audio_dir = self.audio_dir / task_id
        task_audio_dir.mkdir(exist_ok=True)
        return task_audio_dir
    
    def clear_all(self):
        """清空所有缓存"""
        for task_file in self.tasks_dir.glob("*.json"):
            task_file.unlink()
        self._tasks.clear()

