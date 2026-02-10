"""
Processing Pipeline

处理流水线模块，包含：
- ingest: 数据采集（本地/在线）
- process: 媒体处理（音频提取/VAD）
- transcribe: ASR 转录
- summarize: LLM 摘要生成
"""

from typing import TYPE_CHECKING

__all__ = [
    "ingest_source",
    "IngestResult",
    "process_audio",
    "ProcessResult",
    "transcribe_audio",
    "TranscribeResult",
    "generate_summary",
    "SummaryResult",
]

if TYPE_CHECKING:
    from .ingest import IngestResult, ingest_source
    from .process import ProcessResult, process_audio
    from .summarize import SummaryResult, generate_summary
    from .transcribe import TranscribeResult, transcribe_audio


def __getattr__(name):
    """延迟导入，避免相对导入问题"""
    if name in ("ingest_source", "IngestResult"):
        from pipeline.ingest import ingest_source, IngestResult
        return ingest_source if name == "ingest_source" else IngestResult
    elif name in ("process_audio", "ProcessResult"):
        from pipeline.process import process_audio, ProcessResult
        return process_audio if name == "process_audio" else ProcessResult
    elif name in ("transcribe_audio", "TranscribeResult"):
        from pipeline.transcribe import transcribe_audio, TranscribeResult
        return transcribe_audio if name == "transcribe_audio" else TranscribeResult
    elif name in ("generate_summary", "SummaryResult"):
        from pipeline.summarize import generate_summary, SummaryResult
        return generate_summary if name == "generate_summary" else SummaryResult
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
