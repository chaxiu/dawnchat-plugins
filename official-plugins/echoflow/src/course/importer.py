"""
Course importer - Downloads videos and extracts subtitles.
"""

import logging
from pathlib import Path
from typing import Dict, Any, Optional
import asyncio
import re
import shutil

from dawnchat_sdk import host

from .models import Course, SegmentStatus
from .segmenter import SubtitleSegmenter

logger = logging.getLogger("echoflow.importer")


_SUBTITLE_EXTS: tuple[str, ...] = (".srt", ".vtt", ".ass", ".ssa", ".lrc", ".sub")
_MEDIA_EXTS: tuple[str, ...] = (
    ".mp4",
    ".mkv",
    ".mov",
    ".avi",
    ".webm",
    ".mp3",
    ".m4a",
    ".aac",
    ".wav",
    ".flac",
    ".ogg",
    ".opus",
)

_RE_EP_SXXEXX = re.compile(r"\bS(\d{1,2})[ ._\-]*E(\d{1,2})\b", re.IGNORECASE)
_RE_EP_XXxYY = re.compile(r"\b(\d{1,2})x(\d{1,2})\b", re.IGNORECASE)
_RE_BRACKETS = re.compile(r"[\[\(\{].*?[\]\)\}]", re.IGNORECASE)
_RE_NON_ALNUM = re.compile(r"[^a-z0-9]+", re.IGNORECASE)

_NAME_STOPWORDS: set[str] = {
    "1080p",
    "720p",
    "2160p",
    "4k",
    "bluray",
    "bdrip",
    "brrip",
    "webrip",
    "webdl",
    "web-dl",
    "hdtv",
    "hdrip",
    "dvdrip",
    "x264",
    "x265",
    "h264",
    "h265",
    "hevc",
    "aac",
    "ac3",
    "dts",
    "yts",
    "proper",
    "repack",
    "remux",
    "limited",
    "extended",
    "unrated",
    "internals",
    "multi",
    "dual",
    "audio",
    "subs",
    "sub",
    "subtitle",
    "subtitles",
    "eng",
    "en",
    "english",
    "chs",
    "chi",
    "zh",
    "cn",
    "chinese",
    "简",
    "繁",
}


def _extract_episode_tag(name: str) -> Optional[str]:
    m = _RE_EP_SXXEXX.search(name or "")
    if m:
        s = int(m.group(1))
        e = int(m.group(2))
        return f"s{s:02d}e{e:02d}"
    m = _RE_EP_XXxYY.search(name or "")
    if m:
        s = int(m.group(1))
        e = int(m.group(2))
        return f"s{s:02d}e{e:02d}"
    return None


def _tokenize_for_match(name: str) -> set[str]:
    s = (name or "").strip().lower()
    if not s:
        return set()
    s = _RE_BRACKETS.sub(" ", s)
    s = s.replace("&", " ")
    s = _RE_NON_ALNUM.sub(" ", s)
    raw = [t for t in s.split() if t]
    tokens: set[str] = set()
    for t in raw:
        if t in _NAME_STOPWORDS:
            continue
        if len(t) <= 1:
            continue
        if t.isdigit() and len(t) <= 2:
            continue
        tokens.add(t)
    return tokens


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a and not b:
        return 1.0
    if not a or not b:
        return 0.0
    inter = len(a & b)
    union = len(a | b)
    return float(inter) / float(union) if union else 0.0


def _looks_english_heavy(text: str) -> bool:
    if not text:
        return False
    candidates = re.findall(r"[A-Za-z]{2,}", text)
    if len(candidates) < 5:
        return False
    letters = sum(len(w) for w in candidates)
    return letters >= 30


def _subtitle_file_has_english(path: Path) -> bool:
    try:
        data = path.read_bytes()
    except Exception:
        return False

    sample = data[:200_000]
    for enc in ("utf-8-sig", "utf-16", "utf-8", "latin-1"):
        try:
            text = sample.decode(enc, errors="ignore")
            break
        except Exception:
            continue
    else:
        return False

    cleaned = []
    for line in text.splitlines():
        s = (line or "").strip()
        if not s:
            continue
        if "-->" in s:
            continue
        if s.isdigit():
            continue
        if s.startswith(("WEBVTT", "[Script Info]", "Style:", "Format:", "Dialogue:", "Comment:")):
            continue
        s = re.sub(r"<[^>]+>", " ", s)
        s = re.sub(r"\{[^}]+\}", " ", s)
        s = re.sub(r"\[[0-9:.]+\]", " ", s)
        cleaned.append(s)

    return _looks_english_heavy(" ".join(cleaned))


def _score_subtitle_candidate(media_name: str, subtitle_name: str) -> float:
    media_ep = _extract_episode_tag(media_name)
    sub_ep = _extract_episode_tag(subtitle_name)

    score = 0.0
    if media_ep and sub_ep and media_ep == sub_ep:
        score += 60.0

    media_tokens = _tokenize_for_match(media_name)
    sub_tokens = _tokenize_for_match(subtitle_name)
    score += _jaccard(media_tokens, sub_tokens) * 40.0

    sub_lower = (subtitle_name or "").lower()
    if any(k in sub_lower for k in ("eng", "english", "en")):
        score += 6.0

    if any(k in sub_lower for k in ("chs&eng", "chseng", "chi&eng", "bilingual", "dual")):
        score += 4.0

    return score


def _find_best_subtitle_for_media(media_path: Path) -> Optional[Path]:
    if not media_path.exists():
        return None
    parent = media_path.parent
    candidates = [p for p in parent.iterdir() if p.is_file() and p.suffix.lower() in _SUBTITLE_EXTS]
    if not candidates:
        return None
    if len(candidates) == 1:
        return candidates[0]

    media_files = [p for p in parent.iterdir() if p.is_file() and p.suffix.lower() in _MEDIA_EXTS]
    if len(media_files) == 1:
        english_candidates = [p for p in candidates if _subtitle_file_has_english(p)]
        if len(english_candidates) == 1:
            return english_candidates[0]

    media_name = media_path.name
    scored: list[tuple[float, Path]] = []
    for c in candidates:
        base_score = _score_subtitle_candidate(media_name, c.name)
        if _subtitle_file_has_english(c):
            base_score += 12.0
        scored.append((base_score, c))
    scored.sort(key=lambda x: x[0], reverse=True)
    return scored[0][1]


def _cover_timestamps(duration_s: Optional[float]) -> list[float]:
    try:
        d = float(duration_s) if duration_s is not None else 0.0
    except Exception:
        d = 0.0
    if d <= 0:
        return [0.1, 0.0]
    t1 = max(0.1, min(1.0, d * 0.1))
    t2 = max(0.1, min(max(d - 0.1, 0.1), d * 0.3))
    t3 = max(0.0, max(d - 0.1, 0.0))
    out: list[float] = []
    for t in (t1, t2, t3, 0.1, 0.0):
        tt = float(t)
        if tt < 0:
            continue
        if any(abs(tt - x) < 1e-3 for x in out):
            continue
        out.append(tt)
    return out[:3]


async def ensure_video_cover_image(
    *,
    video_path: str,
    output_path: str,
    duration_s: Optional[float] = None,
) -> Optional[str]:
    vp = Path(str(video_path or "").strip())
    out = Path(str(output_path or "").strip())
    if not vp.exists() or not vp.is_file():
        return None
    if out.exists() and out.is_file() and out.stat().st_size > 0:
        return str(out)
    out.parent.mkdir(parents=True, exist_ok=True)

    resolved_duration = duration_s
    if resolved_duration is None:
        try:
            info = await host.tools.call("dawnchat.media.get_info", arguments={"media_path": str(vp)})
            if isinstance(info, dict) and int(info.get("code") or 0) == 200:
                resolved_duration = (info.get("data") or {}).get("duration")
        except Exception:
            resolved_duration = None

    for ts in _cover_timestamps(resolved_duration):
        try:
            res = await host.tools.call(
                "dawnchat.media.extract_frame_at",
                arguments={
                    "video_path": str(vp),
                    "output_path": str(out),
                    "timestamp": float(ts),
                    "quality": 2,
                },
            )
            if isinstance(res, dict) and int(res.get("code") or 0) == 200:
                if out.exists() and out.is_file() and out.stat().st_size > 0:
                    return str(out)
        except Exception:
            continue
    return None


class CourseImporter:
    """
    Imports courses from YouTube/Bilibili URLs.
    
    Only supports videos with English subtitles.
    """
    
    def __init__(self):
        self._download_dir = Path.home() / ".dawnchat" / "plugins" / "echoflow" / "downloads"
        self._download_dir.mkdir(parents=True, exist_ok=True)
        self._local_import_dir = Path.home() / ".dawnchat" / "plugins" / "echoflow" / "local_imports"
        self._local_import_dir.mkdir(parents=True, exist_ok=True)
    
    async def import_from_url(
        self,
        url: str,
        *,
        download_video: bool = True,
        difficulty: str = "medium",
        reuse_course: Optional[Course] = None,
    ) -> Dict[str, Any]:
        """
        Import a course from a video URL.
        
        Args:
            url: YouTube or Bilibili video URL
            
        Returns:
            {"course": Course} on success
            {"error": True, "message": str} on failure
        """
        try:
            existing_audio_path = None
            existing_subtitle_path = None
            existing_video_path = None
            existing_cover_path = None
            existing_title = None

            def _existing(p: Optional[str]) -> Optional[str]:
                if not p:
                    return None
                try:
                    path = Path(p)
                    if path.exists() and path.is_file():
                        return str(path)
                except Exception:
                    return None
                return None

            if reuse_course is not None:
                existing_audio_path = _existing(getattr(reuse_course, "audio_path", None))
                existing_subtitle_path = _existing(getattr(reuse_course, "subtitle_path", None))
                existing_video_path = _existing(getattr(reuse_course, "video_path", None))
                existing_cover_path = _existing(getattr(reuse_course, "cover_path", None))
                existing_title = (getattr(reuse_course, "title", None) or None)

            # Step 0: Check for cookies (important for Bilibili)
            cookies_path = None
            cookie_info = await host.browser.get_cookie_info()
            if cookie_info.get("code") == 200 and cookie_info.get("data", {}).get("exists"):
                cookies_path = cookie_info["data"]["path"]
                logger.info(f"Using cookies from: {cookies_path}")
            
            title = existing_title or "Untitled"
            if not existing_subtitle_path:
                logger.info(f"Fetching video info: {url}")

                info_result = await host.tools.call(
                    "dawnchat.media.get_video_info",
                    arguments={"url": url, "cookies_path": cookies_path},
                )

                if info_result.get("code") != 200:
                    return {
                        "error": True,
                        "message": info_result.get("message", "Failed to get video info"),
                    }

                video_info = info_result.get("data", {})
                title = video_info.get("title", title)
                subtitles = video_info.get("subtitles", {})

                has_english = self._check_english_subtitle(subtitles)
                if not has_english:
                    is_bilibili = "bilibili.com" in url

                    logger.warning(f"No English subtitle found for: {title}")

                    msg = "No English subtitle available for this video"
                    if is_bilibili and not cookies_path:
                        msg += ". Please login to Bilibili first (click 'Bilibili Login' in import dialog)."
                    elif is_bilibili:
                        msg += ". Even with cookies, no English subtitle was found."

                    return {
                        "error": True,
                        "message": msg,
                    }
            
            audio_path = existing_audio_path
            subtitle_path = existing_subtitle_path
            cover_path = existing_cover_path
            video_path = existing_video_path if download_video else None

            need_audio = not audio_path
            need_subtitle = not subtitle_path
            need_cover = not cover_path
            need_video = bool(download_video) and not video_path

            if need_audio or need_subtitle or need_cover or need_video:
                logger.info(f"Downloading resources for: {title}")

                download_args: Dict[str, Any] = {
                    "url": url,
                    "output_dir": str(self._download_dir),
                    "subtitle_langs": ["en", "en-US", "en-GB", "en-orig"],
                    "cookies_path": cookies_path,
                    "download_subtitles": bool(need_subtitle),
                    "download_thumbnail": bool(need_cover),
                }

                if need_audio:
                    download_args.update(
                        {
                            "audio_only": True,
                            "download_video": bool(need_video),
                        }
                    )
                elif need_video:
                    download_args.update(
                        {
                            "audio_only": False,
                        }
                    )
                else:
                    download_args.update(
                        {
                            "audio_only": True,
                            "skip_download": True,
                            "download_video": False,
                        }
                    )

                download_result = await host.tools.call(
                    "dawnchat.media.download",
                    arguments=download_args,
                )

                if download_result.get("code") != 200:
                    return {
                        "error": True,
                        "message": download_result.get("message", "Failed to download video"),
                    }

                download_data = download_result.get("data", {}) or {}
                if need_audio:
                    audio_path = audio_path or download_data.get("output_path")
                if need_video:
                    video_path = video_path or download_data.get("video_path") or download_data.get("output_path")
                subtitle_path = subtitle_path or download_data.get("subtitle_path")
                cover_path = cover_path or download_data.get("thumbnail_path")

            if not audio_path:
                return {"error": True, "message": "Failed to resolve audio path"}
            
            # Step 3: Parse subtitle and create segments
            segmenter = SubtitleSegmenter.from_difficulty(difficulty)

            if subtitle_path and Path(subtitle_path).exists():
                segments = segmenter.parse_subtitle(subtitle_path)
            else:
                # Try to find subtitle file in download directory
                subtitle_path = self._find_subtitle_file(audio_path)
                if subtitle_path:
                    segments = segmenter.parse_subtitle(subtitle_path)
                else:
                    return {
                        "error": True,
                        "message": "No English subtitle file found"
                    }
            
            if not segments:
                return {
                    "error": True,
                    "message": "Failed to parse subtitle"
                }
            
            # Step 4: Apply smart segmentation
            segments = segmenter.smart_split(segments)
            
            # Step 5: Create course
            course = Course(
                title=title,
                audio_path=audio_path,
                subtitle_path=subtitle_path,
                video_path=video_path,
                cover_path=cover_path,
                source_url=url,
                segments=segments,
            )
            
            # Mark first segment as current
            if course.segments:
                course.segments[0].status = SegmentStatus.CURRENT
            
            logger.info(f"Course created: {title} with {len(segments)} segments")
            
            return {"course": course}
            
        except Exception as e:
            logger.error(f"Import failed: {e}", exc_info=True)
            return {
                "error": True,
                "message": str(e)
            }
    
    def _check_english_subtitle(self, subtitles: Dict) -> bool:
        """Check if English subtitle is available."""
        if not subtitles:
            logger.warning("No subtitles found")
            return False
        
        # Check for various English subtitle keys
        english_keys = ["en", "en-US", "en-GB", "English", "english"]
        for key in english_keys:
            if key in subtitles:
                return True
        
        # Check if any subtitle contains "en" or "english"
        for key in subtitles.keys():
            logger.warning(f"Checking subtitle key: {key}")
            if "en" in key.lower() or "english" in key.lower():
                return True
        
        return False
    
    def _find_subtitle_file(self, audio_path: str) -> Optional[str]:
        """Find best subtitle file near audio/media file."""
        p = Path(audio_path)
        best = _find_best_subtitle_for_media(p)
        return str(best) if best else None

    async def import_from_local(
        self,
        media_path: str,
        *,
        subtitle_path: Optional[str] = None,
        difficulty: str = "medium",
        course_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        try:
            src = Path(str(media_path or "").strip())
            if not src.exists() or not src.is_file():
                return {"error": True, "message": "Local media file not found"}

            if src.suffix.lower() not in _MEDIA_EXTS:
                return {"error": True, "message": "Unsupported media format"}

            if course_id:
                cid = str(course_id)
            else:
                import uuid

                cid = str(uuid.uuid4())

            out_dir = self._local_import_dir / cid
            out_dir.mkdir(parents=True, exist_ok=True)

            resolved_subtitle: Optional[Path] = None
            if subtitle_path:
                sp = Path(str(subtitle_path).strip())
                if sp.exists() and sp.is_file():
                    resolved_subtitle = sp

            if resolved_subtitle is None:
                resolved_subtitle = _find_best_subtitle_for_media(src)

            if resolved_subtitle is None or not resolved_subtitle.exists():
                return {"error": True, "message": "No subtitle or lrc file found"}

            if not _subtitle_file_has_english(resolved_subtitle):
                return {"error": True, "message": "No English subtitle file found"}

            copied_subtitle_path = out_dir / f"subtitle{resolved_subtitle.suffix.lower()}"
            await asyncio.to_thread(shutil.copy2, str(resolved_subtitle), str(copied_subtitle_path))

            std = await host.tools.call(
                "dawnchat.media.ensure_standard",
                arguments={"media_path": str(src), "output_dir": str(out_dir)},
            )
            if not isinstance(std, dict) or int(std.get("code") or 0) != 200:
                return {"error": True, "message": str((std or {}).get("message") or "Failed to transcode media")}
            data = std.get("data") or {}
            audio_path = str(data.get("audio_path") or "").strip()
            video_path = str(data.get("video_path") or "").strip() or None
            cover_path: Optional[str] = None

            if not audio_path or not Path(audio_path).exists():
                return {"error": True, "message": "Failed to resolve audio path"}

            segmenter = SubtitleSegmenter.from_difficulty(difficulty)
            segments = segmenter.parse_subtitle(str(copied_subtitle_path))
            if not segments:
                return {"error": True, "message": "Failed to parse subtitle"}
            segments = segmenter.smart_split(segments)

            title = src.stem
            if video_path:
                try:
                    video_p = Path(str(video_path))
                except Exception:
                    video_p = None
                if video_p is not None and video_p.exists() and video_p.is_file():
                    try:
                        duration = (data.get("media_info") or {}).get("duration")
                    except Exception:
                        duration = None
                    cover_out = video_p.parent / "cover.jpg"
                    cover_path = await ensure_video_cover_image(
                        video_path=str(video_p),
                        output_path=str(cover_out),
                        duration_s=duration,
                    )
            course = Course(
                id=cid,
                title=title,
                audio_path=audio_path,
                subtitle_path=str(copied_subtitle_path),
                video_path=video_path,
                cover_path=cover_path,
                source_url=None,
                segments=segments,
            )
            if course.segments:
                course.segments[0].status = SegmentStatus.CURRENT
            return {"course": course}
        except Exception as e:
            logger.error(f"Local import failed: {e}", exc_info=True)
            return {"error": True, "message": str(e)}
