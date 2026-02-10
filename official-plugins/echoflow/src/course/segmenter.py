"""
Subtitle segmenter - Parses and optimizes subtitle segments.
"""

import re
import logging
from pathlib import Path
from typing import List

from .models import Segment

logger = logging.getLogger("echoflow.segmenter")


class SubtitleSegmenter:
    """
    Parses subtitle files and applies smart segmentation.
    
    Rules:
    - Merge: Adjacent segments with gap < 300ms and total length < 10s
    - Split: Segments > 10s by punctuation
    """
    
    # Configurable thresholds
    MERGE_GAP_MS = 240
    MAX_SEGMENT_SECONDS = 9
    MIN_SEGMENT_SECONDS = 1.0
    MAX_SENTENCE_CHARS = 120
    TARGET_SENTENCE_WORDS = 12
    MAX_SENTENCE_WORDS = 20

    def __init__(
        self,
        *,
        merge_gap_ms: int | None = None,
        max_segment_seconds: float | None = None,
        min_segment_seconds: float | None = None,
        max_sentence_chars: int | None = None,
        target_sentence_words: int | None = None,
        max_sentence_words: int | None = None,
    ):
        if merge_gap_ms is not None:
            self.MERGE_GAP_MS = int(merge_gap_ms)
        if max_segment_seconds is not None:
            self.MAX_SEGMENT_SECONDS = float(max_segment_seconds)
        if min_segment_seconds is not None:
            self.MIN_SEGMENT_SECONDS = float(min_segment_seconds)
        if max_sentence_chars is not None:
            self.MAX_SENTENCE_CHARS = int(max_sentence_chars)
        if target_sentence_words is not None:
            self.TARGET_SENTENCE_WORDS = int(target_sentence_words)
        if max_sentence_words is not None:
            self.MAX_SENTENCE_WORDS = int(max_sentence_words)

    @classmethod
    def from_difficulty(cls, difficulty: str | None) -> "SubtitleSegmenter":
        d = (difficulty or "medium").strip().lower()
        if d in {"easy", "simple", "low"}:
            return cls(
                merge_gap_ms=120,
                max_segment_seconds=4,
                min_segment_seconds=1.0,
                max_sentence_chars=70,
                target_sentence_words=6,
                max_sentence_words=10,
            )
        if d in {"hard", "difficult", "high"}:
            return cls(
                merge_gap_ms=420,
                max_segment_seconds=14.0,
                min_segment_seconds=1.0,
                max_sentence_chars=240,
                target_sentence_words=26,
                max_sentence_words=40,
            )
        return cls(
            merge_gap_ms=cls.MERGE_GAP_MS,
            max_segment_seconds=cls.MAX_SEGMENT_SECONDS,
            min_segment_seconds=cls.MIN_SEGMENT_SECONDS,
            max_sentence_chars=cls.MAX_SENTENCE_CHARS,
            target_sentence_words=cls.TARGET_SENTENCE_WORDS,
            max_sentence_words=cls.MAX_SENTENCE_WORDS,
        )
    
    def parse_subtitle(self, subtitle_path: str) -> List[Segment]:
        """
        Parse a subtitle file (SRT or VTT).
        
        Args:
            subtitle_path: Path to subtitle file
            
        Returns:
            List of Segment objects
        """
        path = Path(subtitle_path)
        
        if not path.exists():
            logger.error(f"Subtitle file not found: {subtitle_path}")
            return []
        
        suffix = path.suffix.lower()
        
        if suffix == ".srt":
            return self._parse_srt(path)
        elif suffix == ".vtt":
            return self._parse_vtt(path)
        elif suffix in {".ass", ".ssa", ".sub"}:
            return self._parse_pysubs2(path)
        elif suffix == ".lrc":
            return self._parse_lrc(path)
        else:
            logger.error(f"Unsupported subtitle format: {suffix}")
            return []

    def _parse_pysubs2(self, path: Path) -> List[Segment]:
        try:
            import pysubs2

            subs = None
            for enc in ["utf-8-sig", "utf-16", "utf-8", "latin-1"]:
                try:
                    subs = pysubs2.load(str(path), encoding=enc)
                    break
                except UnicodeDecodeError:
                    continue
            if subs is None:
                return []

            segments: List[Segment] = []
            for i, e in enumerate(getattr(subs, "events", []) or []):
                if getattr(e, "is_comment", False):
                    continue
                start_time = float(getattr(e, "start", 0)) / 1000.0
                end_time = float(getattr(e, "end", 0)) / 1000.0
                raw_text = getattr(e, "plaintext", None)
                if raw_text is None:
                    raw_text = getattr(e, "text", "")
                text = self._clean_text(str(raw_text or ""))
                if not text:
                    continue
                segments.append(
                    Segment(
                        id=i,
                        start_time=start_time,
                        end_time=end_time,
                        text=text,
                    )
                )
            return segments
        except Exception as e:
            logger.error(f"Failed to parse subtitle via pysubs2: {e}")
            return []

    def _parse_lrc(self, path: Path) -> List[Segment]:
        try:
            data = path.read_bytes()
        except Exception as e:
            logger.error(f"Failed to read LRC: {e}")
            return []

        text = ""
        for enc in ["utf-8-sig", "utf-16", "utf-8", "latin-1"]:
            try:
                text = data.decode(enc)
                break
            except Exception:
                continue
        if not text:
            return []

        time_re = re.compile(r"\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]")
        points: list[tuple[float, str]] = []
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
                points.append((t, lyric))

        points.sort(key=lambda x: x[0])
        if not points:
            return []

        segments: List[Segment] = []
        for i, (start, lyric) in enumerate(points):
            if i + 1 < len(points):
                end = max(start + 0.4, points[i + 1][0] - 0.02)
            else:
                end = start + 3.0
            segments.append(Segment(id=i, start_time=float(start), end_time=float(end), text=lyric))
        return segments
    
    def _parse_srt(self, path: Path) -> List[Segment]:
        """Parse SRT subtitle file."""
        try:
            import pysrt
            
            subs = pysrt.open(str(path))
            segments = []
            
            for i, sub in enumerate(subs):
                start_time = (
                    sub.start.hours * 3600 +
                    sub.start.minutes * 60 +
                    sub.start.seconds +
                    sub.start.milliseconds / 1000
                )
                end_time = (
                    sub.end.hours * 3600 +
                    sub.end.minutes * 60 +
                    sub.end.seconds +
                    sub.end.milliseconds / 1000
                )
                
                text = self._clean_text(sub.text)
                if text:
                    segments.append(Segment(
                        id=i,
                        start_time=start_time,
                        end_time=end_time,
                        text=text,
                    ))
            
            return segments
            
        except Exception as e:
            logger.error(f"Failed to parse SRT: {e}")
            return []
    
    def _parse_vtt(self, path: Path) -> List[Segment]:
        """Parse VTT subtitle file."""
        try:
            import webvtt
            
            vtt = webvtt.read(str(path))
            segments = []
            
            for i, caption in enumerate(vtt):
                start_time = self._parse_vtt_time(caption.start)
                end_time = self._parse_vtt_time(caption.end)
                
                text = self._clean_text(caption.text)
                if text:
                    segments.append(Segment(
                        id=i,
                        start_time=start_time,
                        end_time=end_time,
                        text=text,
                    ))
            
            return segments
            
        except Exception as e:
            logger.error(f"Failed to parse VTT: {e}")
            return []
    
    def _parse_vtt_time(self, time_str: str) -> float:
        """Parse VTT time string to seconds."""
        parts = time_str.split(":")
        if len(parts) == 3:
            hours, minutes, seconds = parts
            hours = int(hours)
        else:
            hours = 0
            minutes, seconds = parts
        
        minutes = int(minutes)
        seconds = float(seconds)
        
        return hours * 3600 + minutes * 60 + seconds
    
    def _clean_text(self, text: str) -> str:
        """Clean subtitle text."""
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        # Remove speaker labels like [Speaker 1] or (music)
        text = re.sub(r'\[[^\]]*\]', '', text)
        text = re.sub(r'\([^)]*\)', '', text)
        # Normalize whitespace
        text = ' '.join(text.split())
        return text.strip()
    
    def smart_split(self, segments: List[Segment]) -> List[Segment]:
        """
        Apply smart segmentation rules.
        
        1. Merge short adjacent segments
        2. Split long segments by punctuation
        """
        if not segments:
            return []
        
        merged = self._merge_segments(segments)
        split = self._split_segments(merged)
        
        # Re-index
        for i, segment in enumerate(split):
            segment.id = i
        
        return split
    
    def _merge_segments(self, segments: List[Segment]) -> List[Segment]:
        """Merge adjacent short segments."""
        if not segments:
            return []
        
        result = [segments[0]]
        
        for segment in segments[1:]:
            last = result[-1]
            gap = segment.start_time - last.end_time
            combined_duration = segment.end_time - last.start_time
            
            if (
                gap < self.MERGE_GAP_MS / 1000
                and combined_duration < self.MAX_SEGMENT_SECONDS
                and self._should_merge_text(last.text, segment.text)
            ):
                # Merge into last segment
                last.end_time = segment.end_time
                last.text = self._join_text(last.text, segment.text)
            else:
                result.append(segment)
        
        return result
    
    def _split_segments(self, segments: List[Segment]) -> List[Segment]:
        """Split segments by sentence boundaries and length."""
        result = []
        
        for segment in segments:
            text = (segment.text or "").strip()
            if not text:
                continue

            duration = segment.end_time - segment.start_time

            sentences = self._split_into_sentences(text)
            parts: List[str] = []
            for s in sentences:
                parts.extend(self._split_sentence_if_needed(s))

            if len(parts) <= 1:
                result.append(segment)
                continue

            total_chars = max(1, sum(len(p) for p in parts))
            current_time = segment.start_time
            for part in parts:
                part = part.strip()
                if not part:
                    continue
                part_duration = (len(part) / total_chars) * duration
                new_segment = Segment(
                    id=0,
                    start_time=current_time,
                    end_time=current_time + part_duration,
                    text=part,
                )
                result.append(new_segment)
                current_time += part_duration
        
        return result
    
    def _should_merge_text(self, left: str, right: str) -> bool:
        left = (left or "").strip()
        right = (right or "").strip()
        if not left or not right:
            return True

        if self._ends_with_terminal_punct(left):
            return False

        left_words = len(left.split())
        if left_words >= self.MAX_SENTENCE_WORDS:
            return False

        if self._looks_like_new_sentence(right) and self._ends_with_soft_boundary(left):
            return False

        return True

    def _ends_with_terminal_punct(self, text: str) -> bool:
        t = (text or "").rstrip()
        t = re.sub(r'[\s"”’)\]]+$', '', t)
        return bool(t) and t[-1] in {".", "?", "!", "…", "。", "？", "！"}

    def _ends_with_soft_boundary(self, text: str) -> bool:
        t = (text or "").rstrip()
        t = re.sub(r'[\s"”’)\]]+$', '', t)
        return bool(t) and t[-1] in {",", ";", ":"}

    def _looks_like_new_sentence(self, text: str) -> bool:
        t = (text or "").lstrip()
        if not t:
            return False
        if t[0].isupper():
            return True
        if t[0] in {'"', "“", "‘"}:
            t2 = t[1:].lstrip()
            return bool(t2) and t2[0].isupper()
        return False

    def _join_text(self, left: str, right: str) -> str:
        a = (left or "").rstrip()
        b = (right or "").lstrip()
        if not a:
            return b
        if not b:
            return a

        if a.endswith(("-", "–", "—")):
            return a + b

        if re.match(r'^[,.:;!?)}\]]', b):
            return a + b

        if re.search(r'[\[(“"‘]$', a):
            return a + b

        if a[-1].isalnum() and b[0].isalnum():
            return f"{a} {b}"

        return f"{a} {b}"

    def _split_into_sentences(self, text: str) -> List[str]:
        t = " ".join((text or "").split())
        if not t:
            return []
        parts = re.split(r'(?<=[.!?…])\s+(?=(?:["“‘])?[A-Z])', t)
        parts = [p.strip() for p in parts if p.strip()]
        if len(parts) > 1:
            return parts
        parts = re.split(r'(?<=[.!?…])\s+', t)
        return [p.strip() for p in parts if p.strip()]

    def _split_sentence_if_needed(self, sentence: str) -> List[str]:
        s = " ".join((sentence or "").split()).strip()
        if not s:
            return []

        words = s.split()
        if len(words) <= self.MAX_SENTENCE_WORDS and len(s) <= self.MAX_SENTENCE_CHARS:
            return [s]

        soft_parts = re.split(r'(?<=[,;:])\s+', s)
        soft_parts = [p.strip() for p in soft_parts if p.strip()]
        if len(soft_parts) > 1:
            return [p for p in soft_parts if p]

        target = min(self.TARGET_SENTENCE_WORDS, max(8, len(words) // 2))
        cut = min(max(target, 8), len(words) - 1)
        left = " ".join(words[:cut]).strip()
        right = " ".join(words[cut:]).strip()
        if not left or not right:
            return [s]
        return [left, right]
