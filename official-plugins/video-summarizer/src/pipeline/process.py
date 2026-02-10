"""
Process Pipeline - 媒体处理

负责音频预处理：标准化、VAD 检测等。
"""

from pathlib import Path
from dataclasses import dataclass
from typing import Optional

from dawnchat_sdk import host


@dataclass
class ProcessResult:
    """处理结果"""
    success: bool
    audio_path: Optional[str] = None
    duration: Optional[float] = None
    sample_rate: int = 16000
    channels: int = 1
    normalized: bool = False
    error: Optional[str] = None


async def process_audio(
    audio_path: str,
    output_dir: Path,
    normalize: bool = True,
    target_loudness: float = -23.0
) -> ProcessResult:
    """
    音频处理流水线
    
    包括：
    1. 获取音频信息
    2. 可选：响度标准化
    
    Args:
        audio_path: 输入音频路径
        output_dir: 输出目录
        normalize: 是否进行响度标准化
        target_loudness: 目标响度 (LUFS)
        
    Returns:
        ProcessResult: 处理结果
    """
    try:
        audio_path_obj = Path(audio_path)
        output_dir_obj = Path(output_dir)
        output_dir_obj.mkdir(parents=True, exist_ok=True)
        
        if not audio_path_obj.exists():
            return ProcessResult(
                success=False,
                error=f"音频文件不存在: {audio_path_obj}"
            )
        
        # 获取音频信息
        info_result = await host.media.get_info(str(audio_path_obj))
        
        duration = None
        sample_rate = 16000
        channels = 1
        
        if info_result.get("code") == 200:
            data = info_result.get("data", {})
            duration = data.get("duration")
            sample_rate = data.get("sample_rate", 16000)
            channels = data.get("channels", 1)
        
        # 当前音频路径
        current_audio = str(audio_path_obj)
        normalized = False
        
        # 可选：响度标准化
        if normalize:
            normalized_path = output_dir_obj / f"{audio_path_obj.stem}_normalized.wav"
            
            normalize_result = await host.media.normalize_audio(
                audio_path=current_audio,
                output_path=str(normalized_path),
                target_loudness=target_loudness
            )
            
            if normalize_result.get("code") == 200:
                current_audio = normalize_result.get("data", {}).get("output_path", current_audio)
                normalized = True
        
        return ProcessResult(
            success=True,
            audio_path=current_audio,
            duration=duration,
            sample_rate=sample_rate,
            channels=channels,
            normalized=normalized
        )
        
    except Exception as e:
        return ProcessResult(
            success=False,
            error=str(e)
        )
