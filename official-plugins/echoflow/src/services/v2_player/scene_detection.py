"""
v2_player scene_detection - Scene detection and keyframe extraction.

This module provides scene detection and keyframe extraction for Smart Player v2.

Current implementation:
- Scene detection: Uniform segmentation (TODO: integrate PySceneDetect via Host)
- Keyframe extraction: Extract 1-2 frames per scene at midpoint (not every second)

Future improvements (requires Host API extension):
- dawnchat.media.detect_scenes - PySceneDetect integration
- dawnchat.media.extract_frame_at - Extract single frame at specific timestamp

Usage:
    from services.v2_player.scene_detection import SceneDetectionService
    
    service = SceneDetectionService(paths)
    scenes = await service.detect_scenes(video_path)
"""

from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path
from typing import List, Optional, Tuple

from dawnchat_sdk.host import host

from storage.v2_player import SceneInfo, V2PlayerPaths

logger = logging.getLogger("echoflow.v2_player.scene_detection")


class SceneDetectionError(Exception):
    """Raised when scene detection fails."""
    pass


class SceneDetectionService:
    """
    Scene detection and keyframe extraction service.
    
    Provides:
    1. Scene detection (uniform segmentation for now, PySceneDetect integration pending)
    2. Smart keyframe extraction (1-2 frames per scene at midpoint, NOT every second)
    3. Efficient frame extraction using FFmpeg with specific timestamps
    """
    
    # Default parameters
    DEFAULT_SCENE_DURATION = 30.0   # Default scene duration for uniform segmentation
    DEFAULT_MIN_SCENE_DURATION = 5.0  # Minimum scene duration
    DEFAULT_FRAMES_PER_SCENE = 1    # Number of keyframes per scene
    
    def __init__(self, paths: V2PlayerPaths):
        """
        Initialize scene detection service.
        
        Args:
            paths: V2PlayerPaths instance for this course
        """
        self.paths = paths
    
    async def detect_scenes(
        self,
        video_path: Path,
        *,
        min_scene_duration: float = DEFAULT_MIN_SCENE_DURATION,
        skip_existing: bool = True,
    ) -> List[SceneInfo]:
        """
        Detect scenes in video.
        
        Currently implements uniform segmentation as PySceneDetect
        integration is pending. Each segment is ~30 seconds.
        
        Args:
            video_path: Path to video file
            min_scene_duration: Minimum scene duration
            skip_existing: Skip if scenes already exist
        
        Returns:
            List of SceneInfo
        
        Raises:
            SceneDetectionError: If detection fails
        """
        # Check for existing result
        if skip_existing and self.paths.scenes_json.exists():
            logger.info("Using existing scene detection result")
            return self._load_from_cache()
        
        # Ensure video file exists
        if not video_path.exists():
            raise SceneDetectionError(f"Video file not found: {video_path}")
        
        logger.info(f"Starting scene detection for {video_path}")
        
        try:
            # Use Host's PySceneDetect API
            result = await host.media.scene_detect(
                video_path=str(video_path),
                threshold=27.0,
                min_scene_len=int(min_scene_duration * 30),  # Convert seconds to frames (~30fps)
            )
            
            if result.get("code") == 200:
                # Convert Host response to SceneInfo list
                scenes = []
                for scene_data in result.get("data", {}).get("scenes", []):
                    scene = SceneInfo(
                        scene_id=scene_data["scene_id"],
                        start_time=scene_data["start_time"],
                        end_time=scene_data["end_time"],
                        keyframe_paths=[],
                    )
                    scenes.append(scene)
                
                # Save to cache
                self._save_to_cache(scenes)
                
                logger.info(f"Scene detection complete (PySceneDetect): {len(scenes)} scenes")
                return scenes
            
            # Fallback to uniform segmentation if Host API fails
            logger.warning(f"Host scene_detect failed, falling back to uniform segmentation: {result.get('message')}")
            return await self._detect_scenes_fallback(video_path, min_scene_duration)
            
        except SceneDetectionError:
            raise
        except Exception as e:
            logger.exception("Scene detection failed")
            raise SceneDetectionError(f"Scene detection failed: {e}") from e
    
    async def _detect_scenes_fallback(
        self,
        video_path: Path,
        min_scene_duration: float,
    ) -> List[SceneInfo]:
        """Fallback: Uniform segmentation when PySceneDetect unavailable."""
        # Get video duration
        info_result = await host.media.get_info(str(video_path))
        
        if info_result.get("code") != 200:
            raise SceneDetectionError("Failed to get video info")
        
        duration = info_result.get("data", {}).get("duration", 0)
        if duration <= 0:
            raise SceneDetectionError("Invalid video duration")
        
        # Create uniform segments (~30s each)
        segment_duration = self.DEFAULT_SCENE_DURATION
        scenes = []
        scene_id = 0
        current_time = 0.0
        
        while current_time < duration:
            end_time = min(current_time + segment_duration, duration)
            
            scene = SceneInfo(
                scene_id=scene_id,
                start_time=current_time,
                end_time=end_time,
                keyframe_paths=[],
            )
            scenes.append(scene)
            
            scene_id += 1
            current_time = end_time
        
        # Save to cache
        self._save_to_cache(scenes)
        
        logger.info(f"Scene detection complete (fallback): {len(scenes)} scenes")
        return scenes
    
    async def extract_keyframes(
        self,
        video_path: Path,
        scenes: Optional[List[SceneInfo]] = None,
        *,
        frames_per_scene: int = DEFAULT_FRAMES_PER_SCENE,
        skip_existing: bool = True,
    ) -> List[SceneInfo]:
        """
        Extract keyframes from video - SMART extraction at scene midpoints.
        
        Instead of extracting frames every second (wasteful), this method:
        1. Calculates the midpoint of each scene
        2. Extracts only 1-2 frames per scene at those specific timestamps
        3. Uses FFmpeg's -ss seek for efficient single-frame extraction
        
        Args:
            video_path: Path to video file
            scenes: List of scenes (required for smart extraction)
            frames_per_scene: Number of frames to extract per scene (1-2)
            skip_existing: Skip if keyframes already exist
        
        Returns:
            Updated scenes with keyframe_paths filled
        
        Raises:
            SceneDetectionError: If extraction fails
        """
        if not scenes:
            logger.warning("No scenes provided, cannot extract keyframes")
            return []
        
        # Check for existing keyframes
        if skip_existing and list(self.paths.keyframes_dir.glob("*.jpg")):
            logger.info("Using existing keyframes")
            return self._load_keyframe_paths(scenes)
        
        # Ensure directories exist
        self.paths.ensure_dirs()
        
        # Clear old keyframes
        for old_frame in self.paths.keyframes_dir.glob("*.jpg"):
            old_frame.unlink()
        
        logger.info(f"Extracting {frames_per_scene} keyframe(s) per scene ({len(scenes)} scenes)")
        
        try:
            # Calculate timestamps for extraction (midpoint of each scene)
            timestamps: List[Tuple[int, float]] = []  # (scene_id, timestamp)
            
            for scene in scenes:
                scene_duration = scene.end_time - scene.start_time
                
                if frames_per_scene == 1:
                    # Single frame at midpoint
                    midpoint = scene.start_time + scene_duration / 2
                    timestamps.append((scene.scene_id, midpoint))
                else:
                    # Multiple frames evenly distributed
                    step = scene_duration / (frames_per_scene + 1)
                    for i in range(1, frames_per_scene + 1):
                        ts = scene.start_time + step * i
                        timestamps.append((scene.scene_id, ts))
            
            # Extract frames at specific timestamps using FFmpeg
            extracted_paths = await self._extract_frames_at_timestamps(
                video_path, timestamps
            )
            
            # Assign keyframes to scenes
            for scene in scenes:
                scene.keyframe_paths = [
                    p for sid, p in extracted_paths if sid == scene.scene_id
                ]
            
            # Update cache
            self._save_to_cache(scenes)
            
            total_frames = sum(len(s.keyframe_paths) for s in scenes)
            logger.info(f"Extracted {total_frames} keyframes for {len(scenes)} scenes")
            
            return scenes
            
        except SceneDetectionError:
            raise
        except Exception as e:
            logger.exception("Keyframe extraction failed")
            raise SceneDetectionError(f"Keyframe extraction failed: {e}") from e
    
    def _assign_keyframes_to_scenes(
        self,
        scenes: List[SceneInfo],
    ) -> List[SceneInfo]:
        """
        Assign extracted keyframes to scenes based on timing.
        
        Args:
            scenes: List of scenes
        
        Returns:
            Updated scenes with keyframe_paths
        """
        # Get all keyframe files
        keyframe_files = sorted(self.paths.keyframes_dir.glob("*.jpg"))
        
        if not keyframe_files:
            return scenes
        
        # Estimate frame timestamps based on filename index
        # FFmpeg typically names frames as frame_0001.jpg, frame_0002.jpg, etc.
        # We'll assign based on scene boundaries
        
        updated_scenes = []
        
        for scene in scenes:
            # Simple assignment: one keyframe per scene
            # Use scene_id to pick a frame if available
            frame_idx = min(scene.scene_id, len(keyframe_files) - 1)
            
            if frame_idx >= 0 and frame_idx < len(keyframe_files):
                updated_scene = SceneInfo(
                    scene_id=scene.scene_id,
                    start_time=scene.start_time,
                    end_time=scene.end_time,
                    keyframe_paths=[str(keyframe_files[frame_idx])],
                )
            else:
                updated_scene = scene
            
            updated_scenes.append(updated_scene)
        
        # Update cache with keyframe paths
        self._save_to_cache(updated_scenes)
        
        return updated_scenes
    
    async def _extract_frames_at_timestamps(
        self,
        video_path: Path,
        timestamps: List[Tuple[int, float]],
    ) -> List[Tuple[int, str]]:
        """
        Extract frames at specific timestamps using Host's batch API.
        
        Uses Host's dawnchat.media.extract_frames_batch for efficient extraction.
        
        Args:
            video_path: Path to video file
            timestamps: List of (scene_id, timestamp_seconds)
        
        Returns:
            List of (scene_id, output_path) tuples
        """
        if not timestamps:
            return []
        
        # Prepare timestamp list for Host API
        ts_list = [ts for _, ts in timestamps]
        scene_ids = [sid for sid, _ in timestamps]
        
        try:
            # Call Host API for batch frame extraction
            result = await host.media.extract_frames_batch(
                video_path=str(video_path),
                output_dir=str(self.paths.keyframes_dir),
                timestamps=ts_list,
                quality=2,  # High quality JPEG
            )
            
            if result.get("code") != 200:
                error_msg = result.get("message", "Batch frame extraction failed")
                logger.warning(f"Host extract_frames_batch failed: {error_msg}")
                # Fallback to sequential extraction
                return await self._extract_frames_fallback(video_path, timestamps)
            
            output_paths = result.get("data", {}).get("output_paths", [])
            
            # Map paths back to scene_ids
            results: List[Tuple[int, str]] = []
            for i, path in enumerate(output_paths):
                if i < len(scene_ids):
                    results.append((scene_ids[i], path))
            
            return results
            
        except Exception as e:
            logger.warning(f"Host API call failed, falling back: {e}")
            return await self._extract_frames_fallback(video_path, timestamps)
    
    async def _extract_frames_fallback(
        self,
        video_path: Path,
        timestamps: List[Tuple[int, float]],
    ) -> List[Tuple[int, str]]:
        """
        Fallback: Extract frames using subprocess if Host API unavailable.
        """
        results: List[Tuple[int, str]] = []
        
        for scene_id, timestamp in timestamps:
            output_path = self.paths.keyframes_dir / f"scene_{scene_id:04d}_{timestamp:.2f}.jpg"
            
            cmd = [
                "ffmpeg",
                "-ss", str(timestamp),
                "-i", str(video_path),
                "-frames:v", "1",
                "-q:v", "2",
                "-y",
                str(output_path),
            ]
            
            try:
                process = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.DEVNULL,
                    stderr=asyncio.subprocess.PIPE,
                )
                _, stderr = await process.communicate()
                
                if process.returncode == 0 and output_path.exists():
                    results.append((scene_id, str(output_path)))
                    
            except Exception as e:
                logger.warning(f"Fallback extraction failed at {timestamp:.2f}s: {e}")
                continue
        
        return results
    
    def _load_keyframe_paths(
        self,
        scenes: List[SceneInfo],
    ) -> List[SceneInfo]:
        """Load keyframe paths from cache."""
        cached = self._load_from_cache()
        
        # Create a mapping of scene_id to keyframe_paths
        cache_map = {s.scene_id: s.keyframe_paths for s in cached}
        
        updated = []
        for scene in scenes:
            paths = cache_map.get(scene.scene_id, [])
            updated.append(SceneInfo(
                scene_id=scene.scene_id,
                start_time=scene.start_time,
                end_time=scene.end_time,
                keyframe_paths=paths,
            ))
        
        return updated
    
    def _save_to_cache(self, scenes: List[SceneInfo]) -> None:
        """Save scene detection result to cache."""
        self.paths.ensure_dirs()
        data = {
            "scenes": [s.to_dict() for s in scenes],
        }
        self.paths.scenes_json.write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    
    def _load_from_cache(self) -> List[SceneInfo]:
        """Load scene detection result from cache."""
        data = json.loads(
            self.paths.scenes_json.read_text(encoding="utf-8")
        )
        return [
            SceneInfo.from_dict(s)
            for s in data.get("scenes", [])
        ]
    
    def has_cache(self) -> bool:
        """Check if scene cache exists."""
        return self.paths.scenes_json.exists()
    
    def clear_cache(self) -> None:
        """Clear scene cache and keyframes."""
        if self.paths.scenes_json.exists():
            self.paths.scenes_json.unlink()
        
        # Clear keyframe images
        for f in self.paths.keyframes_dir.glob("*.jpg"):
            f.unlink()
