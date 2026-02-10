"""
v2_player diarization - Speaker diarization service.

This module provides speaker diarization functionality for Smart Player v2.
It uses the Host's ASR capability via the SDK to perform diarization.

Usage:
    from services.v2_player.diarization import DiarizationService
    
    service = DiarizationService(paths)
    segments = await service.diarize(audio_path)
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

from dawnchat_sdk.host import host

from storage.v2_player import DiarizationSegment, V2PlayerPaths

logger = logging.getLogger("echoflow.v2_player.diarization")


class DiarizationError(Exception):
    """Raised when diarization fails."""
    pass


class DiarizationService:
    """
    Speaker diarization service.
    
    Uses Host's pyannote-based diarization to identify speakers in audio.
    """
    
    def __init__(self, paths: V2PlayerPaths):
        """
        Initialize diarization service.
        
        Args:
            paths: V2PlayerPaths instance for this course
        """
        self.paths = paths
    
    async def diarize(
        self,
        audio_path: Path,
        *,
        num_speakers: Optional[int] = None,
        min_speakers: Optional[int] = None,
        max_speakers: Optional[int] = None,
        skip_existing: bool = True,
    ) -> List[DiarizationSegment]:
        """
        Perform speaker diarization on audio file.
        
        Args:
            audio_path: Path to audio file (WAV preferred)
            num_speakers: Known number of speakers
            min_speakers: Minimum expected speakers
            max_speakers: Maximum expected speakers
            skip_existing: Skip if diarization already exists
        
        Returns:
            List of DiarizationSegment
        
        Raises:
            DiarizationError: If diarization fails
        """
        # Check for existing result
        if skip_existing and self.paths.diarization_json.exists():
            logger.info("Using existing diarization result")
            return self._load_from_cache()
        
        # Ensure audio file exists
        if not audio_path.exists():
            raise DiarizationError(f"Audio file not found: {audio_path}")
        
        logger.info(f"Starting diarization for {audio_path}")
        
        try:
            # Call Host's diarization API
            result = await host.asr.diarize(
                audio_path=str(audio_path),
                num_speakers=num_speakers,
                min_speakers=min_speakers,
                max_speakers=max_speakers,
            )
            
            # Check result
            if result.get("code") != 200:
                error_msg = result.get("message", "Unknown diarization error")
                raise DiarizationError(error_msg)
            
            data = result.get("data", {})
            raw_segments = data.get("segments", [])
            
            # Convert to DiarizationSegment
            segments = []
            for seg in raw_segments:
                segment = DiarizationSegment(
                    speaker_id=str(seg.get("speaker", "")),
                    start_time=float(seg.get("start", 0)),
                    end_time=float(seg.get("end", 0)),
                )
                segments.append(segment)
            
            # Save to cache
            self._save_to_cache(segments)
            
            logger.info(f"Diarization complete: {len(segments)} segments, "
                       f"{len(data.get('speakers', []))} speakers")
            
            return segments
            
        except DiarizationError:
            raise
        except Exception as e:
            logger.exception("Diarization failed")
            raise DiarizationError(f"Diarization failed: {e}") from e
    
    async def align_with_subtitles(
        self,
        segments: List[DiarizationSegment],
        subtitles: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Align diarization segments with subtitles.
        
        For each subtitle segment, determine which speaker is talking
        based on overlap with diarization segments.
        
        Args:
            segments: Diarization segments
            subtitles: Subtitle segments (dicts with start_time, end_time)
        
        Returns:
            Updated subtitles with speaker_id added
        """
        result = []
        
        for sub in subtitles:
            sub_start = sub.get("start_time", 0)
            sub_end = sub.get("end_time", 0)
            
            # Find overlapping diarization segments
            overlaps = []
            for seg in segments:
                # Calculate overlap
                overlap_start = max(sub_start, seg.start_time)
                overlap_end = min(sub_end, seg.end_time)
                overlap_duration = max(0, overlap_end - overlap_start)
                
                if overlap_duration > 0:
                    overlaps.append((seg.speaker_id, overlap_duration))
            
            # Assign speaker with maximum overlap
            speaker_id = None
            if overlaps:
                overlaps.sort(key=lambda x: x[1], reverse=True)
                speaker_id = overlaps[0][0]
            
            # Create updated subtitle
            updated_sub = dict(sub)
            updated_sub["speaker_id"] = speaker_id
            result.append(updated_sub)
        
        return result
    
    def _save_to_cache(self, segments: List[DiarizationSegment]) -> None:
        """Save diarization result to cache."""
        self.paths.ensure_dirs()
        data = {
            "segments": [s.to_dict() for s in segments],
            "speakers": list(set(s.speaker_id for s in segments)),
        }
        self.paths.diarization_json.write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    
    def _load_from_cache(self) -> List[DiarizationSegment]:
        """Load diarization result from cache."""
        data = json.loads(
            self.paths.diarization_json.read_text(encoding="utf-8")
        )
        return [
            DiarizationSegment.from_dict(s)
            for s in data.get("segments", [])
        ]
    
    def has_cache(self) -> bool:
        """Check if diarization cache exists."""
        return self.paths.diarization_json.exists()
    
    def clear_cache(self) -> None:
        """Clear diarization cache."""
        if self.paths.diarization_json.exists():
            self.paths.diarization_json.unlink()

