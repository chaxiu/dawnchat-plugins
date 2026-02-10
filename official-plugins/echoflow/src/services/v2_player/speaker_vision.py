"""
v2_player speaker_vision - Vision analysis for speaker identification.

This module analyzes speaker frames using Vision LLM with closed-set prompts.
Unlike generic scene vision, it uses character candidates to constrain
recognition to known names (e.g., "Peppa" instead of "pink pig").

Key features:
- Closed-set recognition: Only identifies characters from known candidates
- Narrator detection: Identifies when no one is speaking on screen
- Context-aware: Uses subtitle context to improve accuracy

Usage:
    from services.v2_player.speaker_vision import SpeakerVisionService
    
    service = SpeakerVisionService(paths)
    results = await service.analyze(speaker_frames, candidates, subtitles)
"""

from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

from dawnchat_sdk.host import host

from storage.v2_player import (
    CharacterCandidates,
    SpeakerFrame,
    SpeakerVisualResult,
    SubtitleData,
    V2PlayerPaths,
)

logger = logging.getLogger("echoflow.v2_player.speaker_vision")


class SpeakerVisionError(Exception):
    """Raised when speaker vision analysis fails."""
    pass


class SpeakerVisionService:
    """
    Vision LLM service for speaker identification.
    
    Analyzes frames extracted at speaking moments to identify who is
    actually speaking, using closed-set recognition with known characters.
    """
    
    # Default parameters
    DEFAULT_MAX_CONCURRENT = 3        # Max concurrent API calls
    DEFAULT_MAX_SIDE = 1024           # Max image dimension
    DEFAULT_JPEG_QUALITY = 85         # JPEG compression quality
    
    # Supported image extensions
    SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    
    def __init__(
        self,
        paths: V2PlayerPaths,
        *,
        model: Optional[str] = None,
        max_concurrent: int = DEFAULT_MAX_CONCURRENT,
        max_side: int = DEFAULT_MAX_SIDE,
        jpeg_quality: int = DEFAULT_JPEG_QUALITY,
    ):
        """
        Initialize service.
        
        Args:
            paths: V2PlayerPaths instance
            model: Vision model to use (None for default)
            max_concurrent: Max concurrent API calls
            max_side: Max image dimension for compression
            jpeg_quality: JPEG quality for compression
        """
        self.paths = paths
        self.model = model
        self.max_concurrent = max_concurrent
        self.max_side = max_side
        self.jpeg_quality = max(1, min(100, jpeg_quality))
        self._semaphore: Optional[asyncio.Semaphore] = None
    
    async def analyze(
        self,
        speaker_frames: List[SpeakerFrame],
        candidates: CharacterCandidates,
        subtitles: List[SubtitleData],
        *,
        skip_existing: bool = True,
    ) -> List[SpeakerVisualResult]:
        """
        Analyze speaker frames to identify who is speaking.
        
        Args:
            speaker_frames: Frames extracted from diarization segments
            candidates: Known character candidates for closed-set recognition
            subtitles: Subtitles for context
            skip_existing: Skip if cached result exists
        
        Returns:
            List of SpeakerVisualResult
        """
        # Check cache
        if skip_existing and self._has_cache():
            logger.info("Using cached speaker vision results")
            return self._load_from_cache()
        
        if not speaker_frames:
            logger.warning("No speaker frames to analyze")
            return []

        logger.info(
            f"Analyzing {len(speaker_frames)} speaker frames with "
            f"{len(candidates.characters)} character candidates"
        )
        
        # Build subtitle lookup for context
        subtitle_lookup = self._build_subtitle_lookup(subtitles)
        
        # Create semaphore for concurrency control
        semaphore = asyncio.Semaphore(self.max_concurrent)
        self._semaphore = semaphore
        
        # Analyze frames concurrently
        async def analyze_with_semaphore(frame: SpeakerFrame, idx: int):
            async with semaphore:
                try:
                    context = self._get_subtitle_context(frame, subtitle_lookup)
                    result = await self._analyze_single_frame(frame, candidates, context)
                    logger.debug(f"Analyzed frame {idx + 1}/{len(speaker_frames)}: "
                               f"speaker={result.speaking_character}")
                    return result
                except Exception as e:
                    logger.warning(f"Failed to analyze frame {frame.frame_path}: {e}")
                    return SpeakerVisualResult(
                        segment_id=frame.segment_id,
                        speaker_id=frame.speaker_id,
                        frame_path=frame.frame_path,
                        timestamp=frame.timestamp,
                        status="failed",
                        error=str(e),
                    )
        
        tasks = [
            analyze_with_semaphore(frame, i)
            for i, frame in enumerate(speaker_frames)
        ]
        results = await asyncio.gather(*tasks)
        
        # Save to cache
        self._save_to_cache(results)
        
        # Log summary
        success_count = sum(1 for r in results if r.status == "success")
        narrator_count = sum(1 for r in results if r.is_narrator())
        logger.info(f"Speaker vision complete: {success_count}/{len(results)} success, "
                   f"{narrator_count} narrator detections")
        
        return results
    
    def _build_subtitle_lookup(
        self,
        subtitles: List[SubtitleData],
    ) -> List[SubtitleData]:
        """Build sorted subtitle list for context lookup."""
        return sorted(subtitles, key=lambda s: s.start_time)
    
    def _get_subtitle_context(
        self,
        frame: SpeakerFrame,
        subtitles: List[SubtitleData],
    ) -> str:
        """Get subtitle text at the frame's timestamp."""
        timestamp = frame.timestamp
        
        # Find overlapping subtitles
        context_parts = []
        for sub in subtitles:
            if sub.start_time <= timestamp <= sub.end_time:
                context_parts.append(sub.text)
            elif sub.start_time > timestamp + 2:
                # Subtitles are sorted, no need to check further
                break
        
        # Also check nearby subtitles if no direct match
        if not context_parts:
            for sub in subtitles:
                # Within 1 second
                if abs(sub.start_time - timestamp) < 1.0 or abs(sub.end_time - timestamp) < 1.0:
                    context_parts.append(sub.text)
                elif sub.start_time > timestamp + 2:
                    break
        
        return " ".join(context_parts[:3])  # Limit context length
    
    async def _analyze_single_frame(
        self,
        frame: SpeakerFrame,
        candidates: CharacterCandidates,
        subtitle_context: str,
    ) -> SpeakerVisualResult:
        """Analyze a single frame for speaker identification."""
        frame_path = Path(frame.frame_path)
        
        if not frame_path.exists():
            raise SpeakerVisionError(f"Frame not found: {frame.frame_path}")
        
        if frame_path.suffix.lower() not in self.SUPPORTED_EXTENSIONS:
            raise SpeakerVisionError(f"Unsupported image format: {frame_path.suffix}")
        
        # Build closed-set prompt
        prompt = self._build_speaker_prompt(candidates, subtitle_context)
        
        try:
            kwargs: Dict[str, Any] = {
                "image_path": str(frame_path),
                "prompt": prompt,
                "max_side": self.max_side,
                "quality": self.jpeg_quality,
            }
            if self.model:
                kwargs["model"] = self.model
            
            response = await host.ai.vision_chat(**kwargs)
            
            if response.get("code") != 200:
                error = response.get("message", "Unknown error")
                raise SpeakerVisionError(f"Vision API failed: {error}")
            
            content = response.get("data", {}).get("content", "")
            return self._parse_response(frame, content)
            
        except SpeakerVisionError:
            raise
        except Exception as e:
            logger.exception(f"Vision analysis failed for {frame.frame_path}")
            raise SpeakerVisionError(f"Vision analysis failed: {e}") from e
    
    def _build_speaker_prompt(
        self,
        candidates: CharacterCandidates,
        subtitle_context: str,
    ) -> str:
        """Build closed-set prompt for speaker identification."""
        all_names = candidates.get_all_names()
        char_list = ", ".join(all_names) if all_names else ""
        
        # Narrator note
        narrator_note = ""
        if candidates.has_narrator:
            narrator_note = """
Note: This video has a NARRATOR who speaks off-screen. If no character 
on screen appears to be speaking, the speaker is likely the Narrator."""
        
        # Context note
        context_note = ""
        if subtitle_context:
            context_note = f"""
Subtitle at this moment: "{subtitle_context[:200]}"
"""
        
        if not all_names:
            return f"""This frame is captured at a moment when someone is SPEAKING in the video.

Task:
1. Identify who is ACTIVELY SPEAKING based on mouth movement or talking gesture
2. If no one on screen is speaking, indicate null (likely off-screen narrator)
3. Provide a short, stable label for the speaking character based on appearance (e.g., "pink pig", "blonde woman", "man in suit")

{context_note}
Output JSON only:
{{
    "speaking_character": "short label" or null,
    "visible_characters": ["short label 1", "short label 2"],
    "confidence": 0.0-1.0,
    "reasoning": "brief explanation"
}}"""

        return f"""This frame is captured at a moment when someone is SPEAKING in the video.

Known characters in this video: {char_list}
{narrator_note}
{context_note}
IMPORTANT: Only use character names from the known list above.

Task:
1. Look for a character with MOUTH OPEN or TALKING GESTURE
2. Identify which known character is ACTIVELY SPEAKING
3. If no one on screen is speaking, indicate null (likely Narrator)

Output JSON only:
{{
    "speaking_character": "CharacterName" or "Narrator" or null,
    "visible_characters": ["Char1", "Char2"],
    "confidence": 0.0-1.0,
    "reasoning": "brief explanation"
}}"""
    
    def _parse_response(
        self,
        frame: SpeakerFrame,
        content: str,
    ) -> SpeakerVisualResult:
        """Parse Vision LLM response."""
        try:
            # Strip markdown code fences
            text = content.strip()
            if "```" in text:
                start = text.find("```")
                text = text[start + 3:]
                if text.startswith("json"):
                    text = text[4:]
                end = text.rfind("```")
                if end != -1:
                    text = text[:end]
                text = text.strip()
            
            data = json.loads(text)
            
            speaking_char = data.get("speaking_character")
            if speaking_char and isinstance(speaking_char, str):
                speaking_char = speaking_char.strip()
                if speaking_char.lower() in ("null", "none", ""):
                    speaking_char = None
            else:
                speaking_char = None
            
            visible_chars = []
            raw_visible = data.get("visible_characters", [])
            if isinstance(raw_visible, list):
                for char in raw_visible:
                    if isinstance(char, str) and char.strip():
                        visible_chars.append(char.strip())

            raw_confidence = data.get("confidence", 0.5)
            try:
                confidence = float(raw_confidence)
            except (TypeError, ValueError):
                confidence = 0.5
            confidence = max(0.0, min(1.0, confidence))

            return SpeakerVisualResult(
                segment_id=frame.segment_id,
                speaker_id=frame.speaker_id,
                frame_path=frame.frame_path,
                timestamp=frame.timestamp,
                speaking_character=speaking_char,
                visible_characters=visible_chars,
                confidence=confidence,
                reasoning=str(data.get("reasoning", "")),
                status="success",
            )
            
        except (json.JSONDecodeError, KeyError, TypeError, ValueError) as e:
            logger.warning(f"Failed to parse response: {e}")
            # Return partial result
            return SpeakerVisualResult(
                segment_id=frame.segment_id,
                speaker_id=frame.speaker_id,
                frame_path=frame.frame_path,
                timestamp=frame.timestamp,
                status="failed",
                error=f"Parse error: {e}",
            )
    
    def _save_to_cache(self, results: List[SpeakerVisualResult]) -> None:
        """Save results to cache."""
        self.paths.ensure_dirs()
        cache_path = self.paths.analysis_dir / "speaker_visual_results.json"
        data = {
            "results": [r.to_dict() for r in results],
        }
        cache_path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    
    def _load_from_cache(self) -> List[SpeakerVisualResult]:
        """Load results from cache."""
        cache_path = self.paths.analysis_dir / "speaker_visual_results.json"
        data = json.loads(cache_path.read_text(encoding="utf-8"))
        return [SpeakerVisualResult.from_dict(r) for r in data.get("results", [])]
    
    def _has_cache(self) -> bool:
        """Check if cache exists."""
        cache_path = self.paths.analysis_dir / "speaker_visual_results.json"
        return cache_path.exists()
    
    def clear_cache(self) -> None:
        """Clear cache."""
        cache_path = self.paths.analysis_dir / "speaker_visual_results.json"
        if cache_path.exists():
            cache_path.unlink()
