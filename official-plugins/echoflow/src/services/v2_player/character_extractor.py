"""
v2_player character_extractor - Extract character candidates from content.

This module analyzes video title and subtitles to extract character names
that will be used as closed-set for Vision recognition.

This avoids generic descriptions like "a pink pig in red dress" and instead
provides known names like "Peppa" for the Vision model to choose from.

Usage:
    from services.v2_player.character_extractor import CharacterExtractor
    
    extractor = CharacterExtractor()
    candidates = await extractor.extract(bundle, title="Peppa Pig - School Day")
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional

from dawnchat_sdk.host import host

from storage.v2_player import (
    AnalysisBundle,
    CharacterCandidates,
    SubtitleData,
    V2PlayerPaths,
)

logger = logging.getLogger("echoflow.v2_player.character_extractor")


class CharacterExtractionError(Exception):
    """Raised when character extraction fails."""
    pass


class CharacterExtractor:
    """
    LLM-based character name extractor.
    
    Analyzes title and subtitles to extract:
    1. Character names (proper nouns, names mentioned in dialogue)
    2. Whether there's a narrator
    3. Narrator hints (how narrator is referenced)
    """
    
    # Default sampling limits
    DEFAULT_MAX_SUBTITLES = 100       # Max subtitles to sample
    DEFAULT_SAMPLE_FROM_START = 30    # Subtitles from beginning
    DEFAULT_SAMPLE_FROM_MIDDLE = 20   # Subtitles from middle
    DEFAULT_SAMPLE_FROM_END = 20      # Subtitles from end
    
    def __init__(
        self,
        paths: Optional[V2PlayerPaths] = None,
        *,
        model: Optional[str] = None,
        max_subtitles: int = DEFAULT_MAX_SUBTITLES,
    ):
        """
        Initialize extractor.
        
        Args:
            paths: V2PlayerPaths for caching (optional)
            model: LLM model to use (None for default)
            max_subtitles: Maximum subtitles to sample
        """
        self.paths = paths
        self.model = model
        self.max_subtitles = max_subtitles
    
    async def extract(
        self,
        bundle: AnalysisBundle,
        *,
        title: str = "",
        skip_existing: bool = True,
    ) -> CharacterCandidates:
        """
        Extract character candidates from content.
        
        Args:
            bundle: Analysis bundle with subtitles
            title: Video/course title
            skip_existing: Skip if cached result exists
        
        Returns:
            CharacterCandidates with extracted names
        """
        logger.info(f"Extracting character candidates from: {title or '(no title)'}")
        
        # Check cache
        if skip_existing and self.paths:
            cached = self._load_from_cache()
            if cached:
                logger.info(f"Using cached candidates: {len(cached.characters)} characters")
                return cached
        
        # Sample subtitles
        sampled_subtitles = self._sample_subtitles(bundle.subtitles)
        
        # Build content for LLM
        content_text = self._build_content_text(title, sampled_subtitles)
        
        # Call LLM for extraction
        try:
            result = await self._call_llm(content_text)
            logger.info(f"Extracted {len(result.characters)} characters, narrator={result.has_narrator}")
            
            # Cache result
            if self.paths:
                self._save_to_cache(result)
            
            return result
        except Exception as e:
            logger.error(f"Character extraction failed: {e}")
            # Return empty candidates on failure
            return CharacterCandidates()
    
    def _sample_subtitles(self, subtitles: List[SubtitleData]) -> List[SubtitleData]:
        """
        Sample subtitles from different parts of the video.
        
        Takes samples from start, middle, and end to capture all characters.
        """
        if not subtitles:
            return []
        
        total = len(subtitles)
        
        if total <= self.max_subtitles:
            return subtitles
        
        # Calculate sample ranges
        start_end = min(self.DEFAULT_SAMPLE_FROM_START, total // 3)
        middle_start = total // 2 - self.DEFAULT_SAMPLE_FROM_MIDDLE // 2
        middle_end = middle_start + self.DEFAULT_SAMPLE_FROM_MIDDLE
        end_start = max(0, total - self.DEFAULT_SAMPLE_FROM_END)
        
        # Collect samples
        sampled = []
        sampled.extend(subtitles[:start_end])
        sampled.extend(subtitles[middle_start:middle_end])
        sampled.extend(subtitles[end_start:])
        
        # Remove duplicates while preserving order
        seen = set()
        unique = []
        for sub in sampled:
            if sub.index not in seen:
                seen.add(sub.index)
                unique.append(sub)

        if len(unique) >= self.max_subtitles:
            return unique[:self.max_subtitles]

        remaining = self.max_subtitles - len(unique)
        if remaining <= 0:
            return unique[:self.max_subtitles]

        stride = max(1, total // (remaining + 1))
        for i in range(0, total, stride):
            sub = subtitles[i]
            if sub.index in seen:
                continue
            seen.add(sub.index)
            unique.append(sub)
            if len(unique) >= self.max_subtitles:
                break

        return unique[:self.max_subtitles]
    
    def _build_content_text(
        self,
        title: str,
        subtitles: List[SubtitleData],
    ) -> str:
        """Build content text for LLM analysis."""
        parts = []
        
        if title:
            parts.append(f"Title: {title}")
            parts.append("")
        
        parts.append("Subtitle samples:")
        for sub in subtitles:
            # Include subtitle text (truncate if too long)
            text = sub.text[:200] if len(sub.text) > 200 else sub.text
            speaker_id = sub.speaker_id or "-"
            parts.append(f"[{sub.index}][{speaker_id}] {text}")
        
        return "\n".join(parts)
    
    async def _call_llm(self, content_text: str) -> CharacterCandidates:
        """Call LLM for character extraction."""
        system_prompt = """You are a content analyzer that extracts CHARACTER candidates from video subtitles.

Your task:
1. Extract named entities and decide whether they are CHARACTERS or OBJECTS
2. Output only CHARACTERS in the final character list
3. Determine if there's a narrator (someone speaking off-screen / not participating in the scene)
4. Identify how the narrator is referenced if present

Rules:
- Extract proper names (e.g., "Peppa", "George", "Mummy Pig")
- Do NOT include generic descriptions (e.g., "the pig", "a man")
- Do NOT treat objects/toys/props as characters unless they clearly speak or are treated as a speaking character
- Use dialogue patterns like "said X", "X asked", direct address, or turn-taking as evidence of a character
- Narrator indicators: off-screen storytelling tone, no on-screen speaker, third-person narration

Output JSON only. Preferred format:
{
  "entities": [
    {
      "name": "Name",
      "kind": "character" | "object" | "place" | "other",
      "is_speaking": true | false,
      "evidence": ["short evidence snippets from the subtitles"]
    }
  ],
  "characters": ["CharacterName1", "CharacterName2"],
  "has_narrator": true/false,
  "narrator_hints": ["Narrator"],
  "confidence": 0.0-1.0,
  "evidence": {
    "notes": "optional"
  }
}"""

        user_prompt = f"""Analyze this content and extract character names:

{content_text}

Output JSON only."""

        response = await host.ai.chat(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            model=self.model,
            temperature=0.2,
        )
        
        if response.get("status") != "success":
            raise CharacterExtractionError(f"LLM call failed: {response.get('message')}")
        
        content = response.get("content", "")
        return self._parse_llm_response(content)
    
    def _parse_llm_response(self, content: str) -> CharacterCandidates:
        """Parse LLM response into CharacterCandidates."""
        try:
            # Strip markdown code fences if present
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

            entities = data.get("entities", [])
            characters: List[str] = []
            if isinstance(entities, list) and entities:
                for ent in entities:
                    if not isinstance(ent, dict):
                        continue
                    name = str(ent.get("name") or "").strip()
                    if not name or self._is_generic_description(name):
                        continue
                    kind = str(ent.get("kind") or "").strip().lower()
                    if kind != "character":
                        continue
                    characters.append(name)
            else:
                raw_characters = data.get("characters", [])
                for char in raw_characters:
                    if isinstance(char, str) and char.strip():
                        name = char.strip()
                        if not self._is_generic_description(name):
                            characters.append(name)
            
            # Deduplicate while preserving order
            seen = set()
            unique_chars = []
            for char in characters:
                char_lower = char.lower()
                if char_lower not in seen:
                    seen.add(char_lower)
                    unique_chars.append(char)

            has_narrator = bool(data.get("has_narrator", False))
            raw_hints = data.get("narrator_hints")
            narrator_hints: List[str] = []
            if isinstance(raw_hints, list):
                narrator_hints = [str(h).strip() for h in raw_hints if isinstance(h, (str, int, float)) and str(h).strip()]
            elif isinstance(raw_hints, str) and raw_hints.strip():
                narrator_hints = [raw_hints.strip()]
            if has_narrator and not narrator_hints:
                narrator_hints = ["Narrator"]

            raw_confidence = data.get("confidence", 0.5)
            try:
                confidence = float(raw_confidence)
            except (TypeError, ValueError):
                confidence = 0.5
            confidence = max(0.0, min(1.0, confidence))

            return CharacterCandidates(
                characters=unique_chars,
                has_narrator=has_narrator,
                narrator_hints=narrator_hints,
                confidence=confidence,
                source_evidence={
                    **dict(data.get("evidence", {}) or {}),
                    **({"entities": entities} if isinstance(entities, list) and entities else {}),
                },
            )
            
        except (json.JSONDecodeError, KeyError, TypeError, ValueError) as e:
            logger.warning(f"Failed to parse LLM response: {e}")
            return CharacterCandidates()
    
    def _is_generic_description(self, name: str) -> bool:
        """Check if a name is a generic description rather than a proper name."""
        generic_patterns = [
            "the ", "a ", "an ",
            "man", "woman", "boy", "girl", "child", "person",
            "pig", "dog", "cat", "animal",
            "someone", "somebody", "everyone",
        ]
        name_lower = name.lower()
        
        for pattern in generic_patterns:
            if name_lower.startswith(pattern) or name_lower == pattern.strip():
                return True
        
        return False
    
    def _save_to_cache(self, candidates: CharacterCandidates) -> None:
        """Save candidates to cache."""
        if not self.paths:
            return
        
        self.paths.ensure_dirs()
        cache_path = self.paths.analysis_dir / "character_candidates.json"
        cache_path.write_text(
            json.dumps(candidates.to_dict(), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    
    def _load_from_cache(self) -> Optional[CharacterCandidates]:
        """Load candidates from cache."""
        if not self.paths:
            return None
        
        cache_path = self.paths.analysis_dir / "character_candidates.json"
        if not cache_path.exists():
            return None
        
        try:
            data = json.loads(cache_path.read_text(encoding="utf-8"))
            return CharacterCandidates.from_dict(data)
        except Exception:
            return None
    
    def has_cache(self) -> bool:
        """Check if cache exists."""
        if not self.paths:
            return False
        cache_path = self.paths.analysis_dir / "character_candidates.json"
        return cache_path.exists()
    
    def clear_cache(self) -> None:
        """Clear cache."""
        if not self.paths:
            return
        cache_path = self.paths.analysis_dir / "character_candidates.json"
        if cache_path.exists():
            cache_path.unlink()
