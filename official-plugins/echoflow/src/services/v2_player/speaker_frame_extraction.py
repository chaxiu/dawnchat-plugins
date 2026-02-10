"""
v2_player speaker_frame_extraction - Extract frames based on diarization segments.

This module extracts video frames at precise moments when speakers are talking,
based on audio diarization results. Unlike scene-based extraction which takes
1 frame per 30s scene, this extracts 1-2 frames per diarization segment,
aligned with the actual speaking moments.

This approach significantly improves speaker identification accuracy as frames
are captured when mouths are likely open (during speech).

Usage:
    from services.v2_player.speaker_frame_extraction import SpeakerFrameExtractor
    
    extractor = SpeakerFrameExtractor(paths)
    frames = await extractor.extract(video_path, diarization_segments)
"""

from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from dawnchat_sdk.host import host

from storage.v2_player import (
    DiarizationSegment,
    SpeakerFrame,
    V2PlayerPaths,
)

logger = logging.getLogger("echoflow.v2_player.speaker_frame_extraction")


class SpeakerFrameExtractionError(Exception):
    """Raised when speaker frame extraction fails."""
    pass


class SpeakerFrameExtractor:
    """
    Extract video frames based on diarization segment timing.
    
    For each diarization segment:
    1. Calculate optimal frame timestamp (segment midpoint or 40% position)
    2. Extract frame at that timestamp
    3. Associate frame with speaker_id for later Vision analysis
    
    This ensures frames are captured during actual speech, improving
    the accuracy of "who is speaking" detection.
    """
    
    # Default extraction parameters
    DEFAULT_MIN_SEGMENT_DURATION = 0.5    # Skip segments shorter than this
    DEFAULT_FRAMES_PER_SEGMENT = 1        # Frames per normal segment
    DEFAULT_FRAMES_FOR_LONG = 2           # Frames for long segments
    DEFAULT_LONG_SEGMENT_THRESHOLD = 5.0  # Threshold for "long" segment
    DEFAULT_FRAME_POSITION = 0.4          # Position within segment (0.4 = 40%)
    DEFAULT_MAX_FRAMES_PER_SPEAKER = 8    # Maximum frames per speaker (0/negative = unlimited)
    CACHE_VERSION = 2
    
    def __init__(
        self,
        paths: V2PlayerPaths,
        *,
        min_segment_duration: float = DEFAULT_MIN_SEGMENT_DURATION,
        frames_per_segment: int = DEFAULT_FRAMES_PER_SEGMENT,
        frames_for_long_segment: int = DEFAULT_FRAMES_FOR_LONG,
        long_segment_threshold: float = DEFAULT_LONG_SEGMENT_THRESHOLD,
        max_frames_per_speaker: int = DEFAULT_MAX_FRAMES_PER_SPEAKER,
    ):
        """
        Initialize extractor.
        
        Args:
            paths: V2PlayerPaths instance for this course
            min_segment_duration: Skip segments shorter than this (seconds)
            frames_per_segment: Frames to extract per normal segment
            frames_for_long_segment: Frames to extract for long segments
            long_segment_threshold: Duration threshold for "long" segments
        """
        self.paths = paths
        self.min_segment_duration = min_segment_duration
        self.frames_per_segment = frames_per_segment
        self.frames_for_long_segment = frames_for_long_segment
        self.long_segment_threshold = long_segment_threshold
        self.max_frames_per_speaker = int(max_frames_per_speaker)
    
    async def extract(
        self,
        video_path: Path,
        diarization: List[DiarizationSegment],
        *,
        skip_existing: bool = True,
    ) -> List[SpeakerFrame]:
        """
        Extract frames for all diarization segments.
        
        Args:
            video_path: Path to video file
            diarization: List of diarization segments
            skip_existing: Skip if frames already extracted
        
        Returns:
            List of SpeakerFrame with paths to extracted images
        
        Raises:
            SpeakerFrameExtractionError: If extraction fails
        """
        # Check for existing result
        if skip_existing and self._has_cache():
            logger.info("Using existing speaker frames")
            return self._load_from_cache()
        
        if not video_path.exists():
            raise SpeakerFrameExtractionError(f"Video file not found: {video_path}")
        
        if not diarization:
            logger.warning("No diarization segments to extract frames for")
            return []
        
        logger.info(f"Extracting speaker frames from {len(diarization)} segments")
        
        # Ensure output directory exists
        self.paths.ensure_dirs()
        speaker_frames_dir = self.paths.analysis_dir / "speaker_frames"
        speaker_frames_dir.mkdir(parents=True, exist_ok=True)
        
        # Clear old frames
        for old_frame in speaker_frames_dir.glob("*.jpg"):
            old_frame.unlink()

        # Calculate timestamps for extraction
        video_duration = await self._get_video_duration(video_path)
        if not video_duration or video_duration <= 0:
            video_duration = self._estimate_duration_from_diarization(diarization)
        extraction_tasks = self._plan_extraction(diarization, video_duration=video_duration)
        
        logger.info(f"Planned {len(extraction_tasks)} frame extractions")
        
        # Extract frames
        frames = await self._extract_frames(video_path, extraction_tasks, speaker_frames_dir)
        
        # Save to cache
        self._save_to_cache(frames)
        
        logger.info(f"Extracted {len(frames)} speaker frames")
        
        return frames
    
    def _plan_extraction(
        self,
        diarization: List[DiarizationSegment],
        *,
        video_duration: Optional[float] = None,
    ) -> List[Tuple[int, str, float, float, float]]:
        """
        Plan which timestamps to extract.
        
        Returns:
            List of (segment_id, speaker_id, timestamp, segment_start, segment_end)
        """
        tasks: List[Tuple[int, str, float, float, float]] = []
        
        for i, segment in enumerate(diarization):
            duration = segment.end_time - segment.start_time
            
            # Skip very short segments
            if duration < self.min_segment_duration:
                continue
            
            # Determine number of frames
            is_long = duration >= self.long_segment_threshold
            num_frames = self.frames_for_long_segment if is_long else self.frames_per_segment
            
            if num_frames == 1:
                # Single frame at 40% position (mouth likely open)
                timestamp = segment.start_time + duration * self.DEFAULT_FRAME_POSITION
                tasks.append((i, segment.speaker_id, timestamp, segment.start_time, segment.end_time))
            else:
                # Multiple frames evenly distributed
                step = duration / (num_frames + 1)
                for j in range(1, num_frames + 1):
                    timestamp = segment.start_time + step * j
                    tasks.append((i, segment.speaker_id, timestamp, segment.start_time, segment.end_time))

        return self._apply_per_speaker_limit(tasks, video_duration=video_duration)

    def _apply_per_speaker_limit(
        self,
        tasks: List[Tuple[int, str, float, float, float]],
        *,
        video_duration: Optional[float],
    ) -> List[Tuple[int, str, float, float, float]]:
        limit = int(self.max_frames_per_speaker or 0)
        if limit <= 0:
            return sorted(tasks, key=lambda t: (t[2], t[0]))

        tasks_by_speaker: Dict[str, List[Tuple[int, str, float, float, float]]] = {}
        for t in tasks:
            tasks_by_speaker.setdefault(t[1], []).append(t)

        all_timestamps = [t[2] for t in tasks]
        if video_duration and video_duration > 0:
            midpoint = float(video_duration) / 2.0
        elif all_timestamps:
            midpoint = (min(all_timestamps) + max(all_timestamps)) / 2.0
        else:
            midpoint = 0.0

        selected: List[Tuple[int, str, float, float, float]] = []
        for speaker_id, speaker_tasks in tasks_by_speaker.items():
            if len(speaker_tasks) <= limit:
                selected.extend(speaker_tasks)
                continue

            with_distance = sorted(
                speaker_tasks,
                key=lambda t: (abs(t[2] - midpoint), t[2], t[0]),
            )
            radius = abs(with_distance[limit - 1][2] - midpoint)

            pool = [
                t
                for t in speaker_tasks
                if abs(t[2] - midpoint) <= radius + 1e-9
            ]
            pool.sort(key=lambda t: (t[2], t[0]))

            sampled = self._uniform_sample(pool, limit)
            selected.extend(sampled)

        return sorted(selected, key=lambda t: (t[2], t[1], t[0]))

    @staticmethod
    def _uniform_sample(
        items: List[Tuple[int, str, float, float, float]],
        k: int,
    ) -> List[Tuple[int, str, float, float, float]]:
        n = len(items)
        if k <= 0 or n == 0:
            return []
        if k >= n:
            return list(items)
        if k == 1:
            return [items[n // 2]]

        raw_indices = [int(round(i * (n - 1) / (k - 1))) for i in range(k)]
        seen = set()
        indices: List[int] = []
        for idx in raw_indices:
            if 0 <= idx < n and idx not in seen:
                seen.add(idx)
                indices.append(idx)

        if len(indices) < k:
            for idx in range(n):
                if idx not in seen:
                    seen.add(idx)
                    indices.append(idx)
                    if len(indices) == k:
                        break

        indices.sort()
        return [items[i] for i in indices]

    @staticmethod
    def _estimate_duration_from_diarization(diarization: List[DiarizationSegment]) -> float:
        end_times = [float(s.end_time) for s in diarization if float(s.end_time) > 0]
        if not end_times:
            return 0.0
        return max(end_times)

    async def _get_video_duration(self, video_path: Path) -> Optional[float]:
        try:
            info_result = await host.media.get_info(str(video_path))
            if info_result.get("code") != 200:
                return None
            duration = float((info_result.get("data") or {}).get("duration", 0) or 0)
            if duration > 0:
                return duration
        except Exception:
            return None
        return None
    
    async def _extract_frames(
        self,
        video_path: Path,
        tasks: List[Tuple[int, str, float, float, float]],
        output_dir: Path,
    ) -> List[SpeakerFrame]:
        """
        Extract frames at specified timestamps.
        
        Uses Host's batch frame extraction API for efficiency.
        """
        if not tasks:
            return []
        
        # Prepare data for extraction
        timestamps = [t[2] for t in tasks]
        
        try:
            # Try batch extraction first
            result = await host.media.extract_frames_batch(
                video_path=str(video_path),
                output_dir=str(output_dir),
                timestamps=timestamps,
                quality=2,  # High quality JPEG
            )
            
            if result.get("code") == 200:
                output_paths = result.get("data", {}).get("output_paths", [])
                return self._build_speaker_frames(tasks, output_paths)
            
            # Fallback to sequential extraction
            logger.warning(f"Batch extraction failed: {result.get('message')}, falling back to sequential")
            return await self._extract_frames_fallback(video_path, tasks, output_dir)
            
        except Exception as e:
            logger.warning(f"Batch extraction error: {e}, falling back to sequential")
            return await self._extract_frames_fallback(video_path, tasks, output_dir)
    
    async def _extract_frames_fallback(
        self,
        video_path: Path,
        tasks: List[Tuple[int, str, float, float, float]],
        output_dir: Path,
    ) -> List[SpeakerFrame]:
        """
        Fallback: Extract frames using FFmpeg subprocess.
        """
        frames = []
        
        for segment_id, speaker_id, timestamp, seg_start, seg_end in tasks:
            output_path = output_dir / f"speaker_{segment_id:04d}_{timestamp:.2f}.jpg"
            
            cmd = [
                "ffmpeg",
                "-ss", str(timestamp),
                "-i", str(video_path),
                "-frames:v", "1",
                "-q:v", "2",
                "-y",
                str(output_path),
            ]
            
            try:
                process = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.DEVNULL,
                    stderr=asyncio.subprocess.PIPE,
                )
                _, stderr = await process.communicate()
                
                if process.returncode == 0 and output_path.exists():
                    frames.append(SpeakerFrame(
                        segment_id=segment_id,
                        speaker_id=speaker_id,
                        timestamp=timestamp,
                        frame_path=str(output_path),
                        segment_start=seg_start,
                        segment_end=seg_end,
                    ))
                else:
                    logger.warning(f"Failed to extract frame at {timestamp:.2f}s")
                    
            except Exception as e:
                logger.warning(f"Frame extraction error at {timestamp:.2f}s: {e}")
                continue
        
        return frames
    
    def _build_speaker_frames(
        self,
        tasks: List[Tuple[int, str, float, float, float]],
        output_paths: List[str],
    ) -> List[SpeakerFrame]:
        """Build SpeakerFrame list from extraction results."""
        frames = []
        
        for i, path in enumerate(output_paths):
            if i >= len(tasks):
                break
            
            segment_id, speaker_id, timestamp, seg_start, seg_end = tasks[i]
            
            if path and Path(path).exists():
                frames.append(SpeakerFrame(
                    segment_id=segment_id,
                    speaker_id=speaker_id,
                    timestamp=timestamp,
                    frame_path=path,
                    segment_start=seg_start,
                    segment_end=seg_end,
                ))
        
        return frames
    
    def _save_to_cache(self, frames: List[SpeakerFrame]) -> None:
        """Save extraction result to cache."""
        self.paths.ensure_dirs()
        cache_path = self._cache_path()
        data = {
            "version": self.CACHE_VERSION,
            "params": self._cache_params(),
            "frames": [f.to_dict() for f in frames],
        }
        cache_path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    
    def _load_from_cache(self) -> List[SpeakerFrame]:
        """Load extraction result from cache."""
        cache_path = self._cache_path()
        data = json.loads(cache_path.read_text(encoding="utf-8"))
        return [SpeakerFrame.from_dict(f) for f in data.get("frames", [])]
    
    def _has_cache(self) -> bool:
        """Check if cache exists."""
        cache_path = self._cache_path()
        if not cache_path.exists():
            return False
        try:
            data = json.loads(cache_path.read_text(encoding="utf-8"))
        except Exception:
            return False
        return self._is_cache_compatible(data)

    def _cache_path(self) -> Path:
        return self.paths.analysis_dir / "speaker_frames.json"

    def _cache_params(self) -> Dict[str, Any]:
        return {
            "min_segment_duration": float(self.min_segment_duration),
            "frames_per_segment": int(self.frames_per_segment),
            "frames_for_long_segment": int(self.frames_for_long_segment),
            "long_segment_threshold": float(self.long_segment_threshold),
            "frame_position": float(self.DEFAULT_FRAME_POSITION),
            "max_frames_per_speaker": int(self.max_frames_per_speaker),
        }

    def _is_cache_compatible(self, data: Dict[str, Any]) -> bool:
        if int(data.get("version", 0) or 0) != int(self.CACHE_VERSION):
            return False
        cached_params = data.get("params", {})
        if not isinstance(cached_params, dict):
            return False
        return cached_params == self._cache_params()
    
    def clear_cache(self) -> None:
        """Clear extraction cache and frames."""
        cache_path = self._cache_path()
        if cache_path.exists():
            cache_path.unlink()
        
        # Clear frame images
        speaker_frames_dir = self.paths.analysis_dir / "speaker_frames"
        if speaker_frames_dir.exists():
            for f in speaker_frames_dir.glob("*.jpg"):
                f.unlink()
