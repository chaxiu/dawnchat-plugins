from __future__ import annotations

import re
from dataclasses import dataclass
from difflib import SequenceMatcher
from typing import Any, Optional, Sequence

from ..capabilities import AsrProvider, HostWhisperAsrProvider
from ..models import (
    AudioAsset,
    DiffEdit,
    EditType,
    ExplainableReport,
    Explanation,
    IRBundle,
    RegionKind,
    Scores,
    Severity,
    TimeSpan,
    TimelineLayers,
    TimelineRegion,
    UncertaintyFlags,
    WordAlignment,
)
from ..versions import IR_VERSION, SCHEMA_VERSION


_WORD_RE = re.compile(r"[a-z0-9]+(?:'[a-z0-9]+)?", re.IGNORECASE)
_STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "but",
    "by",
    "for",
    "from",
    "get",
    "got",
    "had",
    "has",
    "have",
    "he",
    "her",
    "here",
    "hers",
    "him",
    "his",
    "how",
    "i",
    "if",
    "in",
    "is",
    "it",
    "its",
    "me",
    "my",
    "of",
    "on",
    "or",
    "our",
    "ours",
    "she",
    "so",
    "than",
    "that",
    "the",
    "their",
    "them",
    "there",
    "these",
    "they",
    "this",
    "to",
    "too",
    "us",
    "was",
    "we",
    "were",
    "what",
    "when",
    "where",
    "which",
    "who",
    "why",
    "with",
    "you",
    "your",
    "yours",
}

_MORPH_SUFFIXES: tuple[str, ...] = ("'s", "ing", "ed", "es", "s")
_MORPH_SUFFIX_COST: float = 0.25
_MORPH_SUFFIX_SUB_COST: float = 0.35


def _annotate_morph_suffix_edits(edits: Sequence[DiffEdit]) -> None:
    for e in edits:
        if e.type != EditType.SUBSTITUTION:
            continue
        t = (e.target_word or "").strip().lower()
        h = (e.hyp_word or "").strip().lower()
        if not t or not h:
            continue

        for suf in _MORPH_SUFFIXES:
            if t == f"{h}{suf}" and len(h) >= 3:
                e.meta.update(
                    {
                        "minor": True,
                        "minor_kind": "suffix",
                        "stem": h,
                        "suffix": suf,
                        "suffix_status": "missing",
                        "subtokens": [
                            {"text": h, "status": "match"},
                            {"text": suf, "status": "missing_suffix"},
                        ],
                    }
                )
                break
            if h == f"{t}{suf}" and len(t) >= 3:
                e.meta.update(
                    {
                        "minor": True,
                        "minor_kind": "suffix",
                        "stem": t,
                        "suffix": suf,
                        "suffix_status": "insertion",
                        "subtokens": [
                            {"text": t, "status": "match"},
                            {"text": suf, "status": "insertion_suffix"},
                        ],
                    }
                )
                break
        else:
            annotated = False
            for suf_t in _MORPH_SUFFIXES:
                if not t.endswith(suf_t):
                    continue
                stem = t[: -len(suf_t)]
                if len(stem) < 3:
                    continue
                for suf_h in _MORPH_SUFFIXES:
                    if suf_h == suf_t:
                        continue
                    if h == f"{stem}{suf_h}":
                        e.meta.update(
                            {
                                "minor": True,
                                "minor_kind": "suffix",
                                "stem": stem,
                                "target_suffix": suf_t,
                                "hyp_suffix": suf_h,
                                "suffix_status": "substitution",
                                "subtokens": [
                                    {"text": stem, "status": "match"},
                                    {"text": suf_t, "status": "missing_suffix"},
                                    {"text": suf_h, "status": "insertion_suffix"},
                                ],
                            }
                        )
                        annotated = True
                        break
                if annotated:
                    break
            if not annotated:
                continue



def _tokenize_words(text: str) -> list[str]:
    if not text:
        return []
    return [m.group(0).lower() for m in _WORD_RE.finditer(text)]


def _asr_words(asr) -> list[tuple[str, Optional[float], Optional[float], Optional[float]]]:
    out: list[tuple[str, Optional[float], Optional[float], Optional[float]]] = []
    for seg in asr.segments or []:
        for w in seg.words or []:
            word = (w.word or "").strip()
            if not word:
                continue
            out.append((word, w.start_s, w.end_s, w.probability))
    return out


def _unique_in_order(words: Sequence[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for w in words:
        ww = (w or "").strip().lower()
        if not ww or ww in seen:
            continue
        seen.add(ww)
        out.append(ww)
    return out


def _build_hotwords(target_text: str, context: Optional[dict[str, Any]]) -> Optional[str]:
    title = ""
    if context and context.get("course_title") is not None:
        title = str(context.get("course_title") or "").strip()
    title_words = _tokenize_words(title) if title else []
    target_words = _tokenize_words(target_text)

    candidates: list[str] = []
    for w in title_words + target_words:
        if not w or w in _STOPWORDS:
            continue
        if len(w) < 4:
            continue
        candidates.append(w)

    unique = _unique_in_order(candidates)
    if not unique:
        return None
    return " ".join(unique[:12])


def _build_initial_prompt(context: Optional[dict[str, Any]]) -> Optional[str]:
    if not context:
        return None
    title = context.get("course_title")
    if title is None:
        return None
    s = str(title).strip()
    if not s:
        return None
    if len(s) > 120:
        s = s[:120]
    return f"English shadowing exercise. Topic: {s}."


def _avg_logprob(asr) -> Optional[float]:
    vals = [seg.avg_logprob for seg in (asr.segments or []) if seg.avg_logprob is not None]
    if not vals:
        return None
    return sum(float(x) for x in vals) / float(len(vals))


def _max_no_speech_prob(asr) -> Optional[float]:
    vals = [seg.no_speech_prob for seg in (asr.segments or []) if seg.no_speech_prob is not None]
    if not vals:
        return None
    return max(float(x) for x in vals)


def _safe_timespan(start_s: Optional[float], end_s: Optional[float]) -> Optional[TimeSpan]:
    if start_s is None or end_s is None:
        return None
    try:
        s = float(start_s)
        e = float(end_s)
    except Exception:
        return None
    if s < 0 or e < 0:
        return None
    if e < s:
        s, e = e, s
    return TimeSpan(start_s=s, end_s=e)


def _span_between(
    prev_end: Optional[float],
    next_start: Optional[float],
    duration_s: Optional[float],
    default_s: float = 0.12,
) -> Optional[TimeSpan]:
    if prev_end is None and next_start is None:
        return None
    if prev_end is None and next_start is not None:
        end_s = float(next_start)
        start_s = max(0.0, end_s - default_s)
        return TimeSpan(start_s=start_s, end_s=end_s)
    if prev_end is not None and next_start is None:
        start_s = float(prev_end)
        end_s = start_s + default_s
        if duration_s is not None:
            end_s = min(end_s, float(duration_s))
        return TimeSpan(start_s=max(0.0, start_s), end_s=max(0.0, end_s))
    start_s = float(prev_end)
    end_s = float(next_start)
    if end_s <= start_s:
        end_s = start_s + default_s
        if duration_s is not None:
            end_s = min(end_s, float(duration_s))
    return TimeSpan(start_s=max(0.0, start_s), end_s=max(0.0, end_s))


@dataclass(frozen=True)
class _WordRef:
    word: str
    idx: int
    start_s: Optional[float]
    end_s: Optional[float]


@dataclass(frozen=True)
class _Attempt:
    name: str
    params: dict[str, Any]
    asr: Any
    hyp_refs: list[_WordRef]
    alignments: list[WordAlignment]
    edits: list[DiffEdit]
    content: int
    flags: UncertaintyFlags


def _attempt_debug(attempt: _Attempt) -> dict[str, Any]:
    return {
        "name": attempt.name,
        "content": attempt.content,
        "avg_logprob": _avg_logprob(attempt.asr),
        "max_no_speech_prob": _max_no_speech_prob(attempt.asr),
        "low_confidence": attempt.flags.low_confidence,
        "high_no_speech_prob": attempt.flags.high_no_speech_prob,
        "params": attempt.params,
    }


def _choose_best_attempt(attempts: Sequence[_Attempt]) -> tuple[_Attempt, dict[str, Any]]:
    if not attempts:
        raise ValueError("no attempts")

    def key(a: _Attempt) -> tuple[int, int, int]:
        return (
            int(a.content),
            0 if not a.flags.low_confidence else -1,
            0 if not a.flags.high_no_speech_prob else -1,
        )

    best = max(attempts, key=key)
    reason: dict[str, Any] = {
        "strategy": "max_content_then_confidence",
        "picked": best.name,
        "picked_content": best.content,
        "picked_low_confidence": best.flags.low_confidence,
        "picked_high_no_speech_prob": best.flags.high_no_speech_prob,
    }

    if best.content >= 100 and best.flags.low_confidence:
        non_low = [a for a in attempts if not a.flags.low_confidence]
        if non_low:
            alt = max(non_low, key=lambda a: int(a.content))
            if alt.content >= best.content - 1:
                reason.update(
                    {
                        "picked": alt.name,
                        "picked_content": alt.content,
                        "picked_low_confidence": alt.flags.low_confidence,
                        "picked_high_no_speech_prob": alt.flags.high_no_speech_prob,
                        "override": "avoid_low_confidence_perfect_when_close_alternative",
                        "alt_name": alt.name,
                        "alt_content": alt.content,
                    }
                )
                best = alt

    return best, reason


def _build_edits(target_words: Sequence[str], hyp_words: Sequence[_WordRef]) -> list[DiffEdit]:
    a = list(target_words)
    b = [w.word for w in hyp_words]
    sm = SequenceMatcher(a=a, b=b, autojunk=False)

    edits: list[DiffEdit] = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            for k in range(i2 - i1):
                t = a[i1 + k]
                h = hyp_words[j1 + k]
                edits.append(
                    DiffEdit(
                        type=EditType.MATCH,
                        target_word=t,
                        hyp_word=h.word,
                        time_span=_safe_timespan(h.start_s, h.end_s),
                    )
                )
            continue

        if tag == "replace":
            m = min(i2 - i1, j2 - j1)
            for k in range(m):
                t = a[i1 + k]
                h = hyp_words[j1 + k]
                edits.append(
                    DiffEdit(
                        type=EditType.SUBSTITUTION,
                        target_word=t,
                        hyp_word=h.word,
                        time_span=_safe_timespan(h.start_s, h.end_s),
                    )
                )
            for k in range(i1 + m, i2):
                edits.append(DiffEdit(type=EditType.MISSING, target_word=a[k], hyp_word=None, time_span=None))
            for k in range(j1 + m, j2):
                h = hyp_words[k]
                edits.append(
                    DiffEdit(
                        type=EditType.INSERTION,
                        target_word=None,
                        hyp_word=h.word,
                        time_span=_safe_timespan(h.start_s, h.end_s),
                    )
                )
            continue

        if tag == "delete":
            for k in range(i1, i2):
                edits.append(DiffEdit(type=EditType.MISSING, target_word=a[k], hyp_word=None, time_span=None))
            continue

        if tag == "insert":
            for k in range(j1, j2):
                h = hyp_words[k]
                edits.append(
                    DiffEdit(
                        type=EditType.INSERTION,
                        target_word=None,
                        hyp_word=h.word,
                        time_span=_safe_timespan(h.start_s, h.end_s),
                    )
                )
            continue

    return edits


def _assign_missing_spans(
    edits: list[DiffEdit],
    hyp_words: Sequence[_WordRef],
    duration_s: Optional[float],
) -> None:
    last_end: Optional[float] = None
    next_hyp_start_by_edit: list[Optional[float]] = [None] * len(edits)

    next_start: Optional[float] = None
    for i in range(len(edits) - 1, -1, -1):
        e = edits[i]
        if e.type in (EditType.MATCH, EditType.SUBSTITUTION, EditType.INSERTION) and e.time_span is not None:
            next_start = float(e.time_span.start_s)
        next_hyp_start_by_edit[i] = next_start

    for i, e in enumerate(edits):
        if e.type in (EditType.MATCH, EditType.SUBSTITUTION, EditType.INSERTION) and e.time_span is not None:
            last_end = float(e.time_span.end_s)
            continue
        if e.type != EditType.MISSING or e.time_span is not None:
            continue
        e.time_span = _span_between(last_end, next_hyp_start_by_edit[i], duration_s)


def _score_content(target_words: Sequence[str], edits: Sequence[DiffEdit]) -> int:
    n = max(1, len(target_words))
    total_cost = 0.0
    for e in edits:
        if e.type == EditType.MATCH:
            continue
        if e.type not in (EditType.MISSING, EditType.INSERTION, EditType.SUBSTITUTION):
            continue

        cost = 1.0
        meta = e.meta or {}
        if e.type == EditType.SUBSTITUTION and meta.get("minor_kind") == "suffix":
            suffix_status = meta.get("suffix_status")
            if suffix_status == "substitution":
                cost = _MORPH_SUFFIX_SUB_COST
            else:
                cost = _MORPH_SUFFIX_COST
        total_cost += float(cost)

    wer = total_cost / float(n)
    return int(round(max(0.0, min(1.0, 1.0 - wer)) * 100.0))


def _severity_for_edit(edit: DiffEdit) -> Severity:
    if edit.type == EditType.MATCH:
        return Severity.INFO
    if edit.type == EditType.SUBSTITUTION:
        if (edit.meta or {}).get("minor_kind") == "suffix":
            return Severity.INFO
        return Severity.WARNING
    return Severity.ERROR


def _message(lang: str, edit: DiffEdit) -> str:
    zh = lang.startswith("zh")
    if edit.type == EditType.SUBSTITUTION and (edit.meta or {}).get("minor_kind") == "suffix":
        suffix_status = (edit.meta or {}).get("suffix_status")
        suffix = (edit.meta or {}).get("suffix")
        if suffix_status == "missing" and suffix:
            return f"词尾可能没读出来（-{suffix}）" if zh else f"Maybe missed suffix (-{suffix})"
        if suffix_status == "insertion" and suffix:
            return f"词尾可能多带了（-{suffix}）" if zh else f"Maybe added suffix (-{suffix})"
        t_suf = (edit.meta or {}).get("target_suffix")
        h_suf = (edit.meta or {}).get("hyp_suffix")
        if suffix_status == "substitution" and t_suf and h_suf:
            return f"词尾可能读错了（-{t_suf}→-{h_suf}）" if zh else f"Maybe confused suffix (-{t_suf}→-{h_suf})"
    if edit.type == EditType.MISSING:
        return f'可能漏读了 "{edit.target_word}"' if zh else f'Maybe missed "{edit.target_word}"'
    if edit.type == EditType.INSERTION:
        return f'可能多读了 "{edit.hyp_word}"' if zh else f'Maybe inserted "{edit.hyp_word}"'
    if edit.type == EditType.SUBSTITUTION:
        return (
            f'可能把 "{edit.target_word}" 读成了 "{edit.hyp_word}"'
            if zh
            else f'Maybe said "{edit.hyp_word}" instead of "{edit.target_word}"'
        )
    return ""


def _uncertainty(asr) -> UncertaintyFlags:
    low_confidence = False
    high_no_speech_prob = False
    notes: list[str] = []

    avg_logprobs = [seg.avg_logprob for seg in asr.segments if seg.avg_logprob is not None]
    no_speech_probs = [seg.no_speech_prob for seg in asr.segments if seg.no_speech_prob is not None]

    if avg_logprobs:
        avg = sum(float(x) for x in avg_logprobs) / float(len(avg_logprobs))
        if avg < -1.2:
            low_confidence = True
            notes.append("avg_logprob_low")
    if no_speech_probs and max(float(x) for x in no_speech_probs) >= 0.6:
        high_no_speech_prob = True
        notes.append("no_speech_prob_high")

    return UncertaintyFlags(low_confidence=low_confidence, high_no_speech_prob=high_no_speech_prob, notes=notes)


def _regions_from_edits(edits: Sequence[DiffEdit]) -> list[TimelineRegion]:
    regions: list[TimelineRegion] = []
    for e in edits:
        if e.type == EditType.MATCH:
            label = e.target_word or ""
            status = "match"
        elif e.type == EditType.MISSING:
            label = e.target_word or ""
            status = "missing"
        elif e.type == EditType.INSERTION:
            label = e.hyp_word or ""
            status = "insertion"
        else:
            label = e.target_word or ""
            status = "substitution"

        if e.time_span is None:
            continue

        meta = {"status": status}
        if e.target_word is not None:
            meta["target"] = e.target_word
        if e.hyp_word is not None:
            meta["hyp"] = e.hyp_word
        for k in ("minor", "minor_kind", "stem", "suffix", "suffix_status", "target_suffix", "hyp_suffix", "subtokens"):
            if k in (e.meta or {}):
                meta[k] = (e.meta or {}).get(k)

        regions.append(
            TimelineRegion(
                kind=RegionKind.WORD,
                time_span=e.time_span,
                label=label,
                severity=_severity_for_edit(e),
                meta=meta,
            )
        )
    return regions


def _explanations_from_edits(edits: Sequence[DiffEdit], lang: str) -> list[Explanation]:
    out: list[Explanation] = []
    for e in edits:
        if e.type in (EditType.MATCH,):
            continue
        if e.type not in (EditType.MISSING, EditType.INSERTION, EditType.SUBSTITUTION):
            continue
        out.append(
            Explanation(
                type=f"content.{e.type.value}",
                severity=_severity_for_edit(e),
                message=_message(lang, e),
                time_span=e.time_span,
                evidence={"edit": (e.model_dump() if hasattr(e, "model_dump") else e.dict())},
            )
        )
    return out


@dataclass
class DefaultV2Pipeline:
    asr: AsrProvider = HostWhisperAsrProvider()

    async def score(
        self,
        audio_path: str,
        target_text: str,
        language: Optional[str] = None,
        *,
        context: Optional[dict[str, Any]] = None,
    ) -> ExplainableReport:
        lang = language or "en"
        target_words = _tokenize_words(target_text)

        async def run_attempt(name: str, params: dict[str, Any]) -> _Attempt:
            raw_asr = await self.asr.transcribe(audio_path=audio_path, language=language, **params)
            hyp_raw = _asr_words(raw_asr)
            hyp_refs: list[_WordRef] = []
            alignments: list[WordAlignment] = []
            for idx, (word, start_s, end_s, _prob) in enumerate(hyp_raw):
                tok = _tokenize_words(word)
                if not tok:
                    continue
                w_norm = tok[0]
                hyp_refs.append(_WordRef(word=w_norm, idx=idx, start_s=start_s, end_s=end_s))
                ts = _safe_timespan(start_s, end_s)
                if ts is not None:
                    alignments.append(WordAlignment(word=w_norm, time_span=ts, source="whisper"))

            edits = _build_edits(target_words, hyp_refs)
            duration_s: Optional[float] = getattr(raw_asr, "duration_s", None)
            _assign_missing_spans(edits, hyp_refs, duration_s=duration_s)
            _annotate_morph_suffix_edits(edits)
            content = _score_content(target_words, edits)
            flags = _uncertainty(raw_asr)
            return _Attempt(
                name=name,
                params=params,
                asr=raw_asr,
                hyp_refs=hyp_refs,
                alignments=alignments,
                edits=edits,
                content=content,
                flags=flags,
            )

        a_params: dict[str, Any] = {
            "temperature": 0.0,
            "beam_size": 5,
            "condition_on_previous_text": True,
        }
        model_size = None
        if isinstance(context, dict):
            ms = context.get("asr_model_size")
            if isinstance(ms, str) and ms.strip():
                model_size = ms.strip()
        if model_size:
            a_params["model_size"] = model_size
        attempt_a = await run_attempt("neutral", a_params)

        attempts: list[_Attempt] = [attempt_a]
        attempt_b: Optional[_Attempt] = None
        attempt_c: Optional[_Attempt] = None
        if attempt_a.content < 98 and target_words:
            hotwords = _build_hotwords(target_text, context)
            initial_prompt = _build_initial_prompt(context)
            if hotwords or initial_prompt:
                b_params: dict[str, Any] = {
                    "temperature": 0.0,
                    "beam_size": 10,
                    "condition_on_previous_text": True,
                    "hotwords": hotwords,
                    "initial_prompt": initial_prompt,
                }
                if model_size:
                    b_params["model_size"] = model_size
                attempt_b = await run_attempt("biased", b_params)
                attempts.append(attempt_b)

                if attempt_b.content < 90:
                    c_params: dict[str, Any] = {
                        "temperature": 0.0,
                        "beam_size": 15,
                        "condition_on_previous_text": False,
                        "hotwords": hotwords,
                        "initial_prompt": initial_prompt,
                    }
                    if model_size:
                        c_params["model_size"] = model_size
                    attempt_c = await run_attempt("robust", c_params)
                    attempts.append(attempt_c)

        chosen, choose_reason = _choose_best_attempt(attempts)
        asr = chosen.asr

        duration_s: Optional[float] = getattr(asr, "duration_s", None)
        audio = AudioAsset(path=audio_path, sample_rate=None, duration_s=duration_s)
        alignments = chosen.alignments
        edits = chosen.edits

        layers = TimelineLayers(word_regions=_regions_from_edits(edits), pause_regions=[], divergence_regions=[])
        explanations = _explanations_from_edits(edits, lang=lang)

        content = chosen.content
        scores = Scores(overall=content, content=content, fluency=None, pronunciation=None)
        flags = chosen.flags

        ir = IRBundle(
            ir_version=IR_VERSION,
            audio=audio,
            target_text=target_text,
            asr=asr,
            alignments=alignments,
            diff_edits=edits,
        )

        report = ExplainableReport(
            schema_version=SCHEMA_VERSION,
            ir_version=IR_VERSION,
            scores=scores,
            explanations=explanations,
            timeline_layers=layers,
            uncertainty_flags=flags,
            audio=audio,
            debug={
                "target_words": target_words,
                "hyp_words": [w.word for w in chosen.hyp_refs],
                "asr_attempts": [_attempt_debug(a) for a in attempts],
                "asr_chosen": chosen.name,
                "asr_choose_reason": choose_reason,
                "ir": (ir.model_dump() if hasattr(ir, "model_dump") else ir.dict()),
            },
        )
        return report
