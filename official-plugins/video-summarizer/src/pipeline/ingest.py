"""
Ingest Pipeline - 数据采集

负责统一处理本地文件和在线视频的输入。
"""

import re
import hashlib
from pathlib import Path
from dataclasses import dataclass
from typing import Optional

from dawnchat_sdk import host


@dataclass
class IngestResult:
    """采集结果"""
    success: bool
    audio_path: Optional[str] = None
    source_type: str = "local"  # "local" or "online"
    title: Optional[str] = None
    duration: Optional[float] = None
    thumbnail: Optional[str] = None
    error: Optional[str] = None
    source_hash: Optional[str] = None


def is_url(source: str) -> bool:
    """判断输入是否为 URL"""
    url_patterns = [
        r'^https?://',
        r'^www\.',
        r'youtube\.com',
        r'youtu\.be',
        r'bilibili\.com',
        r'b23\.tv',
        r'twitter\.com',
        r'x\.com',
    ]
    for pattern in url_patterns:
        if re.search(pattern, source, re.IGNORECASE):
            return True
    return False


def compute_source_hash(source: str) -> str:
    """计算源的唯一哈希值（用于缓存）"""
    return hashlib.sha256(source.encode()).hexdigest()[:16]


async def ingest_source(
    source: str,
    output_dir: Path,
    audio_only: bool = True
) -> IngestResult:
    """
    统一的数据采集入口
    
    Args:
        source: 视频 URL 或本地文件路径
        output_dir: 输出目录
        audio_only: 是否仅提取音频
        
    Returns:
        IngestResult: 采集结果
    """
    source_hash = compute_source_hash(source)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    if is_url(source):
        return await _ingest_online(source, output_dir, source_hash, audio_only)
    else:
        return await _ingest_local(source, output_dir, source_hash)


async def _ingest_online(
    url: str,
    output_dir: Path,
    source_hash: str,
    audio_only: bool
) -> IngestResult:
    """处理在线视频"""
    try:
        # 先获取视频信息
        info_result = await host.media.get_video_info(url)
        
        title = None
        duration = None
        thumbnail = None
        
        if info_result.get("code") == 200:
            data = info_result.get("data", {})
            title = data.get("title", "未知视频")
            duration = data.get("duration")
            thumbnail = data.get("thumbnail")
        
        # 下载视频/音频
        download_result = await host.media.download(
            url=url,
            output_dir=str(output_dir),
            audio_only=audio_only
        )
        
        if download_result.get("code") != 200:
            return IngestResult(
                success=False,
                source_type="online",
                error=download_result.get("message", "下载失败"),
                source_hash=source_hash
            )
        
        data = download_result.get("data", {})
        audio_path = data.get("output_path")
        
        # 如果之前没获取到信息，使用下载结果中的信息
        if not title:
            title = data.get("title", "未知视频")
        if not duration:
            duration = data.get("duration")
        
        return IngestResult(
            success=True,
            audio_path=audio_path,
            source_type="online",
            title=title,
            duration=duration,
            thumbnail=thumbnail,
            source_hash=source_hash
        )
        
    except Exception as e:
        return IngestResult(
            success=False,
            source_type="online",
            error=str(e),
            source_hash=source_hash
        )


async def _ingest_local(
    file_path: str,
    output_dir: Path,
    source_hash: str
) -> IngestResult:
    """处理本地文件"""
    try:
        file_path_obj = Path(file_path)
        
        if not file_path_obj.exists():
            return IngestResult(
                success=False,
                source_type="local",
                error=f"文件不存在: {file_path_obj}",
                source_hash=source_hash
            )
        
        # 获取文件信息
        info_result = await host.media.get_info(str(file_path_obj))
        
        duration = None
        has_audio = False
        
        if info_result.get("code") == 200:
            data = info_result.get("data", {})
            duration = data.get("duration")
            has_audio = data.get("has_audio", False)
        
        if not has_audio:
            return IngestResult(
                success=False,
                source_type="local",
                error="文件不包含音频流",
                source_hash=source_hash
            )
        
        # 提取音频
        audio_output = output_dir / f"{source_hash}_audio.wav"
        
        extract_result = await host.media.extract_audio(
            video_path=str(file_path_obj),
            output_path=str(audio_output),
            sample_rate=16000,
            channels=1,
            audio_format="wav"
        )
        
        if extract_result.get("code") != 200:
            return IngestResult(
                success=False,
                source_type="local",
                error=extract_result.get("message", "音频提取失败"),
                source_hash=source_hash
            )
        
        audio_path = extract_result.get("data", {}).get("output_path")
        
        return IngestResult(
            success=True,
            audio_path=audio_path,
            source_type="local",
            title=file_path_obj.stem,
            duration=duration,
            source_hash=source_hash
        )
        
    except Exception as e:
        return IngestResult(
            success=False,
            source_type="local",
            error=str(e),
            source_hash=source_hash
        )
