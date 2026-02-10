"""
v2_player script_gen - Rule-based SmartScript generation.

This module generates SmartScript entries based on rules applied to
the analysis results (gaps, density, scenes, etc.).

Rules:
1. High density segments -> pre_teach_pause (explain before difficult parts)
2. Large gaps -> gap_filling (fill silence with commentary)
3. Scene transitions -> pre_teach_pause (introduce new scenes)
4. Others -> ignore

Usage:
    from services.v2_player.script_gen import RuleScriptGenerator
    
    generator = RuleScriptGenerator(paths)
    script = await generator.generate(bundle)
"""

from __future__ import annotations

import logging
import re
from datetime import datetime
from typing import Any, List, Optional

from storage.v2_player import (
    AnalysisBundle,
    SmartScript,
    SmartScriptEntry,
    SubtitleData,
    GapInfo,
    DensityInfo,
    V2PlayerPaths,
)
from .cache_keys import V2CacheKeys

logger = logging.getLogger("echoflow.v2_player.script_gen")


class ScriptGenError(Exception):
    """Raised when script generation fails."""
    pass


class RuleScriptGenerator:
    """
    Rule-based SmartScript generator.
    
    Generates commentary entries based on analysis results.
    """
    
    # Default parameters
    DEFAULT_GAP_THRESHOLD = 2.0       # Minimum gap to consider for filling (seconds)
    DEFAULT_DENSITY_THRESHOLD = 3.0   # Words per second for high density
    DEFAULT_SCENE_PAUSE_ENABLED = True  # Whether to pause at scene transitions
    DEFAULT_MAX_ENTRIES_PER_MINUTE = 3  # Avoid too many interruptions
    
    def __init__(
        self,
        paths: V2PlayerPaths,
        *,
        gap_threshold: float = DEFAULT_GAP_THRESHOLD,
        density_threshold: float = DEFAULT_DENSITY_THRESHOLD,
        scene_pause_enabled: bool = DEFAULT_SCENE_PAUSE_ENABLED,
        max_entries_per_minute: int = DEFAULT_MAX_ENTRIES_PER_MINUTE,
        narration_lang: str = "zh",
    ):
        """
        Initialize script generator.
        
        Args:
            paths: V2PlayerPaths instance for this course
            gap_threshold: Minimum gap duration for gap_filling
            density_threshold: WPS threshold for high density
            scene_pause_enabled: Whether to pause at scene transitions
            max_entries_per_minute: Maximum entries per minute
        """
        self.paths = paths
        self.gap_threshold = gap_threshold
        self.density_threshold = density_threshold
        self.scene_pause_enabled = scene_pause_enabled
        self.max_entries_per_minute = max_entries_per_minute
        self.narration_lang = narration_lang
    
    async def generate(
        self,
        bundle: AnalysisBundle,
        *,
        profile_hash: str = "",
    ) -> SmartScript:
        """
        Generate SmartScript from analysis bundle.
        
        Args:
            bundle: AnalysisBundle with all analysis data
            profile_hash: User profile hash for caching
        
        Returns:
            SmartScript
        """
        logger.info("Generating rule-based SmartScript")
        
        entries: List[SmartScriptEntry] = []
        
        # 1. Generate entries for high-density segments
        density_entries = self._generate_density_entries(bundle)
        entries.extend(density_entries)
        
        # 2. Generate entries for gaps
        gap_entries = self._generate_gap_entries(bundle)
        entries.extend(gap_entries)
        
        # 3. Generate entries for scene transitions (if enabled)
        if self.scene_pause_enabled:
            scene_entries = self._generate_scene_entries(bundle)
            entries.extend(scene_entries)
        
        # Sort by time
        entries.sort(key=lambda e: e.time_in)
        
        # Filter to avoid too many entries
        entries = self._filter_entries(entries, bundle)
        
        # Assign entry IDs
        for i, entry in enumerate(entries):
            entry.entry_id = f"entry_{i:04d}"
        
        # Compute input hash for caching
        input_hash = V2CacheKeys.script_input_hash(
            subtitles=[s.to_dict() for s in bundle.subtitles],
            timeline_features=bundle.timeline_features.to_dict() if bundle.timeline_features else None,
        )
        
        script = SmartScript(
            version="1.0",
            course_id=bundle.course_id,
            script_version="rule_v1",
            profile_hash=profile_hash,
            input_hash=input_hash,
            entries=entries,
            generated_at=datetime.utcnow().isoformat(),
            generator="rule",
        )
        
        logger.info(f"Generated {len(entries)} script entries")
        
        return script
    
    def _generate_density_entries(
        self,
        bundle: AnalysisBundle,
    ) -> List[SmartScriptEntry]:
        """
        Generate entries for high-density segments.
        
        These are pre_teach_pause entries that explain difficult/fast parts.
        """
        entries = []
        
        if not bundle.timeline_features:
            return entries
        
        subtitles = {s.index: s for s in bundle.subtitles}
        
        for density in bundle.timeline_features.densities:
            if not density.is_high_density:
                continue
            
            sub = subtitles.get(density.index)
            if not sub:
                continue
            
            # Create pre_teach_pause before this segment
            script_text = self._generate_density_commentary(sub, density)
            if not str(script_text or "").strip():
                continue
            
            entry = SmartScriptEntry(
                time_in=max(0, sub.start_time - 0.5),  # Pause slightly before
                action_type="pre_teach_pause",
                script=script_text,
                ducking=False,
                estimated_duration=len(script_text) / 15.0,  # ~15 chars per second
                ref={
                    "type": "density",
                    "subtitle_index": sub.index,
                    "wps": density.words_per_second,
                },
            )
            entries.append(entry)
        
        return entries
    
    def _generate_gap_entries(
        self,
        bundle: AnalysisBundle,
    ) -> List[SmartScriptEntry]:
        """
        Generate entries for gaps between subtitles.
        
        These are gap_filling entries that fill silence with commentary.
        """
        entries = []
        
        if not bundle.timeline_features:
            return entries
        
        subtitles = {s.index: s for s in bundle.subtitles}
        
        for gap in bundle.timeline_features.gaps:
            if gap.duration < self.gap_threshold:
                continue
            
            # Get the subtitle before this gap
            sub_before = subtitles.get(gap.after_index)
            sub_after = subtitles.get(gap.after_index + 1) if gap.after_index + 1 in subtitles else None
            
            # Generate commentary for the gap
            script_text = self._generate_gap_commentary(sub_before, sub_after, gap)
            if not str(script_text or "").strip():
                continue
            
            # Only use if script fits in the gap
            estimated_duration = len(script_text) / 15.0
            if estimated_duration > gap.duration - 0.5:
                continue
            
            entry = SmartScriptEntry(
                time_in=gap.start_time + 0.3,  # Start slightly into the gap
                action_type="gap_filling",
                script=script_text,
                ducking=True,  # Duck original audio during gap filling
                estimated_duration=estimated_duration,
                ref={
                    "type": "gap",
                    "after_index": gap.after_index,
                    "gap_duration": gap.duration,
                },
            )
            entries.append(entry)
        
        return entries
    
    def _generate_scene_entries(
        self,
        bundle: AnalysisBundle,
    ) -> List[SmartScriptEntry]:
        """
        Generate entries for scene transitions.
        
        These introduce new scenes with brief context.
        """
        entries = []
        
        if not bundle.scenes or len(bundle.scenes) < 2:
            return entries
        
        # Skip first scene
        for i, scene in enumerate(bundle.scenes[1:], 1):
            # Get visual features for this scene
            visual = None
            for vf in bundle.visual_features:
                if vf.scene_id == scene.scene_id:
                    visual = vf
                    break
            
            script_text = self._generate_scene_commentary(scene, visual)
            
            if not script_text:
                continue
            
            entry = SmartScriptEntry(
                time_in=scene.start_time,
                action_type="pre_teach_pause",
                script=script_text,
                ducking=False,
                estimated_duration=len(script_text) / 15.0,
                ref={
                    "type": "scene",
                    "scene_id": scene.scene_id,
                },
            )
            entries.append(entry)
        
        return entries
    
    def _filter_entries(
        self,
        entries: List[SmartScriptEntry],
        bundle: AnalysisBundle,
    ) -> List[SmartScriptEntry]:
        """
        Filter entries to avoid too many interruptions.
        
        Rules:
        1. Maximum entries per minute
        2. Minimum gap between entries
        3. Prioritize pre_teach_pause over gap_filling
        """
        if not entries:
            return entries
        
        # Get total duration
        total_duration = 0.0
        if bundle.subtitles:
            total_duration = max(s.end_time for s in bundle.subtitles)
        if bundle.scenes:
            total_duration = max(total_duration, max(s.end_time for s in bundle.scenes))
        
        if total_duration <= 0:
            return entries[:10]  # Safety limit
        
        # Calculate max entries
        max_entries = int(total_duration / 60.0 * self.max_entries_per_minute)
        max_entries = max(3, min(max_entries, len(entries)))
        
        # Sort by priority (pre_teach_pause first, then by time)
        priority_order = {"pre_teach_pause": 0, "gap_filling": 1, "ignore": 2}
        
        def entry_priority(e: SmartScriptEntry) -> tuple:
            return (priority_order.get(e.action_type, 2), e.time_in)
        
        sorted_entries = sorted(entries, key=entry_priority)
        
        # Select entries ensuring minimum gap
        min_gap = 10.0  # Minimum 10 seconds between entries
        selected = []
        last_time = -min_gap
        
        for entry in sorted_entries:
            if len(selected) >= max_entries:
                break
            
            if entry.time_in - last_time >= min_gap:
                selected.append(entry)
                last_time = entry.time_in
        
        # Re-sort by time
        selected.sort(key=lambda e: e.time_in)
        
        return selected
    
    def _generate_density_commentary(
        self,
        sub: SubtitleData,
        density: DensityInfo,
    ) -> str:
        """Generate commentary for high-density segment."""
        text = str(sub.text or "").strip()
        if not text:
            return ""

        tokens = re.findall(r"[A-Za-z][A-Za-z']+", text)
        tokens_l = [t.lower() for t in tokens]

        contractions: dict[str, str] = {
            "gonna": "going to",
            "wanna": "want to",
            "gotta": "have to",
            "kinda": "kind of",
            "sorta": "sort of",
            "lemme": "let me",
            "gimme": "give me",
            "ain't": "isn't / aren't",
        }
        found_contractions = []
        for t in tokens_l:
            if t in contractions and f"{t}={contractions[t]}" not in found_contractions:
                found_contractions.append(f"{t}={contractions[t]}")

        long_words = []
        for t in tokens:
            if len(t) >= 8 and t.lower() not in contractions:
                if t not in long_words:
                    long_words.append(t)
            if len(long_words) >= 2:
                break

        if str(self.narration_lang or "zh").startswith("zh"):
            if found_contractions:
                return "这一句里有口语缩写：" + "，".join(found_contractions[:3]) + "。"
            if long_words:
                return "这一句语速快，先抓住关键词：" + "、".join(long_words[:2]) + "。"
            if tokens:
                keep = []
                for t in tokens[:10]:
                    if t not in keep:
                        keep.append(t)
                    if len(keep) >= 2:
                        break
                return "这一句信息密度高，重点听清：" + "、".join(keep) + "。"
            return ""

        if found_contractions:
            return "Spoken shortcuts here: " + ", ".join(found_contractions[:3]) + "."
        if long_words:
            return "Fast line—listen for: " + ", ".join(long_words[:2]) + "."
        if tokens:
            keep = []
            for t in tokens[:10]:
                if t not in keep:
                    keep.append(t)
                if len(keep) >= 2:
                    break
            return "High-density line—catch: " + ", ".join(keep) + "."
        return ""
    
    def _generate_gap_commentary(
        self,
        sub_before: Optional[SubtitleData],
        sub_after: Optional[SubtitleData],
        gap: GapInfo,
    ) -> str:
        """Generate commentary for gap between subtitles."""
        before_text = str(sub_before.text if sub_before else "").strip()
        if not before_text:
            return ""

        words = before_text.split()
        excerpt = " ".join(words[:10]).strip()
        if len(words) > 10:
            excerpt = excerpt + " …"

        if str(self.narration_lang or "zh").startswith("zh"):
            return f'刚才这句可以先跟读一遍："{excerpt}"。'
        return f'Try shadowing the last line once: "{excerpt}".'
    
    def _generate_scene_commentary(
        self,
        scene,
        visual: Optional[Any],
    ) -> str:
        """Generate commentary for scene transition."""
        if visual and visual.caption:
            if str(self.narration_lang or "zh").startswith("zh"):
                return f"场景切换：{visual.caption}"
            return f"Scene change: {visual.caption}"

        if str(self.narration_lang or "zh").startswith("zh"):
            return "场景发生了变化。"
        return "The scene changes here."
    
    async def save_script(self, script: SmartScript) -> None:
        """Save script to disk."""
        self.paths.ensure_dirs()
        self.paths.smart_script_json.write_text(
            script.to_json(),
            encoding="utf-8",
        )
        logger.debug(f"Saved script to {self.paths.smart_script_json}")
    
    def load_script(self) -> Optional[SmartScript]:
        """Load script from disk."""
        if not self.paths.smart_script_json.exists():
            return None
        
        return SmartScript.from_json(
            self.paths.smart_script_json.read_text(encoding="utf-8")
        )
