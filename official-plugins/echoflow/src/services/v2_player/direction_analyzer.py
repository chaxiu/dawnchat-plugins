"""
v2_player direction_analyzer - LLM-based content direction analysis.

This module analyzes video/audio content to suggest appropriate narration directions.
It examines subtitles, speaker patterns, visual features, and user profile to recommend
which types of commentary would be most valuable.

Usage:
    from services.v2_player.direction_analyzer import DirectionAnalyzer
    
    analyzer = DirectionAnalyzer()
    suggestions = await analyzer.analyze(bundle, title="Video Title", user_profile={...})
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from dawnchat_sdk.host import host

from storage.v2_player import (
    AnalysisBundle,
    NarrationDirectives,
    DIRECTION_TYPES,
    COURSE_TYPES,
)

logger = logging.getLogger("echoflow.v2_player.direction_analyzer")


class DirectionAnalyzerError(Exception):
    """Raised when direction analysis fails."""
    pass


@dataclass
class DirectionSuggestion:
    """A single direction suggestion with confidence."""
    direction_type: str                 # Key from DIRECTION_TYPES
    label: str                          # Human-readable label
    selected: bool = True               # Default selection state
    confidence: float = 0.0             # 0.0 to 1.0
    reason: str = ""                    # Why this direction is suggested
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "direction_type": self.direction_type,
            "label": self.label,
            "selected": self.selected,
            "confidence": self.confidence,
            "reason": self.reason,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DirectionSuggestion":
        return cls(
            direction_type=str(data.get("direction_type", "")),
            label=str(data.get("label", "")),
            selected=bool(data.get("selected", True)),
            confidence=float(data.get("confidence", 0.0)),
            reason=str(data.get("reason", "")),
        )


@dataclass
class DirectionSuggestions:
    """Complete direction analysis result."""
    course_type: str = "general"        # Detected course type
    course_type_confidence: float = 0.0
    course_type_reason: str = ""
    
    suggestions: List[DirectionSuggestion] = field(default_factory=list)
    
    # Analysis metadata
    analyzed_at: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "course_type": self.course_type,
            "course_type_confidence": self.course_type_confidence,
            "course_type_reason": self.course_type_reason,
            "suggestions": [s.to_dict() for s in self.suggestions],
            "analyzed_at": self.analyzed_at,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DirectionSuggestions":
        return cls(
            course_type=str(data.get("course_type", "general")),
            course_type_confidence=float(data.get("course_type_confidence", 0.0)),
            course_type_reason=str(data.get("course_type_reason", "")),
            suggestions=[DirectionSuggestion.from_dict(s) for s in data.get("suggestions", [])],
            analyzed_at=data.get("analyzed_at"),
        )
    
    def get_selected_directions(self) -> List[str]:
        """Get list of selected direction types."""
        return [s.direction_type for s in self.suggestions if s.selected]
    
    def to_directives(
        self,
        *,
        audience: str = "adult",
        english_level: str = "intermediate",
        narration_lang: str = "zh",
        focus_level: str = "medium",
    ) -> NarrationDirectives:
        """Convert to NarrationDirectives for pipeline."""
        return NarrationDirectives(
            directions=self.get_selected_directions(),
            focus_level=focus_level,
            course_type=self.course_type,
            audience=audience,
            english_level=english_level,
            narration_lang=narration_lang,
        )


class DirectionAnalyzer:
    """
    LLM-based content direction analyzer.
    
    Analyzes video content and suggests appropriate narration directions.
    """
    
    def __init__(
        self,
        *,
        model: Optional[str] = None,
        max_subtitle_chars: int = 3000,
    ):
        """
        Initialize analyzer.
        
        Args:
            model: LLM model to use (None for default)
            max_subtitle_chars: Max characters of subtitle text to send to LLM
        """
        self.model = model
        self.max_subtitle_chars = max_subtitle_chars
    
    async def analyze(
        self,
        bundle: AnalysisBundle,
        *,
        title: str = "",
        audience: str = "adult",
        english_level: str = "intermediate",
        narration_lang: str = "zh",
    ) -> DirectionSuggestions:
        """
        Analyze content and suggest narration directions.
        
        Args:
            bundle: Analysis bundle with subtitles, scenes, etc.
            title: Video/course title
            audience: Target audience ("adult" | "child")
            english_level: Learner's English level
            narration_lang: Narration language
        
        Returns:
            DirectionSuggestions with recommended directions
        """
        logger.info(f"Analyzing content for direction suggestions: {title}")
        
        # Build content summary for LLM
        content_summary = self._build_content_summary(bundle, title)
        
        # Build user profile context
        user_context = self._build_user_context(audience, english_level, narration_lang)
        
        # Call LLM for analysis
        try:
            result = await self._call_llm(content_summary, user_context, narration_lang)
            logger.info(f"Direction analysis complete: {result.course_type}, {len(result.suggestions)} suggestions")
            return result
        except Exception as e:
            logger.error(f"Direction analysis failed: {e}")
            # Return default suggestions on failure
            return self._get_default_suggestions(narration_lang)
    
    def _build_content_summary(self, bundle: AnalysisBundle, title: str) -> str:
        """Build content summary for LLM analysis."""
        parts = []
        
        # Title
        if title:
            parts.append(f"Title: {title}")
        
        # Subtitle statistics
        if bundle.subtitles:
            total_duration = 0.0
            total_words = 0
            sample_texts = []
            
            for sub in bundle.subtitles:
                total_duration += sub.duration
                total_words += sub.word_count
                if len(sample_texts) < 10:
                    sample_texts.append(sub.text)
            
            parts.append(f"Duration: {total_duration:.0f}s, Words: {total_words}")
            parts.append("Sample subtitles (first 10):")
            for i, text in enumerate(sample_texts):
                parts.append(f"  [{i}] {text[:100]}")
            
            # Add more samples from middle and end
            mid_idx = len(bundle.subtitles) // 2
            end_idx = max(0, len(bundle.subtitles) - 5)
            
            if mid_idx > 10:
                parts.append("Sample subtitles (middle):")
                for sub in bundle.subtitles[mid_idx:mid_idx+3]:
                    parts.append(f"  {sub.text[:100]}")
            
            if end_idx > mid_idx + 3:
                parts.append("Sample subtitles (end):")
                for sub in bundle.subtitles[end_idx:end_idx+3]:
                    parts.append(f"  {sub.text[:100]}")
        
        # Speaker information
        if bundle.diarization:
            speaker_ids = set(d.speaker_id for d in bundle.diarization)
            parts.append(f"Speakers detected: {len(speaker_ids)}")
        
        # Visual features
        if bundle.visual_features:
            parts.append(f"Scenes analyzed: {len(bundle.visual_features)}")
            for vf in bundle.visual_features[:3]:
                if vf.caption:
                    parts.append(f"  Scene {vf.scene_id}: {vf.caption[:80]}")
        
        # Limit total length
        summary = "\n".join(parts)
        if len(summary) > self.max_subtitle_chars:
            summary = summary[:self.max_subtitle_chars] + "\n..."
        
        return summary
    
    def _build_user_context(
        self,
        audience: str,
        english_level: str,
        narration_lang: str,
    ) -> str:
        """Build user profile context."""
        parts = []
        parts.append(f"Audience: {audience}")
        parts.append(f"English level: {english_level}")
        parts.append(f"Narration language: {narration_lang}")
        return "\n".join(parts)
    
    async def _call_llm(
        self,
        content_summary: str,
        user_context: str,
        narration_lang: str,
    ) -> DirectionSuggestions:
        """Call LLM for direction analysis."""
        is_zh = narration_lang.startswith("zh")
        
        # Build direction options string
        direction_options = "\n".join([
            f"- {key}: {label}" for key, label in DIRECTION_TYPES.items()
        ])
        course_type_options = "\n".join([
            f"- {key}: {label}" for key, label in COURSE_TYPES.items()
        ])
        
        if is_zh:
            system_prompt = f"""你是一个视频内容分析助手，负责分析视频素材并推荐适合的解说方向。

可选的解说方向（direction_type）：
{direction_options}

可选的内容类型（course_type）：
{course_type_options}

请根据视频内容和用户画像，输出 JSON 格式的分析结果：
{{
  "course_type": "检测到的内容类型",
  "course_type_confidence": 0.0-1.0,
  "course_type_reason": "判断原因",
  "suggestions": [
    {{
      "direction_type": "方向类型key",
      "label": "方向标签",
      "selected": true/false,
      "confidence": 0.0-1.0,
      "reason": "推荐原因"
    }}
  ]
}}

规则：
1. 根据内容特征判断 course_type
2. 为每个可能相关的方向给出建议
3. selected=true 表示默认勾选该方向
4. 至少选择 2-3 个方向
5. 不要选择与内容无关的方向
6. 只输出 JSON，不要其他内容"""
            
            user_prompt = f"""内容摘要：
{content_summary}

用户画像：
{user_context}

请分析并输出 JSON。"""
        else:
            system_prompt = f"""You are a video content analyzer that recommends appropriate narration directions.

Available direction types:
{direction_options}

Available course types:
{course_type_options}

Output JSON format:
{{
  "course_type": "detected course type",
  "course_type_confidence": 0.0-1.0,
  "course_type_reason": "reasoning",
  "suggestions": [
    {{
      "direction_type": "type key",
      "label": "label",
      "selected": true/false,
      "confidence": 0.0-1.0,
      "reason": "why recommended"
    }}
  ]
}}

Rules:
1. Detect course_type based on content
2. Suggest relevant directions
3. selected=true means default checked
4. Select at least 2-3 directions
5. Only output JSON"""
            
            user_prompt = f"""Content summary:
{content_summary}

User profile:
{user_context}

Analyze and output JSON."""
        
        response = await host.ai.chat(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            model=self.model,
            temperature=0.3,
        )
        
        if response.get("status") != "success":
            raise DirectionAnalyzerError(f"LLM call failed: {response.get('message')}")
        
        content = response.get("content", "")
        return self._parse_llm_response(content, narration_lang)
    
    def _parse_llm_response(self, content: str, narration_lang: str) -> DirectionSuggestions:
        """Parse LLM response into DirectionSuggestions."""
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
            
            # Parse course type
            course_type = str(data.get("course_type", "general"))
            if course_type not in COURSE_TYPES:
                course_type = "general"
            
            # Parse suggestions
            suggestions = []
            for item in data.get("suggestions", []):
                if not isinstance(item, dict):
                    continue
                
                direction_type = str(item.get("direction_type", ""))
                if direction_type not in DIRECTION_TYPES:
                    continue
                
                label = str(item.get("label", DIRECTION_TYPES.get(direction_type, direction_type)))
                
                suggestions.append(DirectionSuggestion(
                    direction_type=direction_type,
                    label=label,
                    selected=bool(item.get("selected", True)),
                    confidence=float(item.get("confidence", 0.5)),
                    reason=str(item.get("reason", "")),
                ))
            
            # Ensure at least some suggestions
            if not suggestions:
                return self._get_default_suggestions(narration_lang)
            
            from datetime import datetime
            
            return DirectionSuggestions(
                course_type=course_type,
                course_type_confidence=float(data.get("course_type_confidence", 0.5)),
                course_type_reason=str(data.get("course_type_reason", "")),
                suggestions=suggestions,
                analyzed_at=datetime.utcnow().isoformat(),
            )
            
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            logger.warning(f"Failed to parse LLM response: {e}")
            return self._get_default_suggestions(narration_lang)
    
    def _get_default_suggestions(self, narration_lang: str) -> DirectionSuggestions:
        """Get default suggestions when analysis fails."""
        from datetime import datetime
        
        is_zh = narration_lang.startswith("zh")
        
        suggestions = [
            DirectionSuggestion(
                direction_type="english_vocab",
                label=DIRECTION_TYPES["english_vocab"],
                selected=True,
                confidence=0.5,
                reason="默认方向" if is_zh else "Default direction",
            ),
            DirectionSuggestion(
                direction_type="culture_bg",
                label=DIRECTION_TYPES["culture_bg"],
                selected=True,
                confidence=0.5,
                reason="默认方向" if is_zh else "Default direction",
            ),
            DirectionSuggestion(
                direction_type="summary_recap",
                label=DIRECTION_TYPES["summary_recap"],
                selected=False,
                confidence=0.3,
                reason="可选方向" if is_zh else "Optional direction",
            ),
        ]
        
        return DirectionSuggestions(
            course_type="general",
            course_type_confidence=0.5,
            course_type_reason="默认分类" if is_zh else "Default classification",
            suggestions=suggestions,
            analyzed_at=datetime.utcnow().isoformat(),
        )

