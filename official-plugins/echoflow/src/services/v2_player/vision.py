"""
v2_player vision - Vision LLM service for scene analysis.

This module provides visual recognition functionality for Smart Player v2.
It uses Host's AI capability with multimodal models (e.g., GPT-4o) to:
1. Generate scene captions (what's happening in the frame)
2. Identify characters in the frame
3. Recognize speaking characters

Key features:
- Automatic image compression before sending to Vision LLM (saves tokens)
- Concurrent analysis with configurable parallelism
- Cached results to avoid redundant API calls

Usage:
    from services.v2_player.vision import VisionService
    
    service = VisionService(paths)
    features = await service.analyze_keyframes(keyframe_paths)
"""

from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from dawnchat_sdk.host import host

from storage.v2_player import CharacterCandidates, VisualFeatures, V2PlayerPaths

logger = logging.getLogger("echoflow.v2_player.vision")

# Image compression settings (passed to Host's vision_chat API)
DEFAULT_MAX_SIDE = 1024  # Maximum dimension (width or height)
DEFAULT_JPEG_QUALITY = 85  # JPEG compression quality


class VisionError(Exception):
    """Raised when vision analysis fails."""
    pass


# Prompts for Vision LLM
SCENE_CAPTION_PROMPT = """Analyze this video frame and provide:
1. A brief scene description (1-2 sentences, what's happening)
2. List of visible characters (by appearance, e.g., "blonde woman", "man in suit")
3. Who appears to be speaking (if determinable from mouth movement/gesture)

Respond in JSON format:
{
    "caption": "Scene description here",
    "characters": ["character 1", "character 2"],
    "speaking": "character who appears to be speaking or null"
}"""

CHARACTER_RECOGNITION_PROMPT = """Look at this video frame and identify:
1. All visible people/characters
2. Their distinguishing features (hair color, clothing, position)
3. Who appears to be speaking based on body language

For animated content, describe animated characters.
For live action, describe the people visible.

Respond in JSON format:
{
    "characters": [
        {"id": "person_1", "description": "short description"},
        {"id": "person_2", "description": "short description"}
    ],
    "speaking_character": "person_1 or null"
}"""


class VisionService:
    """
    Vision LLM service for scene analysis.
    
    Uses multimodal AI models to analyze keyframes and extract:
    - Scene descriptions
    - Character identification
    - Speaking character detection
    
    Features:
    - Automatic image compression (configurable max_side and quality)
    - Concurrent API calls with semaphore control
    - Result caching to avoid redundant calls
    """
    
    # Supported image extensions
    SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    
    def __init__(
        self,
        paths: V2PlayerPaths,
        *,
        model: Optional[str] = None,
        max_concurrent: int = 3,
        max_side: int = DEFAULT_MAX_SIDE,
        jpeg_quality: int = DEFAULT_JPEG_QUALITY,
    ):
        """
        Initialize vision service.
        
        Args:
            paths: V2PlayerPaths instance for this course
            model: Model to use for vision (default: let Host choose)
            max_concurrent: Maximum concurrent API calls
            max_side: Maximum image dimension (compresses if larger)
            jpeg_quality: JPEG compression quality (1-100)
        """
        self.paths = paths
        self.model = model
        self.max_concurrent = max_concurrent
        self.max_side = max_side
        self.jpeg_quality = max(1, min(100, jpeg_quality))
        self._semaphore: Optional[asyncio.Semaphore] = None
    
    async def analyze_keyframes(
        self,
        keyframe_paths: List[str],
        scene_ids: Optional[List[int]] = None,
        *,
        character_candidates: Optional[CharacterCandidates] = None,
        skip_existing: bool = True,
    ) -> List[VisualFeatures]:
        """
        Analyze keyframes using Vision LLM with concurrent API calls.
        
        Args:
            keyframe_paths: List of paths to keyframe images
            scene_ids: Optional list of scene IDs (must match length of keyframe_paths)
            character_candidates: Optional character candidates for closed-set recognition
            skip_existing: Skip if analysis already exists
        
        Returns:
            List of VisualFeatures
        
        Raises:
            VisionError: If analysis fails
        """
        # Check for existing result
        if skip_existing and self.paths.visual_features_json.exists():
            logger.info("Using existing visual features")
            return self._load_from_cache()
        
        if not keyframe_paths:
            logger.warning("No keyframes to analyze")
            return []
        
        # Validate scene_ids
        if scene_ids is None:
            scene_ids = list(range(len(keyframe_paths)))
        elif len(scene_ids) != len(keyframe_paths):
            raise VisionError("scene_ids must match keyframe_paths length")
        
        # Build prompt based on whether candidates are available
        prompt = self._build_scene_prompt(character_candidates)
        
        logger.info(f"Analyzing {len(keyframe_paths)} keyframes (max_concurrent={self.max_concurrent})")
        
        # Create semaphore for concurrent control
        semaphore = asyncio.Semaphore(self.max_concurrent)
        self._semaphore = semaphore
        
        async def analyze_with_semaphore(
            path: str, scene_id: int, index: int
        ) -> Tuple[int, VisualFeatures]:
            """Wrapper to control concurrency."""
            async with semaphore:
                try:
                    features = await self._analyze_single_frame(path, scene_id, prompt)
                    logger.debug(f"Analyzed keyframe {index+1}/{len(keyframe_paths)}")
                    return (index, features)
                except Exception as e:
                    logger.warning(f"Failed to analyze keyframe {path}: {e}")
                    return (index, VisualFeatures(scene_id=scene_id))
        
        # Run all analyses concurrently with semaphore control
        tasks = [
            analyze_with_semaphore(path, scene_id, i)
            for i, (path, scene_id) in enumerate(zip(keyframe_paths, scene_ids))
        ]
        results_with_index = await asyncio.gather(*tasks)
        
        # Sort by index to maintain order
        results_with_index.sort(key=lambda x: x[0])
        results = [r[1] for r in results_with_index]
        
        # Save to cache
        self._save_to_cache(results)
        
        logger.info(f"Visual analysis complete: {len(results)} frames analyzed")
        
        return results
    
    def _build_scene_prompt(
        self,
        candidates: Optional[CharacterCandidates],
    ) -> str:
        """
        Build prompt for scene analysis.
        
        If candidates available, uses closed-set recognition.
        Otherwise, uses generic scene description prompt.
        """
        if candidates and candidates.characters:
            # Closed-set prompt with known characters
            char_list = ", ".join(candidates.get_all_names())
            return f"""Analyze this video frame.

Known characters in this video: {char_list}

Task:
1. Describe what is happening in the scene (1-2 sentences)
2. Identify which known characters are visible (use names from the list above)
3. Identify the setting/location
4. If determinable, who appears to be speaking (mouth open/talking gesture)

IMPORTANT: Use character names from the known list when describing characters.

Output JSON:
{{
    "caption": "Scene description here",
    "characters": ["Character1", "Character2"],
    "setting": "location description",
    "speaking": "CharacterName" or null
}}"""
        else:
            # Generic prompt (legacy behavior)
            return SCENE_CAPTION_PROMPT
    
    async def _analyze_single_frame(
        self,
        image_path: str,
        scene_id: int,
        prompt: Optional[str] = None,
    ) -> VisualFeatures:
        """
        Analyze a single keyframe using Host's vision_chat API.
        
        Host API automatically handles image compression.
        
        Args:
            image_path: Path to image file
            scene_id: Scene ID for this frame
            prompt: Prompt to use (defaults to SCENE_CAPTION_PROMPT)
        
        Returns:
            VisualFeatures
        """
        path = Path(image_path)
        
        if not path.exists():
            raise VisionError(f"Image not found: {image_path}")
        
        if path.suffix.lower() not in self.SUPPORTED_EXTENSIONS:
            raise VisionError(f"Unsupported image format: {path.suffix}")
        
        try:
            # Use Host's vision_chat API (auto-compresses image)
            kwargs: Dict[str, Any] = {
                "image_path": str(path),
                "prompt": prompt or SCENE_CAPTION_PROMPT,
                "max_side": self.max_side,
                "quality": self.jpeg_quality,
            }
            if self.model:
                kwargs["model"] = self.model

            response = await host.ai.vision_chat(**kwargs)
            
            if response.get("code") != 200:
                error = response.get("message", "Unknown error")
                raise VisionError(f"Vision chat failed: {error}")
            
            content = response.get("data", {}).get("content", "")
            compression_meta = response.get("data", {}).get("compression_meta", {})
            
            if compression_meta.get("was_resized"):
                logger.debug(
                    f"Image compressed by Host: {path.name}, "
                    f"{compression_meta.get('original_size')} -> {compression_meta.get('resized_size')}"
                )
            
            # Parse JSON response
            features = self._parse_vision_response(content, scene_id)
            return features
            
        except VisionError:
            raise
        except Exception as e:
            logger.exception(f"Vision analysis failed for {image_path}")
            raise VisionError(f"Vision analysis failed: {e}") from e
    
    def _parse_vision_response(
        self,
        content: str,
        scene_id: int,
    ) -> VisualFeatures:
        """
        Parse Vision LLM response.
        
        Args:
            content: Raw response content
            scene_id: Scene ID
        
        Returns:
            VisualFeatures
        """
        # Try to extract JSON from response
        try:
            # Handle markdown code blocks
            if "```json" in content:
                start = content.find("```json") + 7
                end = content.find("```", start)
                content = content[start:end].strip()
            elif "```" in content:
                start = content.find("```") + 3
                end = content.find("```", start)
                content = content[start:end].strip()
            
            data = json.loads(content)
            
            caption = data.get("caption", "")
            characters = data.get("characters", [])
            speaking = data.get("speaking") or data.get("speaking_character")
            
            # Normalize characters
            if isinstance(characters, list):
                if characters and isinstance(characters[0], dict):
                    # Handle structured character format
                    characters = [
                        c.get("description", c.get("id", str(c)))
                        for c in characters
                    ]
            else:
                characters = []
            
            # Build tags
            tags = []
            if speaking:
                tags.append(f"speaking:{speaking}")
            
            return VisualFeatures(
                scene_id=scene_id,
                caption=caption,
                characters=characters,
                tags=tags,
            )
            
        except json.JSONDecodeError:
            # Fallback: treat entire content as caption
            logger.warning("Failed to parse vision response as JSON, using raw text")
            return VisualFeatures(
                scene_id=scene_id,
                caption=content[:500],  # Limit length
                characters=[],
                tags=[],
            )
    
    def _save_to_cache(self, features: List[VisualFeatures]) -> None:
        """Save visual features to cache."""
        self.paths.ensure_dirs()
        data = {
            "features": [f.to_dict() for f in features],
        }
        self.paths.visual_features_json.write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    
    def _load_from_cache(self) -> List[VisualFeatures]:
        """Load visual features from cache."""
        data = json.loads(
            self.paths.visual_features_json.read_text(encoding="utf-8")
        )
        return [
            VisualFeatures.from_dict(f)
            for f in data.get("features", [])
        ]
    
    def has_cache(self) -> bool:
        """Check if visual features cache exists."""
        return self.paths.visual_features_json.exists()
    
    def clear_cache(self) -> None:
        """Clear visual features cache."""
        if self.paths.visual_features_json.exists():
            self.paths.visual_features_json.unlink()
