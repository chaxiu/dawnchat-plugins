"""
v2_player tts_pregen - TTS pre-generation service.

This module handles batch pre-generation of TTS audio for SmartScript entries.
It uses the existing narrator.synthesize_tts function from the EchoFlow plugin.

Usage:
    from services.v2_player.tts_pregen import TTSPregenService
    
    service = TTSPregenService(paths)
    updated_script = await service.pregen_all(script)
"""

from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path
from typing import Awaitable, Callable, Optional

from storage.v2_player import SmartScript, SmartScriptEntry, V2PlayerPaths

logger = logging.getLogger("echoflow.v2_player.tts_pregen")


class TTSPregenError(Exception):
    """Raised when TTS pre-generation fails."""
    pass


class TTSPregenService:
    """
    TTS pre-generation service.
    
    Generates TTS audio for all script entries that require it.
    """
    
    # Default TTS parameters
    DEFAULT_SPEAKER = "Emma"
    DEFAULT_QUALITY = "fast"
    DEFAULT_ENGINE = "vibevoice"
    
    def __init__(
        self,
        paths: V2PlayerPaths,
        *,
        speaker: str = DEFAULT_SPEAKER,
        quality: str = DEFAULT_QUALITY,
        engine: str = DEFAULT_ENGINE,
        model_id: Optional[str] = None,
        max_concurrent: int = 1,
    ):
        """
        Initialize TTS pregen service.
        
        Args:
            paths: V2PlayerPaths instance for this course
            speaker: TTS speaker name
            quality: TTS quality ("fast" / "standard" / "high")
            max_concurrent: Maximum concurrent TTS calls
        """
        self.paths = paths
        self.speaker = speaker
        self.quality = quality
        self.engine = engine
        self.model_id = model_id
        self.max_concurrent = max(1, int(max_concurrent))
        
        self._synthesize_tts = None  # Lazy import
    
    def _get_synthesize_tts(self):
        """Lazy load synthesize_tts function."""
        if self._synthesize_tts is None:
            try:
                from services.narrator import synthesize_tts
                self._synthesize_tts = synthesize_tts
            except ImportError:
                logger.warning("Could not import synthesize_tts, using mock")
                self._synthesize_tts = self._mock_synthesize
        return self._synthesize_tts
    
    async def _mock_synthesize(
        self,
        *,
        text: str,
        output_path: str,
        speaker: str = "Emma",
        quality: str = "fast",
        engine: str = "vibevoice",
        model_id: Optional[str] = None,
    ) -> bool:
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        Path(output_path).touch()
        return True
    
    async def pregen_all(
        self,
        script: SmartScript,
        *,
        skip_existing: bool = True,
        on_progress: Optional[Callable[[int, int, int, str], Awaitable[None] | None]] = None,
    ) -> SmartScript:
        """
        Pre-generate TTS for all script entries.
        
        Args:
            script: SmartScript to process
            skip_existing: Skip entries that already have TTS files
        
        Returns:
            Updated SmartScript with tts_path filled
        """
        self.paths.ensure_dirs()
        
        entries_to_process = []
        pending_by_hash: dict[str, list[tuple[int, SmartScriptEntry, Path]]] = {}
        
        for i, entry in enumerate(script.entries):
            if entry.action_type == "ignore":
                continue
            
            if not entry.script:
                continue
            
            # Compute TTS path
            variant_payload = json.dumps(
                {
                    "text": str(entry.script),
                    "engine": str(self.engine or ""),
                    "model_id": str(self.model_id or ""),
                    "speaker": str(self.speaker or ""),
                    "quality": str(self.quality or ""),
                },
                ensure_ascii=False,
                sort_keys=True,
                separators=(",", ":"),
            )
            text_hash = V2PlayerPaths.compute_text_hash(variant_payload)
            tts_path = self.paths.tts_audio_path(i, text_hash)
            
            # Check if already exists
            if skip_existing:
                existing_tts_path: Optional[Path] = None
                if entry.tts_path:
                    try:
                        existing_tts_path = Path(str(entry.tts_path))
                    except Exception:
                        existing_tts_path = None

                if existing_tts_path is not None and existing_tts_path.exists():
                    expected_suffix = f"_{text_hash}.wav"
                    if str(existing_tts_path.name).endswith(expected_suffix):
                        continue
                    matches = list(self.paths.tts_dir.glob(f"line_*_{text_hash}.wav"))
                    if matches:
                        entry.tts_path = str(matches[0])
                        continue
                    entry.tts_path = None

                if tts_path.exists():
                    entry.tts_path = str(tts_path)
                    continue
                matches = list(self.paths.tts_dir.glob(f"line_*_{text_hash}.wav"))
                if matches:
                    entry.tts_path = str(matches[0])
                    continue

                entry.tts_path = None
            
            entries_to_process.append((i, entry, tts_path))
            pending_by_hash.setdefault(text_hash, []).append((i, entry, tts_path))
        
        if not entries_to_process:
            logger.info("No TTS to generate (all cached)")
            if on_progress is not None:
                try:
                    r = on_progress(0, 0, 0, "tts")
                    if asyncio.iscoroutine(r):
                        await r
                except Exception:
                    pass
            return script
        
        logger.info(f"Generating TTS for {len(entries_to_process)} entries")

        total = int(len(entries_to_process))
        progress = {"done": 0, "failed": 0}

        async def emit_progress(message: str) -> None:
            if on_progress is None:
                return
            try:
                r = on_progress(int(progress["done"]), int(total), int(progress["failed"]), str(message))
                if asyncio.iscoroutine(r):
                    await r
            except Exception:
                return

        if self.max_concurrent <= 1:
            await emit_progress("tts")
            for text_hash, group in pending_by_hash.items():
                idx, entry, tts_path = group[0]
                try:
                    await self._generate_tts(entry, tts_path)
                    for _, group_entry, _ in group:
                        group_entry.tts_path = str(tts_path)
                    logger.debug(f"Generated TTS for hash {text_hash} ({len(group)} entries)")
                except Exception as e:
                    logger.warning(f"TTS generation failed for hash {text_hash}: {e}")
                    for _, group_entry, _ in group:
                        group_entry.tts_path = None
                    progress["failed"] += len(group)
                progress["done"] += len(group)
                await emit_progress("tts")
        else:
            semaphore = asyncio.Semaphore(self.max_concurrent)
            lock = asyncio.Lock()

            async def process_hash(text_hash: str, group: list[tuple[int, SmartScriptEntry, Path]]):
                async with semaphore:
                    idx, entry, tts_path = group[0]
                    try:
                        await self._generate_tts(entry, tts_path)
                        for _, group_entry, _ in group:
                            group_entry.tts_path = str(tts_path)
                        logger.debug(f"Generated TTS for hash {text_hash} ({len(group)} entries)")
                        async with lock:
                            progress["done"] += len(group)
                    except Exception as e:
                        logger.warning(f"TTS generation failed for hash {text_hash}: {e}")
                        for _, group_entry, _ in group:
                            group_entry.tts_path = None
                        async with lock:
                            progress["done"] += len(group)
                            progress["failed"] += len(group)
                    await emit_progress("tts")

            await emit_progress("tts")
            tasks = [
                process_hash(text_hash, group)
                for text_hash, group in pending_by_hash.items()
            ]

            await asyncio.gather(*tasks, return_exceptions=True)
        
        # Count successful generations
        success_count = sum(1 for e in script.entries if e.tts_path)
        logger.info(f"TTS generation complete: {success_count}/{len(script.entries)} entries have audio")
        
        return script
    
    async def _generate_tts(
        self,
        entry: SmartScriptEntry,
        output_path: Path,
    ) -> None:
        """
        Generate TTS for a single entry.
        
        Args:
            entry: Script entry to process
            output_path: Path to save audio file
        """
        synthesize = self._get_synthesize_tts()
        
        # Ensure parent directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Call TTS
        ok = await synthesize(
            text=str(entry.script or ""),
            output_path=str(output_path),
            speaker=str(self.speaker or "Emma"),
            quality=str(self.quality or "fast"),
            engine=str(self.engine or "vibevoice"),
            model_id=(str(self.model_id).strip() if self.model_id else None),
        )
        if not (ok and output_path.exists()):
            raise TTSPregenError("TTS synthesis failed")
    
    def get_tts_stats(self, script: SmartScript) -> dict:
        """
        Get TTS generation statistics.
        
        Args:
            script: SmartScript to analyze
        
        Returns:
            Dict with statistics
        """
        total = len([e for e in script.entries if e.action_type != "ignore" and e.script])
        with_audio = len([e for e in script.entries if e.tts_path])
        
        # Calculate total audio duration
        total_duration = 0.0
        for entry in script.entries:
            if entry.tts_path and Path(entry.tts_path).exists():
                # Estimate duration from file size (rough)
                size = Path(entry.tts_path).stat().st_size
                # WAV: ~176KB per second at 44.1kHz mono 16-bit
                total_duration += size / 176000
        
        return {
            "total_entries": total,
            "with_audio": with_audio,
            "missing_audio": total - with_audio,
            "estimated_audio_duration": round(total_duration, 1),
        }
    
    def clear_cache(self) -> None:
        """Clear all TTS cache."""
        for f in self.paths.tts_dir.glob("*.wav"):
            f.unlink()
        logger.info("TTS cache cleared")
