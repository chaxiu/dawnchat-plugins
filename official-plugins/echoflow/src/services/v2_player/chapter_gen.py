"""
v2_player chapter_gen - LLM-based chapter generation.

This module generates chapter/section divisions for video content using LLM.
Chapters are used for navigation in the ChapterStrip component.

Usage:
    from services.v2_player.chapter_gen import ChapterGenerator
    
    generator = ChapterGenerator()
    chapters = await generator.generate(bundle, directives)
"""

from __future__ import annotations

import json
import logging
from typing import List, Optional

from dawnchat_sdk.host import host

from storage.v2_player import (
    AnalysisBundle,
    ChapterInfo,
    CharacterCandidates,
    NarrationDirectives,
)

logger = logging.getLogger("echoflow.v2_player.chapter_gen")


class ChapterGenError(Exception):
    """Raised when chapter generation fails."""
    pass


class ChapterGenerator:
    """
    LLM-based chapter generator.
    
    Generates chapter divisions based on content structure.
    """
    
    DEFAULT_MIN_CHAPTER_DURATION = 30.0   # Minimum chapter duration (seconds)
    DEFAULT_MAX_CHAPTERS = 20             # Maximum number of chapters
    
    def __init__(
        self,
        *,
        model: Optional[str] = None,
        min_chapter_duration: float = DEFAULT_MIN_CHAPTER_DURATION,
        max_chapters: int = DEFAULT_MAX_CHAPTERS,
    ):
        """
        Initialize generator.
        
        Args:
            model: LLM model to use (None for default)
            min_chapter_duration: Minimum chapter duration in seconds
            max_chapters: Maximum number of chapters to generate
        """
        self.model = model
        self.min_chapter_duration = min_chapter_duration
        self.max_chapters = max_chapters
    
    async def generate(
        self,
        bundle: AnalysisBundle,
        directives: Optional[NarrationDirectives] = None,
        *,
        title: str = "",
        character_candidates: Optional[CharacterCandidates] = None,
    ) -> List[ChapterInfo]:
        """
        Generate chapters for content.
        
        Args:
            bundle: Analysis bundle with subtitles, scenes, etc.
            directives: Narration directives (for context)
            title: Video/course title
            character_candidates: Character candidates for better titles
        
        Returns:
            List of ChapterInfo
        """
        logger.info(f"Generating chapters for: {title}")
        
        # Get total duration
        total_duration = self._get_total_duration(bundle)
        if total_duration <= 0:
            logger.warning("No content duration, skipping chapter generation")
            return []
        
        # For very short content, return single chapter
        if total_duration < self.min_chapter_duration * 2:
            return [ChapterInfo(
                chapter_id=0,
                title=title or "全部内容",
                start_time=0.0,
                end_time=total_duration,
                level=0,
            )]
        
        # Build content summary (with character candidates if available)
        content_summary = self._build_content_summary(bundle, title, character_candidates)
        
        # Get narration language
        narration_lang = "zh"
        if directives:
            narration_lang = directives.narration_lang or "zh"
        
        # Try LLM-based generation
        try:
            chapters = await self._generate_with_llm(
                content_summary,
                total_duration,
                narration_lang,
                character_candidates,
            )
            if chapters:
                logger.info(f"Generated {len(chapters)} chapters via LLM")
                return chapters
        except Exception as e:
            logger.warning(f"LLM chapter generation failed: {e}")
        
        # Fallback to scene-based generation
        if bundle.scenes:
            chapters = self._generate_from_scenes(bundle, title, narration_lang)
            if chapters:
                logger.info(f"Generated {len(chapters)} chapters from scenes")
                return chapters
        
        # Fallback to time-based generation
        chapters = self._generate_time_based(total_duration, title, narration_lang)
        logger.info(f"Generated {len(chapters)} time-based chapters")
        return chapters
    
    def _get_total_duration(self, bundle: AnalysisBundle) -> float:
        """Get total content duration."""
        duration = 0.0
        
        if bundle.subtitles:
            duration = max(duration, max(s.end_time for s in bundle.subtitles))
        
        if bundle.scenes:
            duration = max(duration, max(s.end_time for s in bundle.scenes))
        
        if bundle.diarization:
            duration = max(duration, max(d.end_time for d in bundle.diarization))
        
        return duration
    
    def _build_content_summary(
        self,
        bundle: AnalysisBundle,
        title: str,
        candidates: Optional[CharacterCandidates] = None,
    ) -> str:
        """Build content summary for LLM."""
        parts = []
        
        if title:
            parts.append(f"Title: {title}")
        
        # Add character information if available
        if candidates and candidates.characters:
            char_list = ", ".join(candidates.characters)
            parts.append(f"Characters: {char_list}")
            if candidates.has_narrator:
                parts.append("Note: This content has a narrator.")
        
        # Add subtitle text grouped by time segments
        if bundle.subtitles:
            total_duration = self._get_total_duration(bundle)
            segment_duration = max(60.0, total_duration / 10)  # ~10 segments
            
            current_segment = 0
            segment_texts = []
            
            for sub in bundle.subtitles:
                segment_idx = int(sub.start_time / segment_duration)
                if segment_idx != current_segment:
                    if segment_texts:
                        start_time = current_segment * segment_duration
                        parts.append(f"[{start_time:.0f}s] {' '.join(segment_texts[:3])[:200]}")
                    segment_texts = []
                    current_segment = segment_idx
                segment_texts.append(sub.text)
            
            # Add last segment
            if segment_texts:
                start_time = current_segment * segment_duration
                parts.append(f"[{start_time:.0f}s] {' '.join(segment_texts[:3])[:200]}")
        
        # Add scene descriptions
        if bundle.visual_features:
            parts.append("\nScene descriptions:")
            for vf in bundle.visual_features[:10]:
                if vf.caption:
                    scene = next((s for s in bundle.scenes if s.scene_id == vf.scene_id), None)
                    time_str = f"{scene.start_time:.0f}s" if scene else f"scene{vf.scene_id}"
                    parts.append(f"[{time_str}] {vf.caption[:100]}")
        
        return "\n".join(parts)
    
    async def _generate_with_llm(
        self,
        content_summary: str,
        total_duration: float,
        narration_lang: str,
        candidates: Optional[CharacterCandidates] = None,
    ) -> List[ChapterInfo]:
        """Generate chapters using LLM."""
        is_zh = narration_lang.startswith("zh")
        
        # Estimate reasonable chapter count
        estimated_chapters = min(
            self.max_chapters,
            max(2, int(total_duration / 120))  # ~1 chapter per 2 minutes
        )
        
        # Build character instruction
        char_instruction = ""
        if candidates and candidates.characters:
            char_list = ", ".join(candidates.characters)
            if is_zh:
                char_instruction = f"\n7. 在章节标题中使用已知角色名: {char_list}"
            else:
                char_instruction = f"\n7. Use known character names in titles: {char_list}"
        
        if is_zh:
            system_prompt = f"""你是一个视频内容分析助手，负责将视频划分成逻辑章节。

视频总时长: {total_duration:.0f}秒
建议章节数: {estimated_chapters}

请根据内容摘要，输出 JSON 格式的章节列表：
{{
  "chapters": [
    {{
      "chapter_id": 0,
      "title": "章节标题",
      "start_time": 0.0,
      "end_time": 60.0,
      "level": 0
    }}
  ]
}}

规则：
1. 章节标题要简洁有力，2-8个字
2. 时间范围必须连续覆盖整个视频
3. 每个章节至少 {self.min_chapter_duration:.0f} 秒
4. level=0 表示主章节，level=1 表示子章节（可选）
5. 根据内容的逻辑转折点划分章节
6. 只输出 JSON，不要其他内容{char_instruction}"""
        else:
            system_prompt = f"""You are a video content analyzer that divides videos into logical chapters.

Total duration: {total_duration:.0f}s
Suggested chapters: {estimated_chapters}

Output JSON format:
{{
  "chapters": [
    {{
      "chapter_id": 0,
      "title": "Chapter title",
      "start_time": 0.0,
      "end_time": 60.0,
      "level": 0
    }}
  ]
}}

Rules:
1. Titles should be concise (2-6 words)
2. Time ranges must cover the entire video
3. Each chapter at least {self.min_chapter_duration:.0f}s
4. level=0 for main chapters, level=1 for sub-chapters
5. Divide by logical transitions
6. Only output JSON{char_instruction}"""
        
        user_prompt = f"""内容摘要：
{content_summary}

请生成章节划分。"""
        
        response = await host.ai.chat(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            model=self.model,
            temperature=0.3,
        )
        
        if response.get("status") != "success":
            raise ChapterGenError(f"LLM call failed: {response.get('message')}")
        
        content = response.get("content", "")
        return self._parse_llm_response(content, total_duration)
    
    def _parse_llm_response(self, content: str, total_duration: float) -> List[ChapterInfo]:
        """Parse LLM response into chapters."""
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
            chapters_data = data.get("chapters", [])
            
            chapters = []
            for item in chapters_data:
                if not isinstance(item, dict):
                    continue
                
                chapter = ChapterInfo(
                    chapter_id=int(item.get("chapter_id", len(chapters))),
                    title=str(item.get("title", f"Chapter {len(chapters) + 1}")),
                    start_time=float(item.get("start_time", 0.0)),
                    end_time=float(item.get("end_time", total_duration)),
                    level=int(item.get("level", 0)),
                )
                chapters.append(chapter)
            
            # Validate and fix time ranges
            chapters = self._validate_chapters(chapters, total_duration)
            
            return chapters
            
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            logger.warning(f"Failed to parse LLM response: {e}")
            return []
    
    def _validate_chapters(
        self,
        chapters: List[ChapterInfo],
        total_duration: float,
    ) -> List[ChapterInfo]:
        """Validate and fix chapter time ranges."""
        if not chapters:
            return []
        
        # Sort by start time
        chapters = sorted(chapters, key=lambda c: c.start_time)
        
        # Ensure first chapter starts at 0
        if chapters[0].start_time > 0:
            chapters[0] = ChapterInfo(
                chapter_id=chapters[0].chapter_id,
                title=chapters[0].title,
                start_time=0.0,
                end_time=chapters[0].end_time,
                level=chapters[0].level,
            )
        
        # Ensure continuous coverage
        for i in range(len(chapters) - 1):
            if chapters[i].end_time != chapters[i + 1].start_time:
                # Fix gap by adjusting end time
                chapters[i] = ChapterInfo(
                    chapter_id=chapters[i].chapter_id,
                    title=chapters[i].title,
                    start_time=chapters[i].start_time,
                    end_time=chapters[i + 1].start_time,
                    level=chapters[i].level,
                )
        
        # Ensure last chapter ends at total duration
        if chapters[-1].end_time != total_duration:
            chapters[-1] = ChapterInfo(
                chapter_id=chapters[-1].chapter_id,
                title=chapters[-1].title,
                start_time=chapters[-1].start_time,
                end_time=total_duration,
                level=chapters[-1].level,
            )
        
        # Filter out too-short chapters
        valid_chapters = []
        for chapter in chapters:
            if chapter.duration >= self.min_chapter_duration or len(valid_chapters) == 0:
                valid_chapters.append(chapter)
            else:
                # Merge with previous chapter
                if valid_chapters:
                    prev = valid_chapters[-1]
                    valid_chapters[-1] = ChapterInfo(
                        chapter_id=prev.chapter_id,
                        title=prev.title,
                        start_time=prev.start_time,
                        end_time=chapter.end_time,
                        level=prev.level,
                    )
        
        return valid_chapters
    
    def _generate_from_scenes(
        self,
        bundle: AnalysisBundle,
        title: str,
        narration_lang: str,
    ) -> List[ChapterInfo]:
        """Generate chapters from scene detection results."""
        if not bundle.scenes:
            return []
        
        is_zh = narration_lang.startswith("zh")
        chapters = []
        
        # Group scenes into chapters (merge short scenes)
        current_chapter_start = 0.0
        current_chapter_scenes = []
        
        for scene in bundle.scenes:
            current_chapter_scenes.append(scene)
            chapter_duration = scene.end_time - current_chapter_start
            
            # Start new chapter if duration exceeds threshold
            if chapter_duration >= self.min_chapter_duration * 2 and len(current_chapter_scenes) > 1:
                # Get visual feature for title
                vf = next(
                    (v for v in bundle.visual_features if v.scene_id == current_chapter_scenes[0].scene_id),
                    None
                )
                
                chapter_title = f"第 {len(chapters) + 1} 部分" if is_zh else f"Part {len(chapters) + 1}"
                if vf and vf.caption:
                    chapter_title = vf.caption[:20]
                
                chapters.append(ChapterInfo(
                    chapter_id=len(chapters),
                    title=chapter_title,
                    start_time=current_chapter_start,
                    end_time=scene.end_time,
                    level=0,
                ))
                
                current_chapter_start = scene.end_time
                current_chapter_scenes = []
                
                if len(chapters) >= self.max_chapters - 1:
                    break
        
        # Add final chapter
        if current_chapter_scenes or not chapters:
            last_scene = bundle.scenes[-1]
            chapter_title = f"第 {len(chapters) + 1} 部分" if is_zh else f"Part {len(chapters) + 1}"
            
            chapters.append(ChapterInfo(
                chapter_id=len(chapters),
                title=chapter_title,
                start_time=current_chapter_start,
                end_time=last_scene.end_time,
                level=0,
            ))
        
        return chapters
    
    def _generate_time_based(
        self,
        total_duration: float,
        title: str,
        narration_lang: str,
    ) -> List[ChapterInfo]:
        """Generate chapters based on time intervals."""
        is_zh = narration_lang.startswith("zh")
        
        # Calculate chapter duration
        num_chapters = min(
            self.max_chapters,
            max(2, int(total_duration / 180))  # ~3 minutes per chapter
        )
        chapter_duration = total_duration / num_chapters
        
        chapters = []
        for i in range(num_chapters):
            start_time = i * chapter_duration
            end_time = (i + 1) * chapter_duration
            
            if is_zh:
                chapter_title = f"第 {i + 1} 部分"
            else:
                chapter_title = f"Part {i + 1}"
            
            chapters.append(ChapterInfo(
                chapter_id=i,
                title=chapter_title,
                start_time=start_time,
                end_time=end_time,
                level=0,
            ))
        
        return chapters

