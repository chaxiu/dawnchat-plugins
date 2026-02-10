"""
v2_player speaker_naming - Speaker ID to character name mapping.

This module maps anonymous speaker IDs (e.g., "SPEAKER_00") to
recognizable character names using visual recognition results.

Enhanced mapping process (v2):
1. Use SpeakerVisualResult (diarization-aligned frames) for primary mapping
2. Apply confidence-weighted voting
3. Detect narrator speakers (those speaking when no one on screen is talking)
4. Fallback to scene-based VisualFeatures if speaker visual unavailable

Usage:
    from services.v2_player.speaker_naming import SpeakerNamingService
    
    service = SpeakerNamingService(paths)
    speaker_map = await service.build_speaker_map(diarization, speaker_visual, candidates)
"""

from __future__ import annotations

import json
import logging
from collections import Counter, defaultdict
from typing import Any, Dict, List, Optional, Tuple

from storage.v2_player import (
    CharacterCandidates,
    DiarizationSegment,
    SpeakerVisualResult,
    VisualFeatures,
    SceneInfo,
    SpeakerMap,
    V2PlayerPaths,
)

logger = logging.getLogger("echoflow.v2_player.speaker_naming")


class SpeakerNamingError(Exception):
    """Raised when speaker naming fails."""
    pass


class SpeakerNamingService:
    """
    Enhanced speaker naming service.
    
    Maps speaker IDs to character names using:
    1. SpeakerVisualResult (primary, diarization-aligned)
    2. VisualFeatures (fallback, scene-based)
    3. Narrator detection based on "no speaker on screen" patterns
    """
    
    # Narrator detection threshold
    NARRATOR_THRESHOLD = 0.6  # If 60%+ frames show no speaker, likely narrator
    
    def __init__(self, paths: V2PlayerPaths):
        """
        Initialize speaker naming service.
        
        Args:
            paths: V2PlayerPaths instance for this course
        """
        self.paths = paths
    
    async def build_speaker_map(
        self,
        diarization: List[DiarizationSegment],
        speaker_visual: Optional[List[SpeakerVisualResult]] = None,
        candidates: Optional[CharacterCandidates] = None,
        *,
        # Legacy parameters for backwards compatibility
        visual_features: Optional[List[VisualFeatures]] = None,
        scenes: Optional[List[SceneInfo]] = None,
        skip_existing: bool = True,
    ) -> SpeakerMap:
        """
        Build speaker ID to character name mapping.
        
        Args:
            diarization: Diarization segments with speaker IDs
            speaker_visual: Speaker visual results (primary, diarization-aligned)
            candidates: Character candidates for narrator detection
            visual_features: Visual features (fallback, scene-based)
            scenes: Scene info with timing (for fallback)
            skip_existing: Skip if mapping already exists
        
        Returns:
            SpeakerMap
        """
        # Check for existing result
        if skip_existing and self.paths.speaker_map_json.exists():
            logger.info("Using existing speaker map")
            return self._load_from_cache()
        
        if not diarization:
            logger.warning("No diarization segments to map")
            return SpeakerMap()
        
        # Use enhanced mapping if speaker_visual available
        if speaker_visual:
            logger.info(f"Building speaker map from {len(speaker_visual)} visual results")
            speaker_map = self._build_from_speaker_visual(
                diarization, speaker_visual, candidates
            )
        elif visual_features and scenes:
            # Fallback to legacy scene-based mapping
            logger.info(f"Fallback: Building speaker map from {len(visual_features)} scene features")
            speaker_map = self._build_from_scene_features(
                diarization, visual_features, scenes
            )
        else:
            logger.warning("No visual data available, returning empty map")
            return SpeakerMap()
        
        # Save to cache
        self._save_to_cache(speaker_map)
        
        logger.info(f"Speaker map complete: {len(speaker_map.mappings)} speakers mapped")
        
        return speaker_map
    
    def _build_from_speaker_visual(
        self,
        diarization: List[DiarizationSegment],
        speaker_visual: List[SpeakerVisualResult],
        candidates: Optional[CharacterCandidates],
    ) -> SpeakerMap:
        """
        Build mapping from diarization-aligned speaker visual results.
        
        Uses confidence-weighted voting and narrator detection.
        """
        # Group results by speaker_id
        speaker_results: Dict[str, List[SpeakerVisualResult]] = defaultdict(list)
        for result in speaker_visual:
            if result.status == "success":
                speaker_results[result.speaker_id].append(result)
        
        # Calculate weighted votes and narrator scores for each speaker
        speaker_votes: Dict[str, Counter] = {}
        speaker_narrator_ratio: Dict[str, float] = {}
        
        for speaker_id, results in speaker_results.items():
            votes = Counter()
            narrator_count = 0
            total_count = len(results)
            
            for result in results:
                raw_confidence = getattr(result, "confidence", 0.0)
                try:
                    confidence = float(raw_confidence)
                except (TypeError, ValueError):
                    confidence = 0.0
                confidence = max(0.0, min(1.0, confidence))
                weight = max(0.1, confidence)

                if result.is_narrator():
                    narrator_count += 1
                    continue

                if result.speaking_character:
                    char_name = result.speaking_character.strip()
                    if char_name:
                        votes[char_name] += weight
            
            speaker_votes[speaker_id] = votes
            speaker_narrator_ratio[speaker_id] = (
                narrator_count / total_count if total_count > 0 else 0
            )
        
        # Determine narrator speakers first
        has_narrator = candidates.has_narrator if candidates else False
        narrator_speaker = None
        
        if has_narrator:
            # Find speaker with highest narrator ratio above threshold
            best_ratio = 0
            for speaker_id, ratio in speaker_narrator_ratio.items():
                if ratio >= self.NARRATOR_THRESHOLD and ratio > best_ratio:
                    best_ratio = ratio
                    narrator_speaker = speaker_id
            
            if narrator_speaker:
                logger.info(f"Detected narrator: {narrator_speaker} "
                           f"(ratio: {speaker_narrator_ratio[narrator_speaker]:.2f})")
        
        # Build final mappings
        mappings = {}
        used_names = set()
        
        # Map narrator first if detected
        if narrator_speaker:
            mappings[narrator_speaker] = "Narrator"
            used_names.add("Narrator")
        
        # Sort remaining speakers by total vote weight
        sorted_speakers = sorted(
            [(sid, votes) for sid, votes in speaker_votes.items() if sid != narrator_speaker],
            key=lambda x: sum(x[1].values()),
            reverse=True,
        )
        
        for speaker_id, votes in sorted_speakers:
            if not votes:
                continue
            
            # Find best available name
            for name, weight in votes.most_common():
                name_normalized = name.strip()
                if name_normalized and name_normalized not in used_names:
                    mappings[speaker_id] = name_normalized
                    used_names.add(name_normalized)
                    logger.debug(f"Mapped {speaker_id} -> {name_normalized} (weight: {weight:.2f})")
                    break
        
        # For unmapped speakers, keep original ID
        all_speakers = set(seg.speaker_id for seg in diarization)
        for speaker_id in all_speakers:
            if speaker_id not in mappings:
                mappings[speaker_id] = speaker_id
        
        return SpeakerMap(mappings=mappings)
    
    def _build_from_scene_features(
        self,
        diarization: List[DiarizationSegment],
        visual_features: List[VisualFeatures],
        scenes: List[SceneInfo],
    ) -> SpeakerMap:
        """
        Legacy fallback: Build mapping from scene-based visual features.
        """
        # Build scene timing lookup
        scene_lookup = self._build_scene_lookup(scenes)
        
        # Build visual features lookup by scene
        visual_lookup = {f.scene_id: f for f in visual_features}
        
        # Collect votes for each speaker
        speaker_votes: Dict[str, Counter] = {}
        
        for seg in diarization:
            speaker_id = seg.speaker_id
            
            if speaker_id not in speaker_votes:
                speaker_votes[speaker_id] = Counter()
            
            # Find which scene(s) this segment overlaps with
            overlapping_scenes = self._find_overlapping_scenes(
                seg.start_time,
                seg.end_time,
                scene_lookup,
            )
            
            # Collect character candidates from overlapping scenes
            for scene_id in overlapping_scenes:
                features = visual_lookup.get(scene_id)
                if not features:
                    continue
                
                # Check for speaking character tag
                speaking_char = None
                for tag in features.tags:
                    if tag.startswith("speaking:"):
                        speaking_char = tag.split(":", 1)[1]
                        break
                
                if speaking_char:
                    speaker_votes[speaker_id][speaking_char] += 2
                elif features.characters:
                    for char in features.characters:
                        speaker_votes[speaker_id][char] += 1
        
        # Determine best mapping
        mappings = {}
        used_names = set()
        
        sorted_speakers = sorted(
            speaker_votes.items(),
            key=lambda x: sum(x[1].values()),
            reverse=True,
        )
        
        for speaker_id, votes in sorted_speakers:
            if not votes:
                continue
            
            for name, count in votes.most_common():
                if name not in used_names:
                    mappings[speaker_id] = name
                    used_names.add(name)
                    logger.debug(f"Mapped {speaker_id} -> {name} (votes: {count})")
                    break
        
        # For unmapped speakers, keep original ID
        all_speakers = set(seg.speaker_id for seg in diarization)
        for speaker_id in all_speakers:
            if speaker_id not in mappings:
                mappings[speaker_id] = speaker_id
        
        return SpeakerMap(mappings=mappings)
    
    def _build_scene_lookup(
        self,
        scenes: List[SceneInfo],
    ) -> List[Tuple[float, float, int]]:
        """
        Build a lookup structure for scene timing.
        
        Returns:
            List of (start_time, end_time, scene_id) tuples, sorted by start_time
        """
        lookup = [
            (scene.start_time, scene.end_time, scene.scene_id)
            for scene in scenes
        ]
        lookup.sort(key=lambda x: x[0])
        return lookup
    
    def _find_overlapping_scenes(
        self,
        start_time: float,
        end_time: float,
        scene_lookup: List[Tuple[float, float, int]],
    ) -> List[int]:
        """
        Find scene IDs that overlap with the given time range.
        """
        overlapping = []
        
        for scene_start, scene_end, scene_id in scene_lookup:
            if start_time < scene_end and end_time > scene_start:
                overlapping.append(scene_id)
            
            if scene_start > end_time:
                break
        
        return overlapping
    
    def _save_to_cache(self, speaker_map: SpeakerMap) -> None:
        """Save speaker map to cache."""
        self.paths.ensure_dirs()
        self.paths.speaker_map_json.write_text(
            json.dumps(speaker_map.to_dict(), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    
    def _load_from_cache(self) -> SpeakerMap:
        """Load speaker map from cache."""
        data = json.loads(
            self.paths.speaker_map_json.read_text(encoding="utf-8")
        )
        return SpeakerMap.from_dict(data)
    
    def has_cache(self) -> bool:
        """Check if speaker map cache exists."""
        return self.paths.speaker_map_json.exists()
    
    def clear_cache(self) -> None:
        """Clear speaker map cache."""
        if self.paths.speaker_map_json.exists():
            self.paths.speaker_map_json.unlink()


def apply_speaker_names(
    subtitles: List[Dict[str, Any]],
    speaker_map: SpeakerMap,
) -> List[Dict[str, Any]]:
    """
    Apply speaker names to subtitles.
    
    Replaces speaker_id with human-readable names where available.
    
    Args:
        subtitles: List of subtitle dicts with speaker_id
        speaker_map: Speaker ID to name mapping
    
    Returns:
        Updated subtitles with speaker_name added
    """
    result = []
    
    for sub in subtitles:
        updated = dict(sub)
        speaker_id = sub.get("speaker_id")
        
        if speaker_id:
            updated["speaker_name"] = speaker_map.get_name(speaker_id)
        else:
            updated["speaker_name"] = None
        
        result.append(updated)
    
    return result
