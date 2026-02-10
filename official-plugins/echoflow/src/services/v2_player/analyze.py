"""
v2_player analyze - Analysis pipeline entry point.

This module provides the main entry point for analyzing a course's video/subtitle
and generating the AnalysisBundle.

Pipeline stages:
1. Subtitle parsing (Phase 1A)
2. Gap and density calculation (Phase 1A)
3. Diarization (Phase 1B) - optional
4. Scene detection (Phase 1B) - optional
5. Visual recognition (Phase 1C) - optional
6. Speaker naming (Phase 1C) - optional

Usage:
    from services.v2_player.analyze import Analyzer
    
    analyzer = Analyzer(paths)
    bundle = await analyzer.analyze_full()
    
    # Or step by step:
    doc = await analyzer.parse_subtitles()
    features = await analyzer.compute_timeline_features(doc)
"""

from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import TYPE_CHECKING, List, Optional

from storage.v2_player import (
    AnalysisBundle,
    SubtitleData,
    TimelineFeatures,
    GapInfo,
    DensityInfo,
    V2PlayerPaths,
)
from .subtitle_model import SubtitleDocument, SubtitleSegment
from .subtitle_parser import SubtitleParser, SubtitleParseError

if TYPE_CHECKING:
    from course.models import Course

logger = logging.getLogger("echoflow.v2_player.analyze")


class AnalysisError(Exception):
    """Raised when analysis fails."""
    pass


class Analyzer:
    """
    Analysis pipeline for Smart Player v2.
    
    Handles multi-stage preprocessing of video/subtitle content.
    """
    
    # Default thresholds
    DEFAULT_GAP_THRESHOLD = 1.5        # Minimum gap duration (seconds)
    DEFAULT_DENSITY_THRESHOLD = 3.0    # Words per second for high density
    
    def __init__(
        self,
        paths: V2PlayerPaths,
        subtitle_path: Optional[Path] = None,
        video_path: Optional[Path] = None,
        *,
        gap_threshold: float = DEFAULT_GAP_THRESHOLD,
        density_threshold: float = DEFAULT_DENSITY_THRESHOLD,
    ):
        """
        Initialize analyzer.
        
        Args:
            paths: V2PlayerPaths instance for this course
            subtitle_path: Path to subtitle file
            video_path: Path to video file (optional for now)
            gap_threshold: Minimum gap duration to consider
            density_threshold: WPS threshold for high density
        """
        self.paths = paths
        self.subtitle_path = subtitle_path
        self.video_path = video_path
        self.gap_threshold = gap_threshold
        self.density_threshold = density_threshold
        
        self._parser = SubtitleParser()
    
    async def analyze_full(self, skip_existing: bool = True) -> AnalysisBundle:
        """
        Run full analysis pipeline.
        
        Args:
            skip_existing: Skip if analysis already exists
        
        Returns:
            AnalysisBundle with all available analysis data
        """
        # Check if analysis already exists
        if skip_existing and self._has_complete_analysis():
            logger.info("Using existing analysis")
            return self._load_existing_bundle()
        
        # Ensure directories exist
        self.paths.ensure_dirs()
        
        # Stage 1: Parse subtitles
        doc = await self.parse_subtitles()
        
        # Stage 2: Compute timeline features
        features = await self.compute_timeline_features(doc)
        
        # Create bundle
        bundle = AnalysisBundle(
            course_id=self.paths._course_id,
            subtitles=[self._to_subtitle_data(seg) for seg in doc.segments],
            timeline_features=features,
            analyzed_at=datetime.utcnow().isoformat(),
        )
        
        # Save to disk
        self._save_subtitles(doc)
        self._save_timeline_features(features)
        
        logger.info(f"Analysis complete: {len(doc.segments)} subtitles, {len(features.gaps)} gaps")
        
        return bundle
    
    async def parse_subtitles(self) -> SubtitleDocument:
        """
        Parse subtitles from file.
        
        Returns:
            SubtitleDocument
        
        Raises:
            AnalysisError: If subtitle file not found or parsing fails
        """
        if not self.subtitle_path:
            raise AnalysisError("Subtitle path not provided")
        
        path = Path(self.subtitle_path)
        if not path.exists():
            raise AnalysisError(f"Subtitle file not found: {path}")
        
        try:
            doc = self._parser.parse_file(path)
            logger.info(f"Parsed {len(doc.segments)} subtitle segments from {path}")
            return doc
        except SubtitleParseError as e:
            raise AnalysisError(f"Failed to parse subtitles: {e}") from e
    
    async def compute_timeline_features(
        self,
        doc: SubtitleDocument,
    ) -> TimelineFeatures:
        """
        Compute gap and density information.
        
        Args:
            doc: Parsed subtitle document
        
        Returns:
            TimelineFeatures with gaps and densities
        """
        gaps = self._compute_gaps(doc)
        densities = self._compute_densities(doc)
        
        return TimelineFeatures(
            gaps=gaps,
            densities=densities,
            gap_threshold=self.gap_threshold,
            density_threshold=self.density_threshold,
        )
    
    def _compute_gaps(self, doc: SubtitleDocument) -> List[GapInfo]:
        """
        Compute gaps between consecutive subtitles.
        
        Args:
            doc: Subtitle document
        
        Returns:
            List of GapInfo for gaps above threshold
        """
        gaps = []
        
        for i in range(len(doc.segments) - 1):
            current = doc.segments[i]
            next_seg = doc.segments[i + 1]
            
            gap_duration = next_seg.start_time - current.end_time
            
            if gap_duration >= self.gap_threshold:
                gap = GapInfo(
                    after_index=current.index,
                    start_time=current.end_time,
                    end_time=next_seg.start_time,
                    duration=gap_duration,
                )
                gaps.append(gap)
        
        logger.debug(f"Found {len(gaps)} gaps >= {self.gap_threshold}s")
        return gaps
    
    def _compute_densities(self, doc: SubtitleDocument) -> List[DensityInfo]:
        """
        Compute speech density for each segment.
        
        Args:
            doc: Subtitle document
        
        Returns:
            List of DensityInfo
        """
        densities = []
        high_density_count = 0
        
        for seg in doc.segments:
            wps = seg.words_per_second
            is_high = wps >= self.density_threshold
            
            if is_high:
                high_density_count += 1
            
            density = DensityInfo(
                index=seg.index,
                words_per_second=round(wps, 2),
                is_high_density=is_high,
            )
            densities.append(density)
        
        logger.debug(f"Found {high_density_count} high-density segments (>= {self.density_threshold} WPS)")
        return densities
    
    def _to_subtitle_data(self, seg: SubtitleSegment) -> SubtitleData:
        """Convert SubtitleSegment to SubtitleData."""
        return SubtitleData(
            index=seg.index,
            start_time=seg.start_time,
            end_time=seg.end_time,
            text=seg.text,
            speaker_id=seg.speaker_id,
        )
    
    def _save_subtitles(self, doc: SubtitleDocument) -> None:
        """Save parsed subtitles to JSON."""
        data = {
            "source_path": doc.source_path,
            "source_format": doc.source_format,
            "segments": [s.to_dict() for s in doc.segments],
        }
        self.paths.subtitles_json.write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        logger.debug(f"Saved subtitles to {self.paths.subtitles_json}")
    
    def _save_timeline_features(self, features: TimelineFeatures) -> None:
        """Save timeline features to JSON."""
        self.paths.timeline_features_json.write_text(
            json.dumps(features.to_dict(), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        logger.debug(f"Saved timeline features to {self.paths.timeline_features_json}")
    
    def _has_complete_analysis(self) -> bool:
        """Check if complete analysis exists."""
        return (
            self.paths.subtitles_json.exists() and
            self.paths.timeline_features_json.exists()
        )
    
    def _load_existing_bundle(self) -> AnalysisBundle:
        """Load existing analysis from disk."""
        # Load subtitles
        subtitles_data = json.loads(
            self.paths.subtitles_json.read_text(encoding="utf-8")
        )
        subtitles = [
            SubtitleData.from_dict(s)
            for s in subtitles_data.get("segments", [])
        ]
        
        # Load timeline features
        features_data = json.loads(
            self.paths.timeline_features_json.read_text(encoding="utf-8")
        )
        features = TimelineFeatures.from_dict(features_data)
        
        return AnalysisBundle(
            course_id=self.paths._course_id,
            subtitles=subtitles,
            timeline_features=features,
        )


async def analyze_course(
    course: "Course",
    paths: V2PlayerPaths,
    *,
    skip_existing: bool = True,
) -> AnalysisBundle:
    """
    Analyze a course.
    
    Convenience function for analyzing a course.
    
    Args:
        course: Course object
        paths: V2PlayerPaths for this course
        skip_existing: Skip if analysis exists
    
    Returns:
        AnalysisBundle
    """
    # Get subtitle path from course
    subtitle_path = None
    if hasattr(course, "subtitle_path") and course.subtitle_path:
        subtitle_path = Path(course.subtitle_path)
    
    # Get video path from course
    video_path = None
    if hasattr(course, "video_path") and course.video_path:
        video_path = Path(course.video_path)
    
    if not subtitle_path or not subtitle_path.exists():
        raise AnalysisError(f"Subtitle file not found for course: {course.id}")
    
    analyzer = Analyzer(
        paths=paths,
        subtitle_path=subtitle_path,
        video_path=video_path,
    )
    
    return await analyzer.analyze_full(skip_existing=skip_existing)

