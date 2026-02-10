"""
v2_player pipeline - Complete preprocessing pipeline.

This module provides a unified entry point for the full v2 preprocessing pipeline:
1. Subtitle parsing and gap/density analysis
2. (Optional) Scene detection and keyframe extraction
3. (Optional) Visual recognition (with automatic image compression)
4. (Optional) Diarization (speaker identification)
5. (Optional) Speaker naming
6. Script generation (rule-based or LLM-based)
7. TTS pre-generation

Usage:
    from services.v2_player.pipeline import V2Pipeline
    
    pipeline = V2Pipeline(course, course_db)
    result = await pipeline.run_full()
"""

from __future__ import annotations

import logging
import inspect
from dataclasses import dataclass, field
from pathlib import Path
from typing import TYPE_CHECKING, Awaitable, Callable, List, Optional

from storage.v2_player import (
    AnalysisBundle,
    ChapterInfo,
    CharacterCandidates,
    NarrationDirectives,
    SceneInfo,
    SpeakerFrame,
    SpeakerVisualResult,
    SmartScript,
    V2PlayerPaths,
    VisualFeatures,
)

from dawnchat_sdk.host import host

from .analyze import Analyzer, AnalysisError
from .diarization import DiarizationService, DiarizationError
from .scene_detection import SceneDetectionService, SceneDetectionError
from .vision import VisionService, VisionError
from .speaker_naming import SpeakerNamingService, SpeakerNamingError
from .character_extractor import CharacterExtractor, CharacterExtractionError
from .speaker_frame_extraction import SpeakerFrameExtractor, SpeakerFrameExtractionError
from .speaker_vision import SpeakerVisionService, SpeakerVisionError
from .short_utterance_relabel import ShortUtteranceRelabelService, ShortUtteranceRelabelError
from .script_gen import RuleScriptGenerator
from .llm_script_gen import LLMScriptGenerator
from .cache_keys import V2CacheKeys
from .tts_pregen import TTSPregenService
from .chapter_gen import ChapterGenerator

if TYPE_CHECKING:
    from course.models import Course
    from storage.course_db import CourseDatabase

logger = logging.getLogger("echoflow.v2_player.pipeline")


@dataclass
class PipelineResult:
    """Result of the preprocessing pipeline."""
    success: bool
    bundle: Optional[AnalysisBundle] = None
    script: Optional[SmartScript] = None
    error: Optional[str] = None
    
    # Statistics
    subtitle_count: int = 0
    gap_count: int = 0
    script_entry_count: int = 0
    tts_ready_count: int = 0
    
    # Scene detection and vision statistics
    scene_count: int = 0
    keyframe_count: int = 0
    visual_features_count: int = 0
    
    # Scenes and visual features (for advanced usage)
    scenes: List[SceneInfo] = field(default_factory=list)
    visual_features: List[VisualFeatures] = field(default_factory=list)


class V2Pipeline:
    """
    Complete v2 preprocessing pipeline.
    
    Orchestrates all preprocessing steps from subtitle parsing to TTS generation.
    """
    
    def __init__(
        self,
        course: "Course",
        course_db: "CourseDatabase",
        *,
        enable_diarization: bool = True,
        enable_vision: bool = True,
        enable_tts: bool = True,
    ):
        """
        Initialize pipeline.
        
        Args:
            course: Course to process
            course_db: Course database
            enable_diarization: Whether to run diarization (slow, optional)
            enable_vision: Whether to run vision analysis (slow, optional)
            enable_tts: Whether to pre-generate TTS
        """
        self.course = course
        self.course_db = course_db
        
        self.enable_diarization = enable_diarization
        self.enable_vision = enable_vision
        self.enable_tts = enable_tts
        
        # Initialize paths
        self.paths = V2PlayerPaths.from_db_path(
            Path(course_db.db_path),
            str(course.id),
        )
    
    async def run_full(
        self,
        *,
        skip_existing: bool = True,
        force_regenerate: bool = False,
        scope: str = "all",
        intensity: str = "medium",
        narration_lang: str = "zh",
        audience: str = "adult",
        english_level: str = "intermediate",
        script_mode: str = "auto",
        llm_model: Optional[str] = None,
        speaker: Optional[str] = None,
        quality: Optional[str] = None,
        engine: Optional[str] = None,
        model_id: Optional[str] = None,
        directives: Optional[NarrationDirectives] = None,
        enable_chapters: bool = True,
        on_progress: Optional[Callable[[float, str], Awaitable[None] | None]] = None,
    ) -> PipelineResult:
        """
        Run the complete preprocessing pipeline.
        
        Args:
            skip_existing: Skip steps that have cached results
            force_regenerate: Force regeneration of all steps
        
        Returns:
            PipelineResult
        """
        if force_regenerate:
            skip_existing = False
        
        scenes: List[SceneInfo] = []
        visual_features: List[VisualFeatures] = []
        candidates: Optional[CharacterCandidates] = None
        
        try:
            logger.info(f"Starting v2 pipeline for course: {self.course.id}")

            async def emit(progress: float, message: str) -> None:
                if on_progress is None:
                    return
                try:
                    r = on_progress(float(progress), str(message))
                    if inspect.isawaitable(r):
                        await r
                except Exception:
                    return
            
            # Step 1: Basic analysis (subtitle parsing, gaps, density)
            await emit(0.02, "analysis")
            bundle = await self._run_analysis(skip_existing)
            bundle = self._apply_scope(bundle, str(scope or "all"))
            await emit(0.12, "analysis_done")
            
            # Step 2: Diarization (MOVED UP - needed for speaker frame extraction)
            if self.enable_diarization:
                await emit(0.14, "diarization")
                diarization = await self._run_diarization(skip_existing)
                if diarization:
                    bundle.diarization = diarization
                    bundle = self._apply_diarization_to_subtitles(bundle)
                await emit(0.22, "diarization_done")
            
            # Step 3: Character Candidate Extraction (NEW - shared by speaker vision and scene vision)
            await emit(0.24, "character_extraction")
            candidates = await self._run_character_extraction(
                bundle,
                title=str(getattr(self.course, "title", "") or "").strip(),
                llm_model=llm_model,
                skip_existing=skip_existing,
            )
            bundle.character_candidates = candidates
            await emit(0.28, "character_extraction_done")
            
            # Step 4: Speaker identification path (diarization-based frames)
            if self.enable_diarization and self.enable_vision and bundle.diarization:
                # Step 4.1: Extract frames at speaking moments
                await emit(0.30, "speaker_frame_extraction")
                speaker_frames = await self._run_speaker_frame_extraction(
                    bundle.diarization,
                    skip_existing=skip_existing,
                )
                await emit(0.38, "speaker_frame_extraction_done")
                
                # Step 4.2: Analyze speaker frames with closed-set recognition
                if speaker_frames:
                    await emit(0.40, "speaker_vision")
                    speaker_visual = await self._run_speaker_vision(
                        speaker_frames,
                        candidates,
                        bundle.subtitles,
                        skip_existing=skip_existing,
                    )
                    bundle.speaker_visual = speaker_visual
                    await emit(0.50, "speaker_vision_done")
                    
                    # Step 4.3: Build speaker map from speaker visual results
                    await emit(0.52, "speaker_naming")
                    speaker_map = await self._run_speaker_naming_enhanced(
                        diarization=bundle.diarization,
                        speaker_visual=speaker_visual,
                        candidates=candidates,
                        skip_existing=skip_existing,
                    )
                    bundle.speaker_map = speaker_map
                    await emit(0.54, "speaker_naming_done")

            if self.enable_vision and bundle.subtitles:
                await emit(0.545, "short_utterance_relabel")
                bundle = await self._run_short_utterance_relabel(
                    bundle,
                    candidates=candidates,
                    skip_existing=skip_existing,
                )
                await emit(0.548, "short_utterance_relabel_done")
            
            # Step 5: Scene detection and visual recognition (for chapter generation)
            if self.enable_vision:
                await emit(0.55, "scene_detection")
                scenes = await self._run_scene_detection(skip_existing)
                
                if scenes:
                    await emit(0.58, "scene_vision")
                    # Pass candidates to enable closed-set recognition
                    visual_features = await self._run_vision_analysis(
                        scenes,
                        skip_existing,
                        character_candidates=candidates,
                    )
                await emit(0.60, "scene_vision_done")

            if scenes:
                bundle.scenes = scenes
            if visual_features:
                bundle.visual_features = visual_features
            
            # Step 6: Generate chapters (if enabled)
            chapters: List[ChapterInfo] = []
            if enable_chapters:
                await emit(0.62, "chapters")
                chapters = await self._run_chapter_generation(
                    bundle,
                    directives=directives,
                    title=str(getattr(self.course, "title", "") or "").strip(),
                    character_candidates=candidates,
                    skip_existing=skip_existing,
                )
                await emit(0.66, "chapters_done")
            
            # Step 7: Generate script
            await emit(0.68, "script")
            script = await self._run_script_generation(
                bundle,
                skip_existing,
                intensity=str(intensity or "medium"),
                narration_lang=str(narration_lang or "zh"),
                audience=str(audience or "adult"),
                english_level=str(english_level or "intermediate"),
                script_mode=str(script_mode or "auto"),
                llm_model=llm_model,
                directives=directives,
            )
            
            # Attach chapters to script
            if chapters:
                script.chapters = chapters
            if directives:
                script.directives = directives
            
            await emit(0.75, "script_done")
            
            # Step 8: Pre-generate TTS
            if self.enable_tts:
                await emit(0.78, "tts")
                script = await self._run_tts_pregen(
                    script,
                    skip_existing,
                    speaker=speaker,
                    quality=quality,
                    engine=engine,
                    model_id=model_id,
                    on_progress=on_progress,
                )
                await emit(0.95, "tts_done")
            
            # Save script
            await self._save_script(script)
            await emit(1.0, "done")
            
            # Calculate keyframe count
            keyframe_count = sum(len(s.keyframe_paths) for s in scenes)
            
            # Build result
            result = PipelineResult(
                success=True,
                bundle=bundle,
                script=script,
                subtitle_count=len(bundle.subtitles),
                gap_count=len(bundle.timeline_features.gaps) if bundle.timeline_features else 0,
                script_entry_count=len(script.entries),
                tts_ready_count=sum(1 for e in script.entries if e.tts_path),
                scene_count=len(scenes),
                keyframe_count=keyframe_count,
                visual_features_count=len(visual_features),
                scenes=scenes,
                visual_features=visual_features,
            )
            
            logger.info(f"Pipeline complete: {result.subtitle_count} subtitles, "
                       f"{result.scene_count} scenes, {result.script_entry_count} script entries")
            
            return result
            
        except Exception as e:
            logger.exception("Pipeline failed")
            return PipelineResult(
                success=False,
                error=str(e),
            )

    async def run_tts_only(
        self,
        *,
        skip_existing: bool = True,
        force_regenerate: bool = False,
        speaker: Optional[str] = None,
        quality: Optional[str] = None,
        engine: Optional[str] = None,
        model_id: Optional[str] = None,
        on_progress: Optional[Callable[[float, str], Awaitable[None] | None]] = None,
    ) -> PipelineResult:
        if force_regenerate:
            skip_existing = False

        try:
            logger.info(f"Starting v2 tts-only pipeline for course: {self.course.id}")

            script = self.load_cached_script()
            if script is None:
                return PipelineResult(success=False, error="cached_script_missing")

            async def tts_progress(done: int, total: int, failed: int, message: str) -> None:
                if on_progress is None:
                    return
                frac = 0.0
                if int(total) > 0:
                    frac = float(done) / float(max(1, total))
                r = on_progress(float(frac), f"{message}:{done}/{total}:{failed}")
                if inspect.isawaitable(r):
                    await r

            service = TTSPregenService(
                paths=self.paths,
                speaker=str(speaker or TTSPregenService.DEFAULT_SPEAKER),
                quality=str(quality or TTSPregenService.DEFAULT_QUALITY),
                engine=str(engine or TTSPregenService.DEFAULT_ENGINE),
                model_id=(str(model_id).strip() if model_id else None),
            )
            script = await service.pregen_all(script, skip_existing=skip_existing, on_progress=tts_progress)
            await self._save_script(script)

            if on_progress is not None:
                try:
                    r = on_progress(1.0, "done")
                    if inspect.isawaitable(r):
                        await r
                except Exception:
                    pass

            return PipelineResult(
                success=True,
                bundle=None,
                script=script,
                script_entry_count=len(script.entries),
                tts_ready_count=sum(1 for e in script.entries if e.tts_path),
            )
        except Exception as e:
            logger.exception("TTS-only pipeline failed")
            return PipelineResult(success=False, error=str(e))

    async def run_script_only(
        self,
        *,
        skip_existing: bool = True,
        force_regenerate: bool = False,
        scope: str = "all",
        intensity: str = "medium",
        narration_lang: str = "zh",
        audience: str = "adult",
        english_level: str = "intermediate",
        script_mode: str = "auto",
        llm_model: Optional[str] = None,
        retry_failed_only: bool = True,
    ) -> PipelineResult:
        if force_regenerate:
            skip_existing = False

        try:
            logger.info(f"Starting v2 script-only pipeline for course: {self.course.id}")

            analyzer = Analyzer(paths=self.paths, subtitle_path=None, video_path=None)
            if not (self.paths.subtitles_json.exists() and self.paths.timeline_features_json.exists()):
                return PipelineResult(success=False, error="cached_analysis_missing")

            bundle = await analyzer.analyze_full(skip_existing=True)
            bundle = self._apply_scope(bundle, str(scope or "all"))

            script = await self._run_script_generation(
                bundle,
                skip_existing,
                intensity=str(intensity or "medium"),
                narration_lang=str(narration_lang or "zh"),
                audience=str(audience or "adult"),
                english_level=str(english_level or "intermediate"),
                script_mode=str(script_mode or "auto"),
                llm_model=llm_model,
                retry_failed_only=bool(retry_failed_only),
            )
            await self._save_script(script)

            return PipelineResult(
                success=True,
                bundle=bundle,
                script=script,
                subtitle_count=len(bundle.subtitles),
                gap_count=len(bundle.timeline_features.gaps) if bundle.timeline_features else 0,
                script_entry_count=len(script.entries),
                tts_ready_count=sum(1 for e in script.entries if e.tts_path),
            )
        except Exception as e:
            logger.exception("Script-only pipeline failed")
            return PipelineResult(success=False, error=str(e))
    
    async def _run_analysis(self, skip_existing: bool) -> AnalysisBundle:
        """Run subtitle analysis."""
        logger.info("Running subtitle analysis...")
        
        # Get subtitle path
        subtitle_path = None
        if hasattr(self.course, "subtitle_path") and self.course.subtitle_path:
            subtitle_path = Path(self.course.subtitle_path)
        
        if not subtitle_path or not subtitle_path.exists():
            raise AnalysisError(f"Subtitle file not found for course: {self.course.id}")
        
        # Get video path
        video_path = None
        if hasattr(self.course, "video_path") and self.course.video_path:
            video_path = Path(self.course.video_path)
        
        analyzer = Analyzer(
            paths=self.paths,
            subtitle_path=subtitle_path,
            video_path=video_path,
        )
        
        return await analyzer.analyze_full(skip_existing=skip_existing)
    
    async def _run_scene_detection(self, skip_existing: bool) -> List[SceneInfo]:
        """Run scene detection and keyframe extraction."""
        logger.info("Running scene detection...")
        
        # Get video path
        video_path = None
        if hasattr(self.course, "video_path") and self.course.video_path:
            video_path = Path(self.course.video_path)
        
        if not video_path or not video_path.exists():
            logger.warning("Video file not found, skipping scene detection")
            return []
        
        try:
            service = SceneDetectionService(paths=self.paths)
            
            # Step 1: Detect scenes
            scenes = await service.detect_scenes(video_path, skip_existing=skip_existing)
            
            # Step 2: Extract keyframes at scene midpoints (1-2 frames per scene)
            scenes = await service.extract_keyframes(
                video_path,
                scenes,
                frames_per_scene=1,  # Only 1 frame per scene for efficiency
                skip_existing=skip_existing,
            )
            
            keyframe_count = sum(len(s.keyframe_paths) for s in scenes)
            logger.info(f"Scene detection complete: {len(scenes)} scenes, {keyframe_count} keyframes")
            
            return scenes
            
        except SceneDetectionError as e:
            logger.warning(f"Scene detection failed: {e}")
            return []
    
    async def _run_vision_analysis(
        self,
        scenes: List[SceneInfo],
        skip_existing: bool,
        *,
        character_candidates: Optional[CharacterCandidates] = None,
    ) -> List[VisualFeatures]:
        """Run visual recognition on keyframes."""
        logger.info("Running vision analysis...")
        
        # Collect all keyframe paths
        keyframe_paths: List[str] = []
        scene_ids: List[int] = []
        
        for scene in scenes:
            for path in scene.keyframe_paths:
                keyframe_paths.append(path)
                scene_ids.append(scene.scene_id)
        
        if not keyframe_paths:
            logger.warning("No keyframes to analyze")
            return []
        
        try:
            service = VisionService(
                paths=self.paths,
                max_concurrent=3,  # Limit concurrent API calls
                max_side=1024,     # Compress images to max 1024px
                jpeg_quality=85,   # Good balance of quality/size
            )
            
            features = await service.analyze_keyframes(
                keyframe_paths,
                scene_ids,
                character_candidates=character_candidates,
                skip_existing=skip_existing,
            )
            
            logger.info(f"Vision analysis complete: {len(features)} frames analyzed")
            
            return features
            
        except VisionError as e:
            logger.warning(f"Vision analysis failed: {e}")
            return []
    
    async def _run_character_extraction(
        self,
        bundle: AnalysisBundle,
        *,
        title: str,
        llm_model: Optional[str] = None,
        skip_existing: bool,
    ) -> CharacterCandidates:
        """Run character candidate extraction from title and subtitles."""
        logger.info("Extracting character candidates...")
        
        try:
            extractor = CharacterExtractor(paths=self.paths, model=llm_model)
            candidates = await extractor.extract(
                bundle,
                title=title,
                skip_existing=skip_existing,
            )
            logger.info(f"Extracted {len(candidates.characters)} character candidates")
            return candidates
        except CharacterExtractionError as e:
            logger.warning(f"Character extraction failed: {e}")
            return CharacterCandidates()

    async def _run_short_utterance_relabel(
        self,
        bundle: AnalysisBundle,
        *,
        candidates: CharacterCandidates,
        skip_existing: bool,
    ) -> AnalysisBundle:
        video_path = None
        if hasattr(self.course, "video_path") and self.course.video_path:
            video_path = Path(self.course.video_path)

        if not video_path or not video_path.exists():
            return bundle

        try:
            service = ShortUtteranceRelabelService(paths=self.paths)
            updated_subs, updated_diar, decisions = await service.relabel(
                video_path=video_path,
                subtitles=list(bundle.subtitles or []),
                candidates=candidates,
                diarization=list(bundle.diarization or []),
                skip_existing=skip_existing,
            )
            if decisions:
                logger.info(f"Short utterance relabel applied: {len(decisions)}")
            bundle.subtitles = updated_subs
            bundle.diarization = updated_diar
            if decisions:
                from storage.v2_player import SpeakerMap

                speaker_map = bundle.speaker_map or SpeakerMap()
                for d in decisions:
                    if not d.chosen_speaker_id or not d.speaking_character:
                        continue
                    speaker_map.mappings[str(d.chosen_speaker_id)] = str(d.speaking_character)
                bundle.speaker_map = speaker_map
            return bundle
        except ShortUtteranceRelabelError as e:
            logger.warning(f"Short utterance relabel failed: {e}")
            return bundle
    
    async def _run_speaker_frame_extraction(
        self,
        diarization: list,
        *,
        skip_existing: bool,
    ) -> List[SpeakerFrame]:
        """Extract frames at speaking moments based on diarization."""
        logger.info("Extracting speaker frames...")
        
        video_path = None
        if hasattr(self.course, "video_path") and self.course.video_path:
            video_path = Path(self.course.video_path)
        
        if not video_path or not video_path.exists():
            logger.warning("Video file not found, skipping speaker frame extraction")
            return []
        
        try:
            extractor = SpeakerFrameExtractor(paths=self.paths)
            frames = await extractor.extract(
                video_path,
                diarization,
                skip_existing=skip_existing,
            )
            logger.info(f"Extracted {len(frames)} speaker frames")
            return frames
        except SpeakerFrameExtractionError as e:
            logger.warning(f"Speaker frame extraction failed: {e}")
            return []
    
    async def _run_speaker_vision(
        self,
        speaker_frames: List[SpeakerFrame],
        candidates: Optional[CharacterCandidates],
        subtitles: list,
        *,
        skip_existing: bool,
    ) -> List[SpeakerVisualResult]:
        """Analyze speaker frames with closed-set recognition."""
        logger.info("Running speaker vision analysis...")
        
        if not candidates:
            candidates = CharacterCandidates()
        
        try:
            service = SpeakerVisionService(paths=self.paths)
            results = await service.analyze(
                speaker_frames,
                candidates,
                subtitles,
                skip_existing=skip_existing,
            )
            logger.info(f"Speaker vision complete: {len(results)} frames analyzed")
            return results
        except SpeakerVisionError as e:
            logger.warning(f"Speaker vision failed: {e}")
            return []
    
    async def _run_speaker_naming_enhanced(
        self,
        *,
        diarization: list,
        speaker_visual: List[SpeakerVisualResult],
        candidates: Optional[CharacterCandidates],
        skip_existing: bool,
    ):
        """Build speaker map using enhanced diarization-aligned visual results."""
        logger.info("Running enhanced speaker naming...")
        service = SpeakerNamingService(paths=self.paths)
        try:
            return await service.build_speaker_map(
                diarization=diarization,
                speaker_visual=speaker_visual,
                candidates=candidates,
                skip_existing=skip_existing,
            )
        except SpeakerNamingError as e:
            logger.warning(f"Speaker naming failed: {e}")
            from storage.v2_player import SpeakerMap
            return SpeakerMap()

    async def _run_diarization(self, skip_existing: bool) -> list:
        logger.info("Running diarization...")

        video_path = None
        if hasattr(self.course, "video_path") and self.course.video_path:
            video_path = Path(self.course.video_path)

        if not video_path or not video_path.exists():
            logger.warning("Video file not found, skipping diarization")
            return []

        self.paths.ensure_dirs()
        audio_path = self.paths.analysis_dir / "audio_16k_mono.wav"

        if not (skip_existing and audio_path.exists()):
            resp = await host.media.extract_audio(
                video_path=str(video_path),
                output_path=str(audio_path),
                sample_rate=16000,
                channels=1,
                audio_format="wav",
            )
            if not isinstance(resp, dict) or int(resp.get("code") or 0) != 200:
                raise DiarizationError(str(resp.get("message") or "extract_audio_failed"))

        service = DiarizationService(paths=self.paths)
        return await service.diarize(audio_path=audio_path, skip_existing=skip_existing)

    def _apply_diarization_to_subtitles(self, bundle: AnalysisBundle) -> AnalysisBundle:
        diarization = list(bundle.diarization or [])
        if not diarization or not bundle.subtitles:
            return bundle

        updated_subtitles = []
        for sub in bundle.subtitles:
            sub_start = float(sub.start_time)
            sub_end = float(sub.end_time)
            overlaps = []
            for seg in diarization:
                overlap_start = max(sub_start, float(seg.start_time))
                overlap_end = min(sub_end, float(seg.end_time))
                overlap_duration = max(0.0, overlap_end - overlap_start)
                if overlap_duration > 0.0:
                    overlaps.append((str(seg.speaker_id), overlap_duration))

            speaker_id = None
            if overlaps:
                overlaps.sort(key=lambda x: x[1], reverse=True)
                speaker_id = overlaps[0][0]

            updated_subtitles.append(
                type(sub)(
                    index=int(sub.index),
                    start_time=float(sub.start_time),
                    end_time=float(sub.end_time),
                    text=str(sub.text),
                    speaker_id=speaker_id,
                )
            )

        bundle.subtitles = updated_subtitles
        return bundle

    async def _run_speaker_naming(
        self,
        *,
        diarization: list,
        visual_features: list,
        scenes: list,
        skip_existing: bool,
    ):
        logger.info("Running speaker naming...")
        service = SpeakerNamingService(paths=self.paths)
        try:
            return await service.build_speaker_map(
                diarization=diarization,
                visual_features=visual_features,
                scenes=scenes,
                skip_existing=skip_existing,
            )
        except SpeakerNamingError as e:
            logger.warning(f"Speaker naming failed: {e}")
            from storage.v2_player import SpeakerMap

            return SpeakerMap()
    
    async def _run_chapter_generation(
        self,
        bundle: AnalysisBundle,
        *,
        directives: Optional[NarrationDirectives],
        title: str,
        character_candidates: Optional[CharacterCandidates] = None,
        skip_existing: bool,
    ) -> List[ChapterInfo]:
        """Run chapter generation."""
        logger.info("Generating chapters...")
        
        # Check cache
        if skip_existing and self.paths.chapters_json.exists():
            try:
                import json
                data = json.loads(self.paths.chapters_json.read_text(encoding="utf-8"))
                chapters = [ChapterInfo.from_dict(c) for c in data.get("chapters", [])]
                if chapters:
                    logger.info(f"Using cached chapters: {len(chapters)}")
                    return chapters
            except Exception:
                pass
        
        try:
            generator = ChapterGenerator()
            chapters = await generator.generate(
                bundle,
                directives=directives,
                title=title,
                character_candidates=character_candidates,
            )
            
            # Save chapters
            if chapters:
                self.paths.ensure_dirs()
                import json
                self.paths.chapters_json.write_text(
                    json.dumps({"chapters": [c.to_dict() for c in chapters]}, ensure_ascii=False, indent=2),
                    encoding="utf-8",
                )
            
            logger.info(f"Generated {len(chapters)} chapters")
            return chapters
        except Exception as e:
            logger.warning(f"Chapter generation failed: {e}")
            return []

    async def _run_script_generation(
        self,
        bundle: AnalysisBundle,
        skip_existing: bool,
        *,
        intensity: str,
        narration_lang: str,
        audience: str,
        english_level: str,
        script_mode: str,
        llm_model: Optional[str],
        retry_failed_only: bool = False,
        directives: Optional[NarrationDirectives] = None,
    ) -> SmartScript:
        """Run script generation."""
        logger.info("Generating SmartScript...")

        max_entries_per_minute = self._intensity_max_entries_per_minute(str(intensity))
        profile_hash = V2CacheKeys.compute_hash(
            {
                "script_algo_version": "v2_player_llm_postprocess_v5",
                "narration_lang": str(narration_lang or "zh"),
                "audience": str(audience or "adult"),
                "english_level": str(english_level or "intermediate"),
                "script_mode": str(script_mode or "auto"),
                "llm_model": str(llm_model or ""),
                "max_entries_per_minute": int(max_entries_per_minute),
            }
        )

        current_hash = V2CacheKeys.script_input_hash(
            subtitles=[s.to_dict() for s in bundle.subtitles],
            timeline_features=bundle.timeline_features.to_dict() if bundle.timeline_features else None,
            scenes=[s.to_dict() for s in bundle.scenes] if bundle.scenes else None,
            visual_features=[v.to_dict() for v in bundle.visual_features] if bundle.visual_features else None,
            speaker_map=(bundle.speaker_map.mappings if bundle.speaker_map else None),
        )

        def can_use_existing(existing: Optional[SmartScript], expected_generator: str) -> bool:
            if not skip_existing or not existing:
                return False
            if str(existing.generator or "") != str(expected_generator or ""):
                return False
            if str(existing.input_hash or "") != str(current_hash or ""):
                return False
            if str(existing.profile_hash or "") != str(profile_hash or ""):
                return False
            return True

        mode = str(script_mode or "auto").strip().lower()
        if mode not in {"rule", "llm", "auto"}:
            mode = "auto"

        if mode in {"llm", "auto"}:
            llm_gen = LLMScriptGenerator(
                paths=self.paths,
                model=str(llm_model).strip() or None,
                narration_lang=str(narration_lang or "zh"),
                audience=str(audience or "adult"),
                english_level=str(english_level or "intermediate"),
                max_entries_per_minute=int(max_entries_per_minute),
                directives=directives,
            )
            existing = llm_gen.load_script()
            if existing is not None and not retry_failed_only and can_use_existing(existing, "llm"):
                logger.info("Using cached script")
                return existing
            llm_script = await llm_gen.generate(
                bundle,
                profile_hash=profile_hash,
                course_title=str(getattr(self.course, "title", "") or "").strip() or None,
                reuse_cached_windows=bool(skip_existing),
                retry_failed_only=bool(retry_failed_only),
            )
            llm_script.profile_hash = str(profile_hash or "")
            llm_script.input_hash = str(current_hash or "")
            llm_script.generator = "llm"
            return llm_script

        rule_gen = RuleScriptGenerator(
            paths=self.paths,
            max_entries_per_minute=int(max_entries_per_minute),
            narration_lang=str(narration_lang or "zh"),
        )
        existing = rule_gen.load_script()
        if existing is not None and can_use_existing(existing, "rule"):
            logger.info("Using cached script")
            return existing
        rule_script = await rule_gen.generate(bundle, profile_hash=profile_hash)
        rule_script.profile_hash = str(profile_hash or "")
        rule_script.input_hash = str(current_hash or "")
        rule_script.generator = "rule"
        return rule_script
    
    async def _run_tts_pregen(
        self,
        script: SmartScript,
        skip_existing: bool,
        *,
        speaker: Optional[str],
        quality: Optional[str],
        engine: Optional[str],
        model_id: Optional[str],
        on_progress: Optional[Callable[[float, str], Awaitable[None] | None]],
    ) -> SmartScript:
        """Run TTS pre-generation."""
        logger.info("Pre-generating TTS...")
        
        service = TTSPregenService(
            paths=self.paths,
            speaker=str(speaker or TTSPregenService.DEFAULT_SPEAKER),
            quality=str(quality or TTSPregenService.DEFAULT_QUALITY),
            engine=str(engine or TTSPregenService.DEFAULT_ENGINE),
            model_id=(str(model_id).strip() if model_id else None),
        )

        async def tts_progress(done: int, total: int, failed: int, message: str) -> None:
            if on_progress is None:
                return
            frac = 0.78
            if int(total) > 0:
                frac = 0.78 + 0.17 * (float(done) / float(max(1, total)))
            r = on_progress(float(frac), f"{message}:{done}/{total}:{failed}")
            if inspect.isawaitable(r):
                await r

        return await service.pregen_all(script, skip_existing=skip_existing, on_progress=tts_progress)
    
    async def _save_script(self, script: SmartScript) -> None:
        """Save script to disk."""
        generator = RuleScriptGenerator(paths=self.paths)
        await generator.save_script(script)
    
    def has_cached_script(self) -> bool:
        """Check if a cached script exists."""
        return self.paths.smart_script_json.exists()
    
    def load_cached_script(self) -> Optional[SmartScript]:
        """Load cached script if exists."""
        if not self.paths.smart_script_json.exists():
            return None
        
        try:
            return SmartScript.from_json(
                self.paths.smart_script_json.read_text(encoding="utf-8")
            )
        except Exception:
            return None
    
    def clear_cache(self) -> None:
        """Clear all cached data for this course."""
        self.paths.clear()
        logger.info(f"Cleared v2 cache for course: {self.course.id}")

    @staticmethod
    def _intensity_max_entries_per_minute(intensity: str) -> int:
        k = str(intensity or "medium").strip().lower()
        if k == "low":
            return 1
        if k == "high":
            return 6
        return 3

    @staticmethod
    def _apply_scope(bundle: AnalysisBundle, scope: str) -> AnalysisBundle:
        s = str(scope or "all").strip().lower()
        if s in {"", "all"}:
            return bundle

        subtitles = list(bundle.subtitles or [])
        if s == "first_30_segments":
            allowed = {sub.index for sub in subtitles if int(sub.index) < 30}
        elif s == "first_5_min":
            allowed = {sub.index for sub in subtitles if float(sub.start_time) < 300.0}
        else:
            return bundle

        filtered_subtitles = [sub for sub in subtitles if sub.index in allowed]
        tf = bundle.timeline_features
        if tf is None:
            return AnalysisBundle(
                course_id=bundle.course_id,
                subtitles=filtered_subtitles,
                timeline_features=None,
                scenes=bundle.scenes,
                diarization=bundle.diarization,
                visual_features=bundle.visual_features,
                speaker_map=bundle.speaker_map,
                analyzed_at=bundle.analyzed_at,
                analysis_version=bundle.analysis_version,
            )

        filtered_gaps = [g for g in tf.gaps if (g.after_index in allowed and (g.after_index + 1) in allowed)]
        filtered_densities = [d for d in tf.densities if d.index in allowed]
        filtered_tf = type(tf)(
            gaps=filtered_gaps,
            densities=filtered_densities,
            gap_threshold=tf.gap_threshold,
            density_threshold=tf.density_threshold,
        )
        return AnalysisBundle(
            course_id=bundle.course_id,
            subtitles=filtered_subtitles,
            timeline_features=filtered_tf,
            scenes=bundle.scenes,
            diarization=bundle.diarization,
            visual_features=bundle.visual_features,
            speaker_map=bundle.speaker_map,
            analyzed_at=bundle.analyzed_at,
            analysis_version=bundle.analysis_version,
        )


async def prepare_course_for_v2(
    course: "Course",
    course_db: "CourseDatabase",
    *,
    enable_tts: bool = True,
    stage: str = "full",
    force_regenerate: bool = False,
    scope: str = "all",
    intensity: str = "medium",
    narration_lang: str = "zh",
    audience: str = "adult",
    english_level: str = "intermediate",
    script_mode: str = "auto",
    llm_model: Optional[str] = None,
    speaker: Optional[str] = None,
    quality: Optional[str] = None,
    engine: Optional[str] = None,
    model_id: Optional[str] = None,
    on_progress: Optional[Callable[[float, str], Awaitable[None] | None]] = None,
) -> PipelineResult:
    """
    Convenience function to prepare a course for v2 playback.
    
    Args:
        course: Course to prepare
        course_db: Course database
        enable_tts: Whether to pre-generate TTS
        force_regenerate: Force regeneration
    
    Returns:
        PipelineResult
    """
    pipeline = V2Pipeline(
        course=course,
        course_db=course_db,
        enable_tts=enable_tts,
    )

    stage_k = str(stage or "full").strip().lower()
    if stage_k in {"script", "script_only", "script_failed_only", "llm_failed_only"}:
        return await pipeline.run_script_only(
            force_regenerate=force_regenerate,
            scope=str(scope or "all"),
            intensity=str(intensity or "medium"),
            narration_lang=str(narration_lang or "zh"),
            audience=str(audience or "adult"),
            english_level=str(english_level or "intermediate"),
            script_mode=str(script_mode or "auto"),
            llm_model=llm_model,
            retry_failed_only=stage_k in {"script_failed_only", "llm_failed_only"},
        )
    if stage_k in {"tts", "tts_only", "tts_failed_only"}:
        if stage_k in {"tts_failed_only"}:
            windows_path = getattr(pipeline.paths, "smart_script_windows_json", None)
            if windows_path is not None and windows_path.exists():
                try:
                    import json

                    cache_obj = json.loads(windows_path.read_text(encoding="utf-8"))
                    intro_obj = cache_obj.get("intro") if isinstance(cache_obj, dict) else None
                    windows_obj = cache_obj.get("windows") if isinstance(cache_obj, dict) else None

                    intro_failed = (
                        isinstance(intro_obj, dict)
                        and str(intro_obj.get("status") or "") != "success"
                    )
                    window_failed = False
                    if isinstance(windows_obj, dict):
                        for v in windows_obj.values():
                            if isinstance(v, dict) and str(v.get("status") or "") == "failed":
                                window_failed = True
                                break
                    if intro_failed or window_failed:
                        await pipeline.run_script_only(
                            force_regenerate=force_regenerate,
                            scope=str(scope or "all"),
                            intensity=str(intensity or "medium"),
                            narration_lang=str(narration_lang or "zh"),
                            audience=str(audience or "adult"),
                            english_level=str(english_level or "intermediate"),
                            script_mode=str(script_mode or "auto"),
                            llm_model=llm_model,
                            retry_failed_only=True,
                        )
                except Exception:
                    pass

        res = await pipeline.run_tts_only(
            force_regenerate=force_regenerate,
            speaker=speaker,
            quality=quality,
            engine=engine,
            model_id=model_id,
            on_progress=on_progress,
        )
        if not res.success and str(res.error or "") == "cached_script_missing":
            script_res = await pipeline.run_script_only(
                force_regenerate=force_regenerate,
                scope=str(scope or "all"),
                intensity=str(intensity or "medium"),
                narration_lang=str(narration_lang or "zh"),
                audience=str(audience or "adult"),
                english_level=str(english_level or "intermediate"),
                script_mode=str(script_mode or "auto"),
                llm_model=llm_model,
                retry_failed_only=stage_k in {"tts_failed_only"},
            )
            if script_res.success:
                res = await pipeline.run_tts_only(
                    force_regenerate=force_regenerate,
                    speaker=speaker,
                    quality=quality,
                    engine=engine,
                    model_id=model_id,
                    on_progress=on_progress,
                )
        if res.success or str(res.error or "") != "cached_script_missing":
            return res

    return await pipeline.run_full(
        force_regenerate=force_regenerate,
        scope=str(scope or "all"),
        intensity=str(intensity or "medium"),
        narration_lang=str(narration_lang or "zh"),
        audience=str(audience or "adult"),
        english_level=str(english_level or "intermediate"),
        script_mode=str(script_mode or "auto"),
        llm_model=llm_model,
        speaker=speaker,
        quality=quality,
        engine=engine,
        model_id=model_id,
        on_progress=on_progress,
    )
