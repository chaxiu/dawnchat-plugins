"""
v2_player subtitle_parser - Multi-format subtitle parser.

This module uses pysubs2 to parse various subtitle formats and convert them
to the unified SubtitleDocument model.

Supported formats (via pysubs2):
- SRT (SubRip)
- VTT (WebVTT)
- ASS/SSA (Advanced SubStation Alpha)
- SUB (MicroDVD) - requires FPS
- MPL2
- TMP (TMP Player)
- JSON (pysubs2 internal)

Usage:
    from services.v2_player.subtitle_parser import SubtitleParser
    
    parser = SubtitleParser()
    doc = parser.parse_file("/path/to/subtitle.srt")
    
    # Or from string:
    doc = parser.parse_string(srt_content, format="srt")
"""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Optional, Union

from .subtitle_model import SubtitleDocument, SubtitleSegment

logger = logging.getLogger("echoflow.v2_player.subtitle_parser")


class SubtitleParseError(Exception):
    """Raised when subtitle parsing fails."""
    pass


class SubtitleParser:
    """
    Multi-format subtitle parser.
    
    Uses pysubs2 as the primary parsing engine, with fallback handling
    for edge cases.
    """
    
    # Format detection patterns
    FORMAT_PATTERNS = {
        "srt": re.compile(r"^\d+\s*\n\d{2}:\d{2}:\d{2}[,\.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,\.]\d{3}", re.MULTILINE),
        "vtt": re.compile(r"^WEBVTT", re.MULTILINE),
        "ass": re.compile(r"^\[Script Info\]", re.MULTILINE | re.IGNORECASE),
        "ssa": re.compile(r"^\[Script Info\]", re.MULTILINE | re.IGNORECASE),
        "sub": re.compile(r"^\{\d+\}\{\d+\}"),  # MicroDVD format
    }
    
    # Extension to format mapping
    EXTENSION_MAP = {
        ".srt": "srt",
        ".vtt": "vtt",
        ".ass": "ass",
        ".ssa": "ssa",
        ".sub": "sub",
        ".mpl": "mpl2",
        ".tmp": "tmp",
        ".lrc": "lrc",
    }
    
    def __init__(self, default_fps: float = 23.976):
        """
        Initialize parser.
        
        Args:
            default_fps: Default FPS for formats that require it (MicroDVD)
        """
        self.default_fps = default_fps
        self._pysubs2 = None
    
    def _get_pysubs2(self):
        """Lazy load pysubs2."""
        if self._pysubs2 is None:
            try:
                import pysubs2
                self._pysubs2 = pysubs2
            except ImportError as e:
                raise SubtitleParseError(
                    "pysubs2 is required for subtitle parsing. "
                    "Please install it: pip install pysubs2"
                ) from e
        return self._pysubs2
    
    def detect_format(self, content: str, filename: Optional[str] = None) -> str:
        """
        Detect subtitle format from content and/or filename.
        
        Args:
            content: Subtitle file content
            filename: Optional filename for extension-based detection
        
        Returns:
            Format string (e.g., "srt", "vtt", "ass")
        """
        # Try extension first
        if filename:
            ext = Path(filename).suffix.lower()
            if ext in self.EXTENSION_MAP:
                return self.EXTENSION_MAP[ext]
        
        # Try content patterns
        for fmt, pattern in self.FORMAT_PATTERNS.items():
            if pattern.search(content):
                return fmt
        
        # Default to SRT if unknown
        return "srt"
    
    def parse_file(
        self,
        path: Union[str, Path],
        encoding: str = "utf-8",
        fps: Optional[float] = None,
    ) -> SubtitleDocument:
        """
        Parse a subtitle file.
        
        Args:
            path: Path to subtitle file
            encoding: File encoding (default: utf-8)
            fps: FPS for frame-based formats (default: use self.default_fps)
        
        Returns:
            SubtitleDocument
        
        Raises:
            SubtitleParseError: If parsing fails
        """
        path = Path(path)
        
        if not path.exists():
            raise SubtitleParseError(f"Subtitle file not found: {path}")

        if path.suffix.lower() == ".lrc":
            return self._parse_lrc_file(path)
        
        pysubs2 = self._get_pysubs2()
        detected_format = self.detect_format("", str(path))
        
        try:
            # Read with auto-detection of encoding
            for enc in [encoding, "utf-8-sig", "utf-16", "latin-1"]:
                try:
                    subs = pysubs2.load(str(path), encoding=enc, fps=fps or self.default_fps)
                    break
                except UnicodeDecodeError:
                    continue
            else:
                raise SubtitleParseError(f"Could not decode subtitle file with any known encoding: {path}")
            
            return self._convert_pysubs2(subs, str(path), detected_format)
            
        except Exception as e:
            if isinstance(e, SubtitleParseError):
                raise
            logger.exception(f"Failed to parse subtitle file: {path}")
            raise SubtitleParseError(f"Failed to parse {path}: {e}") from e

    def _parse_lrc_file(self, path: Path) -> SubtitleDocument:
        try:
            data = path.read_bytes()
        except Exception as e:
            raise SubtitleParseError(f"Failed to read lrc: {e}") from e

        text = ""
        for enc in ["utf-8-sig", "utf-16", "utf-8", "latin-1"]:
            try:
                text = data.decode(enc)
                break
            except Exception:
                continue
        if not text:
            raise SubtitleParseError("Empty lrc content")

        time_re = re.compile(r"\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]")
        items: list[tuple[float, str]] = []
        for line in text.splitlines():
            raw = (line or "").strip()
            if not raw:
                continue
            tags = list(time_re.finditer(raw))
            if not tags:
                continue
            lyric = time_re.sub("", raw).strip()
            lyric = self._clean_text(lyric)
            if not lyric:
                continue
            for m in tags:
                mm = int(m.group(1))
                ss = int(m.group(2))
                frac = m.group(3) or "0"
                if len(frac) == 1:
                    ms = int(frac) * 100
                elif len(frac) == 2:
                    ms = int(frac) * 10
                else:
                    ms = int(frac[:3])
                t = mm * 60.0 + ss + (ms / 1000.0)
                items.append((t, lyric))

        items.sort(key=lambda x: x[0])
        if not items:
            raise SubtitleParseError("No timed lines in lrc")

        segments: list[SubtitleSegment] = []
        for i, (start, lyric) in enumerate(items):
            if i + 1 < len(items):
                end = max(start + 0.4, items[i + 1][0] - 0.02)
            else:
                end = start + 3.0
            segments.append(
                SubtitleSegment(
                    index=len(segments),
                    start_time=float(start),
                    end_time=float(end),
                    text=lyric,
                    style=None,
                )
            )

        return SubtitleDocument(
            segments=segments,
            source_path=str(path),
            source_format="lrc",
            title=None,
        )
    
    def parse_string(
        self,
        content: str,
        format: Optional[str] = None,
        fps: Optional[float] = None,
        source_path: Optional[str] = None,
    ) -> SubtitleDocument:
        """
        Parse subtitle content from string.
        
        Args:
            content: Subtitle content
            format: Format hint (auto-detected if not provided)
            fps: FPS for frame-based formats
            source_path: Optional source path for metadata
        
        Returns:
            SubtitleDocument
        
        Raises:
            SubtitleParseError: If parsing fails
        """
        pysubs2 = self._get_pysubs2()
        
        if not format:
            format = self.detect_format(content, source_path)
        
        try:
            subs = pysubs2.SSAFile.from_string(
                content,
                format_=format,
                fps=fps or self.default_fps,
            )
            return self._convert_pysubs2(subs, source_path, format)
            
        except Exception as e:
            logger.exception(f"Failed to parse subtitle string (format={format})")
            raise SubtitleParseError(f"Failed to parse subtitle: {e}") from e
    
    def _convert_pysubs2(
        self,
        subs,  # pysubs2.SSAFile
        source_path: Optional[str],
        source_format: str,
    ) -> SubtitleDocument:
        """
        Convert pysubs2 SSAFile to SubtitleDocument.
        
        Args:
            subs: pysubs2.SSAFile object
            source_path: Original file path
            source_format: Detected format
        
        Returns:
            SubtitleDocument
        """
        segments = []
        
        for i, event in enumerate(subs.events):
            # Skip comments and other non-dialogue events
            if hasattr(event, "is_comment") and event.is_comment:
                continue
            
            # Convert times from milliseconds to seconds
            start_time = event.start / 1000.0
            end_time = event.end / 1000.0
            
            # Clean up text (remove formatting tags)
            text = self._clean_text(event.plaintext if hasattr(event, "plaintext") else event.text)
            
            if not text.strip():
                continue
            
            # Extract style name if available
            style = getattr(event, "style", None)
            
            segment = SubtitleSegment(
                index=len(segments),
                start_time=start_time,
                end_time=end_time,
                text=text,
                style=style,
            )
            segments.append(segment)
        
        # Extract metadata
        title = None
        if hasattr(subs, "info") and isinstance(subs.info, dict):
            title = subs.info.get("Title")
        
        return SubtitleDocument(
            segments=segments,
            source_path=source_path,
            source_format=source_format,
            title=title,
        )
    
    def _clean_text(self, text: str) -> str:
        """
        Clean subtitle text by removing formatting tags.
        
        Args:
            text: Raw subtitle text
        
        Returns:
            Cleaned text
        """
        # Remove ASS/SSA override tags like {\an8}
        text = re.sub(r"\{\\[^}]*\}", "", text)
        
        # Remove HTML-style tags like <b>, <i>, <font>
        text = re.sub(r"<[^>]+>", "", text)
        
        # Replace \N with newline
        text = text.replace(r"\N", "\n")
        text = text.replace(r"\n", "\n")
        
        # Normalize whitespace
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n+", "\n", text)
        
        return text.strip()


# Convenience functions

def parse_subtitle_file(
    path: Union[str, Path],
    encoding: str = "utf-8",
    fps: Optional[float] = None,
) -> SubtitleDocument:
    """
    Parse a subtitle file.
    
    Convenience function that creates a parser and parses the file.
    
    Args:
        path: Path to subtitle file
        encoding: File encoding
        fps: FPS for frame-based formats
    
    Returns:
        SubtitleDocument
    """
    parser = SubtitleParser()
    return parser.parse_file(path, encoding=encoding, fps=fps)


def parse_subtitle_string(
    content: str,
    format: Optional[str] = None,
    fps: Optional[float] = None,
) -> SubtitleDocument:
    """
    Parse subtitle content from string.
    
    Convenience function that creates a parser and parses the string.
    
    Args:
        content: Subtitle content
        format: Format hint
        fps: FPS for frame-based formats
    
    Returns:
        SubtitleDocument
    """
    parser = SubtitleParser()
    return parser.parse_string(content, format=format, fps=fps)
