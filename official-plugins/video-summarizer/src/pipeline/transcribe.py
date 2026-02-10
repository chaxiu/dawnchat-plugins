"""
Transcribe Pipeline - ASR 转录

负责语音转文字和可选的说话人分离。
支持进度回调，可以实时展示转录进度。
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any, Callable

from dawnchat_sdk import host

# 进度回调类型
ProgressCallback = Callable[[float, str], None]


@dataclass
class Segment:
    """转录片段"""
    start: float
    end: float
    text: str
    speaker: Optional[str] = None


@dataclass
class TranscribeResult:
    """转录结果"""
    success: bool
    text: Optional[str] = None
    language: Optional[str] = None
    duration: Optional[float] = None
    segments: List[Segment] = field(default_factory=list)
    speakers: List[str] = field(default_factory=list)
    error: Optional[str] = None


async def transcribe_audio(
    audio_path: str,
    language: Optional[str] = None,
    model_size: Optional[str] = None,
    enable_diarization: bool = True,
    num_speakers: Optional[int] = None,
    vad_filter: bool = True,
    initial_prompt: Optional[str] = None,
    on_progress: Optional[ProgressCallback] = None
) -> TranscribeResult:
    """
    音频转录流水线
    
    Args:
        audio_path: 音频文件路径
        language: 语言代码 (None 自动检测)
        model_size: Whisper 模型规格
        enable_diarization: 是否启用说话人分离
        num_speakers: 已知说话人数量
        vad_filter: 是否启用 VAD 过滤
        initial_prompt: 提示词，用于引导识别（如视频标题、领域术语等）
        on_progress: 进度回调函数，签名为 (progress: float, message: str) -> None
        
    Returns:
        TranscribeResult: 转录结果
        
    Note:
        initial_prompt 是 OpenAI 官方推荐的提升 ASR 准确率的方法。
        对于在线视频，建议传入视频标题、描述等信息。
        对于专业领域内容，可以添加相关术语帮助纠正同音字。
        
    Example:
        # 带进度显示的转录
        def show_progress(progress: float, message: str):
            print(f"转录进度: {progress*100:.0f}% - {message}")
        
        result = await transcribe_audio(
            audio_path="/path/to/audio.wav",
            on_progress=show_progress
        )
    """
    try:
        # 执行转录（带进度回调）
        transcribe_result = await host.asr.transcribe(
            audio_path=audio_path,
            language=language,
            model_size=model_size,
            vad_filter=vad_filter,
            output_format="segments",
            initial_prompt=initial_prompt,
            on_progress=on_progress
        )
        
        if transcribe_result.get("code") != 200:
            return TranscribeResult(
                success=False,
                error=transcribe_result.get("message", "转录失败")
            )
        
        data = transcribe_result.get("data", {})
        text = data.get("text", "")
        detected_language = data.get("language")
        duration = data.get("duration")
        raw_segments = data.get("segments", [])
        
        # 转换为 Segment 对象
        segments = [
            Segment(
                start=seg.get("start", 0),
                end=seg.get("end", 0),
                text=seg.get("text", "")
            )
            for seg in raw_segments
        ]
        
        speakers = []
        
        # 可选：说话人分离
        if enable_diarization and segments:
            try:
                diarize_result = await host.asr.diarize(
                    audio_path=audio_path,
                    num_speakers=num_speakers
                )
                
                if diarize_result.get("code") == 200:
                    diarize_data = diarize_result.get("data", {})
                    diarize_segments = diarize_data.get("segments", [])
                    
                    # 合并说话人信息到转录片段
                    segments = _merge_speaker_info(segments, diarize_segments)
                    
                    # 重新计算实际使用的speakers（只保留实际出现在segments中的）
                    used_speakers = set(seg.speaker for seg in segments if seg.speaker)
                    speakers = sorted(list(used_speakers))
                    
            except Exception as e:
                # 说话人分离失败不影响主流程
                pass
        
        return TranscribeResult(
            success=True,
            text=text,
            language=detected_language,
            duration=duration,
            segments=segments,
            speakers=speakers
        )
        
    except Exception as e:
        return TranscribeResult(
            success=False,
            error=str(e)
        )


def _merge_speaker_info(
    transcribe_segments: List[Segment],
    diarize_segments: List[Dict[str, Any]]
) -> List[Segment]:
    """
    将说话人信息合并到转录片段
    
    使用时间重叠度判断每个转录片段属于哪个说话人。
    """
    if not diarize_segments:
        return transcribe_segments
    
    for segment in transcribe_segments:
        seg_start = segment.start
        seg_end = segment.end
        seg_duration = seg_end - seg_start
        
        if seg_duration <= 0:
            continue
        
        # 找到与转录片段重叠最多的说话人片段
        best_speaker = None
        best_overlap = 0
        
        for d_seg in diarize_segments:
            d_start = d_seg.get("start", 0)
            d_end = d_seg.get("end", 0)
            speaker = d_seg.get("speaker")
            
            # 计算重叠区间
            overlap_start = max(seg_start, d_start)
            overlap_end = min(seg_end, d_end)
            overlap = max(0, overlap_end - overlap_start)
            
            if overlap > best_overlap:
                best_overlap = overlap
                best_speaker = speaker
        
        segment.speaker = best_speaker
    
    return transcribe_segments

