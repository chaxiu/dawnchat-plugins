"""
v2_player cache_keys - Cache key generation for Smart Player v2.

Cache key strategy:
- Script cache: course_id + script_version + profile_hash + input_hash
- TTS cache: course_id + text_hash + speaker + quality
- Analysis cache: course_id + analysis_version + source_hash
"""

from __future__ import annotations

import hashlib
import json
from typing import Any, Dict, List, Optional


class V2CacheKeys:
    """
    Cache key generator for v2_player.
    """
    
    SCRIPT_VERSION = "1.0"
    ANALYSIS_VERSION = "1.0"
    
    @staticmethod
    def compute_hash(data: Any) -> str:
        """
        Compute SHA256 hash of data.
        
        Args:
            data: Data to hash (will be JSON serialized)
        
        Returns:
            64-character hex hash
        """
        if isinstance(data, str):
            raw = data.encode("utf-8")
        else:
            raw = json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
        return hashlib.sha256(raw).hexdigest()
    
    @staticmethod
    def short_hash(data: Any, length: int = 16) -> str:
        """
        Compute short hash of data.
        
        Args:
            data: Data to hash
            length: Desired hash length (default 16)
        
        Returns:
            Truncated hex hash
        """
        return V2CacheKeys.compute_hash(data)[:length]
    
    # ========================================================================
    # Script cache keys
    # ========================================================================
    
    @classmethod
    def script_cache_key(
        cls,
        *,
        course_id: str,
        subtitles_hash: str,
        profile_hash: str = "",
        generator: str = "rule",
    ) -> str:
        """
        Generate cache key for SmartScript.
        
        Args:
            course_id: Course identifier
            subtitles_hash: Hash of subtitle data
            profile_hash: Hash of user profile/preferences
            generator: Script generator type ("rule" or "llm")
        
        Returns:
            Cache key string
        """
        components = [
            f"script:{cls.SCRIPT_VERSION}",
            f"course:{course_id}",
            f"subs:{subtitles_hash[:16]}",
            f"profile:{profile_hash[:16] if profile_hash else 'default'}",
            f"gen:{generator}",
        ]
        return ":".join(components)
    
    @classmethod
    def script_input_hash(
        cls,
        *,
        subtitles: List[Dict[str, Any]],
        timeline_features: Optional[Dict[str, Any]] = None,
        scenes: Optional[List[Dict[str, Any]]] = None,
        visual_features: Optional[List[Dict[str, Any]]] = None,
        speaker_map: Optional[Dict[str, str]] = None,
    ) -> str:
        """
        Compute hash of script generation inputs.
        
        Args:
            subtitles: Subtitle data
            timeline_features: Gap and density info
            scenes: Scene detection results
            visual_features: Vision LLM results
            speaker_map: Speaker ID to name mapping
        
        Returns:
            Input hash
        """
        payload = {
            "subtitles": subtitles,
            "timeline_features": timeline_features,
            "scenes": scenes,
            "visual_features": visual_features,
            "speaker_map": speaker_map,
        }
        return cls.compute_hash(payload)
    
    # ========================================================================
    # TTS cache keys
    # ========================================================================
    
    @classmethod
    def tts_cache_key(
        cls,
        *,
        course_id: str,
        text: str,
        speaker: str = "Emma",
        quality: str = "fast",
        engine: str = "vibevoice",
        model_id: Optional[str] = None,
    ) -> str:
        """
        Generate cache key for TTS audio.
        
        Args:
            course_id: Course identifier
            text: Text to synthesize
            speaker: TTS speaker name
            quality: TTS quality setting
        
        Returns:
            Cache key string
        """
        text_hash = cls.short_hash(text, 16)
        return f"tts:{course_id}:{text_hash}:{engine}:{model_id or ''}:{speaker}:{quality}"
    
    # ========================================================================
    # Analysis cache keys
    # ========================================================================
    
    @classmethod
    def analysis_cache_key(
        cls,
        *,
        course_id: str,
        subtitle_path: str,
        video_path: Optional[str] = None,
    ) -> str:
        """
        Generate cache key for analysis bundle.
        
        Args:
            course_id: Course identifier
            subtitle_path: Path to subtitle file
            video_path: Path to video file (optional)
        
        Returns:
            Cache key string
        """
        source_hash = cls.short_hash({
            "subtitle_path": subtitle_path,
            "video_path": video_path,
        }, 16)
        return f"analysis:{cls.ANALYSIS_VERSION}:{course_id}:{source_hash}"
    
    # ========================================================================
    # Subtitle hash
    # ========================================================================
    
    @classmethod
    def subtitles_hash(cls, subtitles: List[Dict[str, Any]]) -> str:
        """
        Compute hash of subtitle data.
        
        Args:
            subtitles: List of subtitle segments
        
        Returns:
            Hash string
        """
        # Only hash essential fields to avoid false cache misses
        essential = [
            {
                "index": s.get("index"),
                "start_time": round(s.get("start_time", 0), 3),
                "end_time": round(s.get("end_time", 0), 3),
                "text": s.get("text", ""),
            }
            for s in subtitles
        ]
        return cls.compute_hash(essential)
