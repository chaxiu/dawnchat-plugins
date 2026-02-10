"""
v2_player paths - File path management for Smart Player v2.

All v2 player data is stored under:
    ~/.dawnchat/plugins/echoflow/v2_player/{course_id}/
    
Structure:
    v2_player/{course_id}/
        analysis/
            subtitles.json          - Unified subtitle data
            timeline_features.json  - Gaps and density info
            diarization.json        - Speaker diarization
            scenes.json             - Scene detection results
            visual_features.json    - Vision LLM results
            speaker_map.json        - Speaker ID to name mapping
        keyframes/
            scene_{id}_{frame}.jpg  - Keyframe images
        script/
            smart_script.json       - Generated SmartScript
            smart_script.meta.json  - Script metadata
        tts/
            line_{idx}_{hash}.wav   - Pre-generated TTS audio
"""

from __future__ import annotations

from pathlib import Path
import hashlib


class V2PlayerPaths:
    """
    Path manager for v2_player data.
    """
    
    def __init__(self, base_dir: Path, course_id: str):
        """
        Initialize path manager.
        
        Args:
            base_dir: Base data directory (e.g., ~/.dawnchat/plugins/echoflow/)
            course_id: Course identifier
        """
        self._base_dir = Path(base_dir)
        self._course_id = str(course_id)
        self._root = self._base_dir / "v2_player" / self._course_id
    
    @property
    def root(self) -> Path:
        """Root directory for this course's v2 data."""
        return self._root
    
    @property
    def analysis_dir(self) -> Path:
        """Directory for analysis results."""
        return self._root / "analysis"
    
    @property
    def keyframes_dir(self) -> Path:
        """Directory for keyframe images."""
        return self._root / "keyframes"
    
    @property
    def script_dir(self) -> Path:
        """Directory for generated scripts."""
        return self._root / "script"
    
    @property
    def tts_dir(self) -> Path:
        """Directory for TTS audio files."""
        return self._root / "tts"
    
    # ========================================================================
    # Analysis files
    # ========================================================================
    
    @property
    def subtitles_json(self) -> Path:
        """Path to subtitles.json."""
        return self.analysis_dir / "subtitles.json"
    
    @property
    def timeline_features_json(self) -> Path:
        """Path to timeline_features.json."""
        return self.analysis_dir / "timeline_features.json"
    
    @property
    def diarization_json(self) -> Path:
        """Path to diarization.json."""
        return self.analysis_dir / "diarization.json"
    
    @property
    def scenes_json(self) -> Path:
        """Path to scenes.json."""
        return self.analysis_dir / "scenes.json"
    
    @property
    def visual_features_json(self) -> Path:
        """Path to visual_features.json."""
        return self.analysis_dir / "visual_features.json"
    
    @property
    def speaker_map_json(self) -> Path:
        """Path to speaker_map.json."""
        return self.analysis_dir / "speaker_map.json"
    
    # ========================================================================
    # Script files
    # ========================================================================
    
    @property
    def smart_script_json(self) -> Path:
        """Path to smart_script.json."""
        return self.script_dir / "smart_script.json"
    
    @property
    def smart_script_meta_json(self) -> Path:
        """Path to smart_script.meta.json."""
        return self.script_dir / "smart_script.meta.json"

    @property
    def smart_script_windows_json(self) -> Path:
        return self.script_dir / "smart_script.windows.json"
    
    @property
    def chapters_json(self) -> Path:
        """Path to chapters.json."""
        return self.script_dir / "chapters.json"
    
    @property
    def direction_suggestions_json(self) -> Path:
        """Path to direction_suggestions.json."""
        return self.analysis_dir / "direction_suggestions.json"
    
    # ========================================================================
    # Dynamic paths
    # ========================================================================
    
    def keyframe_path(self, scene_id: int, frame_index: int = 0) -> Path:
        """
        Get path for a keyframe image.
        
        Args:
            scene_id: Scene number
            frame_index: Frame index within scene (default 0)
        
        Returns:
            Path to keyframe image
        """
        return self.keyframes_dir / f"scene_{scene_id:04d}_{frame_index:03d}.jpg"
    
    def tts_audio_path(self, entry_index: int, text_hash: str) -> Path:
        """
        Get path for TTS audio file.
        
        Args:
            entry_index: Script entry index
            text_hash: Hash of the text content (for cache invalidation)
        
        Returns:
            Path to TTS audio file
        """
        safe_hash = "".join(c for c in text_hash[:16] if c.isalnum())
        return self.tts_dir / f"line_{entry_index:04d}_{safe_hash}.wav"
    
    @staticmethod
    def compute_text_hash(text: str) -> str:
        """
        Compute a short hash for text content.
        
        Args:
            text: Text to hash
        
        Returns:
            16-character hex hash
        """
        return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]
    
    # ========================================================================
    # Directory management
    # ========================================================================
    
    def ensure_dirs(self) -> None:
        """Create all necessary directories."""
        self.analysis_dir.mkdir(parents=True, exist_ok=True)
        self.keyframes_dir.mkdir(parents=True, exist_ok=True)
        self.script_dir.mkdir(parents=True, exist_ok=True)
        self.tts_dir.mkdir(parents=True, exist_ok=True)
    
    def exists(self) -> bool:
        """Check if v2 data exists for this course."""
        return self._root.exists()
    
    def clear(self) -> None:
        """Remove all v2 data for this course."""
        import shutil
        if self._root.exists():
            shutil.rmtree(self._root, ignore_errors=True)
    
    # ========================================================================
    # Factory methods
    # ========================================================================
    
    @classmethod
    def from_db_path(cls, db_path: Path, course_id: str) -> "V2PlayerPaths":
        """
        Create paths from database path.
        
        Args:
            db_path: Path to courses.db
            course_id: Course identifier
        
        Returns:
            V2PlayerPaths instance
        """
        base_dir = Path(db_path).parent
        return cls(base_dir, course_id)
