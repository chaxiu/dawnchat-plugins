from __future__ import annotations

import hashlib
import json
import uuid
from dataclasses import dataclass
from typing import Any, Optional

from dawnchat_sdk import host


@dataclass(frozen=True)
class NarrationInput:
    course_id: str
    kind: str
    lang: str
    prompt_version: str
    range_start_idx: int
    range_end_idx: int
    segments: list[dict[str, Any]]


@dataclass(frozen=True)
class NarrationResult:
    narration_id: str
    input_hash: str
    prompt_version: str
    content_text: str
    content_json: Optional[str]
    model_id: Optional[str]
    temperature: Optional[float]


def compute_input_hash(payload: dict[str, Any]) -> str:
    raw = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def _build_skip_summary_messages(*, segments: list[dict[str, Any]], lang: str) -> list[dict[str, str]]:
    if str(lang).startswith("zh"):
        system = (
            "你是一名英语学习教练。你的任务是在用户跳过部分字幕句子后，用中文给出简短、可消费的内容总结，"
            "帮助用户不丢失剧情/含义。输出要短、结构化、可解释。"
        )
        user = (
            "请根据下面这些按时间顺序的字幕句子，生成一个“跳过总结”。\n"
            "要求：\n"
            "1) TL;DR 1-2 句\n"
            "2) 关键内容 3-6 条（要点式）\n"
            "3) 不要编造未出现的信息；必要时用“可能/大致”表述\n"
            "4) 用 JSON 输出：{tldr: string, bullets: string[]}\n\n"
            f"字幕句子：\n{json.dumps(segments, ensure_ascii=False)}"
        )
    else:
        system = (
            "You are an English learning coach. When the user skips some subtitle lines, produce a short, structured "
            "summary so they don't lose plot/meaning. Be concise and faithful to the text."
        )
        user = (
            "Generate a short 'skip summary' from the subtitle lines.\n"
            "Requirements:\n"
            "1) TL;DR: 1-2 sentences\n"
            "2) Key points: 3-6 bullets\n"
            "3) Don't invent facts not in the lines\n"
            "4) Output JSON: {tldr: string, bullets: string[]}\n\n"
            f"Subtitle lines:\n{json.dumps(segments, ensure_ascii=False)}"
        )
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


def _format_skip_summary(*, content: str) -> tuple[str, Optional[str]]:
    raw = (content or "").strip()
    if not raw:
        return "", None
    try:
        parsed = json.loads(raw)
        tldr = str(parsed.get("tldr") or "").strip()
        bullets = parsed.get("bullets") or []
        if not isinstance(bullets, list):
            bullets = []
        bullets = [str(x).strip() for x in bullets if str(x).strip()]
        lines: list[str] = []
        if tldr:
            lines.append(f"**TL;DR**：{tldr}" if True else tldr)
        if bullets:
            lines.append("")
            for b in bullets:
                lines.append(f"- {b}")
        text = "\n".join(lines).strip() or raw
        return text, json.dumps({"tldr": tldr, "bullets": bullets}, ensure_ascii=False)
    except Exception:
        return raw, None


def _build_plot_messages(*, segments: list[dict[str, Any]], lang: str) -> list[dict[str, str]]:
    if str(lang).startswith("zh"):
        system = "你是一名英语学习教练。你的任务是用中文为用户总结剧情与关键信息，简短、结构化、可消费。"
        user = (
            "请根据下面这些按时间顺序的字幕句子，生成一个“剧情梗概”。\n"
            "要求：\n"
            "1) TL;DR 1-2 句\n"
            "2) 关键剧情/信息 4-8 条（要点式）\n"
            "3) 不要编造未出现的信息；不确定用“可能/大致”\n"
            "4) 用 JSON 输出：{tldr: string, bullets: string[]}\n\n"
            f"字幕句子：\n{json.dumps(segments, ensure_ascii=False)}"
        )
    else:
        system = "You are an English learning coach. Summarize plot/meaning from subtitle lines in a short, structured way."
        user = (
            "Generate a short plot recap from subtitle lines.\n"
            "Requirements:\n"
            "1) TL;DR: 1-2 sentences\n"
            "2) Key points: 4-8 bullets\n"
            "3) Don't invent facts not in the lines\n"
            "4) Output JSON: {tldr: string, bullets: string[]}\n\n"
            f"Subtitle lines:\n{json.dumps(segments, ensure_ascii=False)}"
        )
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


def _format_plot(*, content: str, lang: str) -> tuple[str, Optional[str]]:
    raw = (content or "").strip()
    if not raw:
        return "", None
    try:
        parsed = json.loads(raw)
        tldr = str(parsed.get("tldr") or "").strip()
        bullets = parsed.get("bullets") or []
        if not isinstance(bullets, list):
            bullets = []
        bullets = [str(x).strip() for x in bullets if str(x).strip()]
        lines: list[str] = []
        if tldr:
            prefix = "**TL;DR**：" if str(lang).startswith("zh") else "**TL;DR**: "
            lines.append(f"{prefix}{tldr}")
        if bullets:
            lines.append("")
            for b in bullets:
                lines.append(f"- {b}")
        text = "\n".join(lines).strip() or raw
        return text, json.dumps({"tldr": tldr, "bullets": bullets}, ensure_ascii=False)
    except Exception:
        return raw, None


def _build_translation_messages(*, segments: list[dict[str, Any]], lang: str) -> list[dict[str, str]]:
    if str(lang).startswith("zh"):
        system = "你是一名英语学习教练。你的任务是将英文字幕译成自然、准确的中文，并补充少量学习提示。"
        user = (
            "请对下面的字幕句子做中文释义。\n"
            "要求：\n"
            "1) 给出自然中文译文（可合并为一段）\n"
            "2) 给出 1-3 条学习提示（常见搭配/含义差异/语气）\n"
            "3) 不要编造未出现的上下文\n"
            "4) 用 JSON 输出：{translation: string, notes: string[]}\n\n"
            f"字幕句子：\n{json.dumps(segments, ensure_ascii=False)}"
        )
    else:
        system = "You are an English learning coach. Paraphrase the subtitle lines in simple English and add a few learning notes."
        user = (
            "Paraphrase the subtitle lines in simple English.\n"
            "Requirements:\n"
            "1) Provide a natural paraphrase (can be one short paragraph)\n"
            "2) Provide 1-3 learning notes (collocations/meaning nuance/tone)\n"
            "3) Don't invent context not in the lines\n"
            "4) Output JSON: {translation: string, notes: string[]}\n\n"
            f"Subtitle lines:\n{json.dumps(segments, ensure_ascii=False)}"
        )
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


def _build_practice_hint_messages(*, segments: list[dict[str, Any]], lang: str) -> list[dict[str, str]]:
    if str(lang).startswith("zh"):
        system = "你是一名英语学习教练。你的任务是在用户跟读前，用中文快速解释这句英文，并给出少量模仿要点。输出要短。"
        user = (
            "请对下面这句字幕做“跟读前简解说”。\n"
            "要求：\n"
            "1) 用 1 句中文解释句子大意\n"
            "2) 给出 1-3 条跟读要点（重音/连读/语气/易错点），每条尽量短\n"
            "3) 不要编造未出现的信息\n"
            "4) 用 JSON 输出：{meaning: string, tips: string[]}\n\n"
            f"字幕句子：\n{json.dumps(segments, ensure_ascii=False)}"
        )
    else:
        system = "You are an English learning coach. Before shadowing, quickly explain the line and give a few imitation tips."
        user = (
            "Create a short 'practice hint' for the subtitle line.\n"
            "Requirements:\n"
            "1) One-sentence meaning/paraphrase\n"
            "2) 1-3 shadowing tips (stress/liaison/tone/common mistakes), keep each tip short\n"
            "3) Don't invent context not present in the line\n"
            "4) Output JSON: {meaning: string, tips: string[]}\n\n"
            f"Subtitle line:\n{json.dumps(segments, ensure_ascii=False)}"
        )
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


def _format_practice_hint(*, content: str, lang: str) -> tuple[str, Optional[str]]:
    raw = (content or "").strip()
    if not raw:
        return "", None
    try:
        parsed = json.loads(raw)
        meaning = str(parsed.get("meaning") or "").strip()
        tips = parsed.get("tips") or []
        if not isinstance(tips, list):
            tips = []
        tips = [str(x).strip() for x in tips if str(x).strip()]
        header = "**简解说**" if str(lang).startswith("zh") else "**Hint**"
        lines: list[str] = [header]
        if meaning:
            prefix = "大意：" if str(lang).startswith("zh") else "Meaning: "
            lines.append(f"\n{prefix}{meaning}")
        if tips:
            tips_header = "\n\n**跟读要点**" if str(lang).startswith("zh") else "\n\n**Tips**"
            lines.append(tips_header)
            for t in tips:
                lines.append(f"- {t}")
        text = "\n".join(lines).strip() or raw
        return text, json.dumps({"meaning": meaning, "tips": tips}, ensure_ascii=False)
    except Exception:
        return raw, None


def _format_translation(*, content: str, lang: str) -> tuple[str, Optional[str]]:
    raw = (content or "").strip()
    if not raw:
        return "", None
    try:
        parsed = json.loads(raw)
        translation = str(parsed.get("translation") or "").strip()
        notes = parsed.get("notes") or []
        if not isinstance(notes, list):
            notes = []
        notes = [str(x).strip() for x in notes if str(x).strip()]
        lines: list[str] = []
        if translation:
            label = "**译文**" if str(lang).startswith("zh") else "**Paraphrase**"
            lines.append(f"{label}\n\n{translation}")
        if notes:
            lines.append("")
            label = "**学习提示**" if str(lang).startswith("zh") else "**Notes**"
            lines.append(label)
            for n in notes:
                lines.append(f"- {n}")
        text = "\n".join(lines).strip() or raw
        return text, json.dumps({"translation": translation, "notes": notes}, ensure_ascii=False)
    except Exception:
        return raw, None


def _build_vocab_messages(*, segments: list[dict[str, Any]], lang: str) -> list[dict[str, str]]:
    if str(lang).startswith("zh"):
        system = "你是一名英语学习教练。你的任务是从字幕句子中挑选少量值得学的词/短语并给出中文解释。"
        user = (
            "请从下面字幕句子中挑选 3-8 个值得学习的词/短语，并输出结构化结果。\n"
            "要求：\n"
            "1) 只选句子中出现过的词/短语\n"
            "2) 每项包含：word, meaning(中文), note(用法/搭配/近义区别，尽量短)\n"
            "3) 用 JSON 输出：{items: [{word: string, meaning: string, note: string}]}\n\n"
            f"字幕句子：\n{json.dumps(segments, ensure_ascii=False)}"
        )
    else:
        system = "You are an English learning coach. Pick a few useful words/phrases from subtitle lines and explain briefly."
        user = (
            "Pick 3-8 useful words/phrases from the subtitle lines.\n"
            "Requirements:\n"
            "1) Only pick items that appear in the lines\n"
            "2) Each item has: word, meaning, note (short usage/collocation)\n"
            "3) Output JSON: {items: [{word: string, meaning: string, note: string}]}\n\n"
            f"Subtitle lines:\n{json.dumps(segments, ensure_ascii=False)}"
        )
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


def _format_vocab(*, content: str, lang: str) -> tuple[str, Optional[str]]:
    raw = (content or "").strip()
    if not raw:
        return "", None
    try:
        parsed = json.loads(raw)
        items = parsed.get("items") or []
        if not isinstance(items, list):
            items = []
        clean: list[dict[str, str]] = []
        for it in items:
            if not isinstance(it, dict):
                continue
            w = str(it.get("word") or "").strip()
            m = str(it.get("meaning") or "").strip()
            n = str(it.get("note") or "").strip()
            if not w:
                continue
            clean.append({"word": w, "meaning": m, "note": n})

        title = "**词汇**" if str(lang).startswith("zh") else "**Vocabulary**"
        lines: list[str] = [title]
        for it in clean:
            tail = []
            if it.get("meaning"):
                tail.append(it["meaning"])
            if it.get("note"):
                tail.append(it["note"])
            detail = " — ".join([x for x in tail if x])
            lines.append(f"- `{it['word']}`{(': ' + detail) if detail else ''}")
        text = "\n".join(lines).strip() or raw
        return text, json.dumps({"items": clean}, ensure_ascii=False)
    except Exception:
        return raw, None


def _build_grammar_messages(*, segments: list[dict[str, Any]], lang: str) -> list[dict[str, str]]:
    if str(lang).startswith("zh"):
        system = "你是一名英语学习教练。你的任务是从字幕句子中提炼少量关键语法点并用中文解释。"
        user = (
            "请从下面字幕句子中提炼 1-4 个关键语法点。\n"
            "要求：\n"
            "1) 每个语法点包含：title, explanation(中文), example(来自或贴近原句)\n"
            "2) 解释要短、可操作\n"
            "3) 用 JSON 输出：{points: [{title: string, explanation: string, example: string}]}\n\n"
            f"字幕句子：\n{json.dumps(segments, ensure_ascii=False)}"
        )
    else:
        system = "You are an English learning coach. Extract a few key grammar points from the subtitle lines and explain briefly."
        user = (
            "Extract 1-4 key grammar points from the subtitle lines.\n"
            "Requirements:\n"
            "1) Each point has: title, explanation, example (from or close to the lines)\n"
            "2) Keep it short and actionable\n"
            "3) Output JSON: {points: [{title: string, explanation: string, example: string}]}\n\n"
            f"Subtitle lines:\n{json.dumps(segments, ensure_ascii=False)}"
        )
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


def _format_grammar(*, content: str, lang: str) -> tuple[str, Optional[str]]:
    raw = (content or "").strip()
    if not raw:
        return "", None
    try:
        parsed = json.loads(raw)
        points = parsed.get("points") or []
        if not isinstance(points, list):
            points = []
        clean: list[dict[str, str]] = []
        for p in points:
            if not isinstance(p, dict):
                continue
            title = str(p.get("title") or "").strip()
            explanation = str(p.get("explanation") or "").strip()
            example = str(p.get("example") or "").strip()
            if not title and not explanation:
                continue
            clean.append({"title": title, "explanation": explanation, "example": example})

        header = "**语法**" if str(lang).startswith("zh") else "**Grammar**"
        lines: list[str] = [header]
        for p in clean:
            t = p.get("title") or ""
            e = p.get("explanation") or ""
            ex = p.get("example") or ""
            if t:
                lines.append(f"\n- **{t}**")
            else:
                lines.append("\n-")
            if e:
                lines.append(f"  - {e}")
            if ex:
                lines.append(f"  - `{ex}`")
        text = "\n".join(lines).strip() or raw
        return text, json.dumps({"points": clean}, ensure_ascii=False)
    except Exception:
        return raw, None


async def generate_skip_summary(
    *,
    course_id: str,
    lang: str,
    range_start_idx: int,
    range_end_idx: int,
    segments: list[dict[str, Any]],
    model: Optional[str] = None,
    temperature: float = 0.4,
    prompt_version: str = "skip_summary_v1",
) -> tuple[NarrationInput, NarrationResult]:
    input_obj = NarrationInput(
        course_id=str(course_id),
        kind="skip_summary",
        lang=str(lang),
        prompt_version=str(prompt_version),
        range_start_idx=int(range_start_idx),
        range_end_idx=int(range_end_idx),
        segments=list(segments),
    )
    input_hash = compute_input_hash(
        {
            "course_id": input_obj.course_id,
            "kind": input_obj.kind,
            "lang": input_obj.lang,
            "prompt_version": input_obj.prompt_version,
            "range_start_idx": input_obj.range_start_idx,
            "range_end_idx": input_obj.range_end_idx,
            "segments": input_obj.segments,
        }
    )

    resp = await host.ai.chat(
        messages=_build_skip_summary_messages(segments=input_obj.segments, lang=input_obj.lang),
        model=str(model) if model else None,
        temperature=float(temperature),
    )
    content = str(resp.get("content") or "")
    content_text, content_json = _format_skip_summary(content=content)

    result = NarrationResult(
        narration_id=uuid.uuid4().hex,
        input_hash=input_hash,
        prompt_version=input_obj.prompt_version,
        content_text=content_text or content.strip(),
        content_json=content_json,
        model_id=resp.get("model"),
        temperature=float(temperature),
    )
    return input_obj, result


async def generate_plot(
    *,
    course_id: str,
    lang: str,
    range_start_idx: int,
    range_end_idx: int,
    segments: list[dict[str, Any]],
    model: Optional[str] = None,
    temperature: float = 0.4,
    prompt_version: str = "plot_v1",
) -> tuple[NarrationInput, NarrationResult]:
    input_obj = NarrationInput(
        course_id=str(course_id),
        kind="plot",
        lang=str(lang),
        prompt_version=str(prompt_version),
        range_start_idx=int(range_start_idx),
        range_end_idx=int(range_end_idx),
        segments=list(segments),
    )
    input_hash = compute_input_hash(
        {
            "course_id": input_obj.course_id,
            "kind": input_obj.kind,
            "lang": input_obj.lang,
            "prompt_version": input_obj.prompt_version,
            "range_start_idx": input_obj.range_start_idx,
            "range_end_idx": input_obj.range_end_idx,
            "segments": input_obj.segments,
        }
    )
    resp = await host.ai.chat(
        messages=_build_plot_messages(segments=input_obj.segments, lang=input_obj.lang),
        model=str(model) if model else None,
        temperature=float(temperature),
    )
    content = str(resp.get("content") or "")
    content_text, content_json = _format_plot(content=content, lang=input_obj.lang)
    result = NarrationResult(
        narration_id=uuid.uuid4().hex,
        input_hash=input_hash,
        prompt_version=input_obj.prompt_version,
        content_text=content_text or content.strip(),
        content_json=content_json,
        model_id=resp.get("model"),
        temperature=float(temperature),
    )
    return input_obj, result


async def generate_translation(
    *,
    course_id: str,
    lang: str,
    range_start_idx: int,
    range_end_idx: int,
    segments: list[dict[str, Any]],
    model: Optional[str] = None,
    temperature: float = 0.3,
    prompt_version: str = "translation_v1",
) -> tuple[NarrationInput, NarrationResult]:
    input_obj = NarrationInput(
        course_id=str(course_id),
        kind="translation",
        lang=str(lang),
        prompt_version=str(prompt_version),
        range_start_idx=int(range_start_idx),
        range_end_idx=int(range_end_idx),
        segments=list(segments),
    )
    input_hash = compute_input_hash(
        {
            "course_id": input_obj.course_id,
            "kind": input_obj.kind,
            "lang": input_obj.lang,
            "prompt_version": input_obj.prompt_version,
            "range_start_idx": input_obj.range_start_idx,
            "range_end_idx": input_obj.range_end_idx,
            "segments": input_obj.segments,
        }
    )
    resp = await host.ai.chat(
        messages=_build_translation_messages(segments=input_obj.segments, lang=input_obj.lang),
        model=str(model) if model else None,
        temperature=float(temperature),
    )
    content = str(resp.get("content") or "")
    content_text, content_json = _format_translation(content=content, lang=input_obj.lang)
    result = NarrationResult(
        narration_id=uuid.uuid4().hex,
        input_hash=input_hash,
        prompt_version=input_obj.prompt_version,
        content_text=content_text or content.strip(),
        content_json=content_json,
        model_id=resp.get("model"),
        temperature=float(temperature),
    )
    return input_obj, result


async def generate_practice_hint(
    *,
    course_id: str,
    lang: str,
    range_start_idx: int,
    range_end_idx: int,
    segments: list[dict[str, Any]],
    model: Optional[str] = None,
    temperature: float = 0.3,
    prompt_version: str = "practice_hint_v1",
) -> tuple[NarrationInput, NarrationResult]:
    input_obj = NarrationInput(
        course_id=str(course_id),
        kind="practice_hint",
        lang=str(lang),
        prompt_version=str(prompt_version),
        range_start_idx=int(range_start_idx),
        range_end_idx=int(range_end_idx),
        segments=list(segments),
    )
    input_hash = compute_input_hash(
        {
            "course_id": input_obj.course_id,
            "kind": input_obj.kind,
            "lang": input_obj.lang,
            "prompt_version": input_obj.prompt_version,
            "range_start_idx": input_obj.range_start_idx,
            "range_end_idx": input_obj.range_end_idx,
            "segments": input_obj.segments,
        }
    )
    resp = await host.ai.chat(
        messages=_build_practice_hint_messages(segments=input_obj.segments, lang=input_obj.lang),
        model=str(model) if model else None,
        temperature=float(temperature),
    )
    content = str(resp.get("content") or "")
    content_text, content_json = _format_practice_hint(content=content, lang=input_obj.lang)
    result = NarrationResult(
        narration_id=uuid.uuid4().hex,
        input_hash=input_hash,
        prompt_version=input_obj.prompt_version,
        content_text=content_text or content.strip(),
        content_json=content_json,
        model_id=resp.get("model"),
        temperature=float(temperature),
    )
    return input_obj, result


async def generate_vocab(
    *,
    course_id: str,
    lang: str,
    range_start_idx: int,
    range_end_idx: int,
    segments: list[dict[str, Any]],
    model: Optional[str] = None,
    temperature: float = 0.3,
    prompt_version: str = "vocab_v1",
) -> tuple[NarrationInput, NarrationResult]:
    input_obj = NarrationInput(
        course_id=str(course_id),
        kind="vocab",
        lang=str(lang),
        prompt_version=str(prompt_version),
        range_start_idx=int(range_start_idx),
        range_end_idx=int(range_end_idx),
        segments=list(segments),
    )
    input_hash = compute_input_hash(
        {
            "course_id": input_obj.course_id,
            "kind": input_obj.kind,
            "lang": input_obj.lang,
            "prompt_version": input_obj.prompt_version,
            "range_start_idx": input_obj.range_start_idx,
            "range_end_idx": input_obj.range_end_idx,
            "segments": input_obj.segments,
        }
    )
    resp = await host.ai.chat(
        messages=_build_vocab_messages(segments=input_obj.segments, lang=input_obj.lang),
        model=str(model) if model else None,
        temperature=float(temperature),
    )
    content = str(resp.get("content") or "")
    content_text, content_json = _format_vocab(content=content, lang=input_obj.lang)
    result = NarrationResult(
        narration_id=uuid.uuid4().hex,
        input_hash=input_hash,
        prompt_version=input_obj.prompt_version,
        content_text=content_text or content.strip(),
        content_json=content_json,
        model_id=resp.get("model"),
        temperature=float(temperature),
    )
    return input_obj, result


async def generate_grammar(
    *,
    course_id: str,
    lang: str,
    range_start_idx: int,
    range_end_idx: int,
    segments: list[dict[str, Any]],
    model: Optional[str] = None,
    temperature: float = 0.3,
    prompt_version: str = "grammar_v1",
) -> tuple[NarrationInput, NarrationResult]:
    input_obj = NarrationInput(
        course_id=str(course_id),
        kind="grammar",
        lang=str(lang),
        prompt_version=str(prompt_version),
        range_start_idx=int(range_start_idx),
        range_end_idx=int(range_end_idx),
        segments=list(segments),
    )
    input_hash = compute_input_hash(
        {
            "course_id": input_obj.course_id,
            "kind": input_obj.kind,
            "lang": input_obj.lang,
            "prompt_version": input_obj.prompt_version,
            "range_start_idx": input_obj.range_start_idx,
            "range_end_idx": input_obj.range_end_idx,
            "segments": input_obj.segments,
        }
    )
    resp = await host.ai.chat(
        messages=_build_grammar_messages(segments=input_obj.segments, lang=input_obj.lang),
        model=str(model) if model else None,
        temperature=float(temperature),
    )
    content = str(resp.get("content") or "")
    content_text, content_json = _format_grammar(content=content, lang=input_obj.lang)
    result = NarrationResult(
        narration_id=uuid.uuid4().hex,
        input_hash=input_hash,
        prompt_version=input_obj.prompt_version,
        content_text=content_text or content.strip(),
        content_json=content_json,
        model_id=resp.get("model"),
        temperature=float(temperature),
    )
    return input_obj, result


async def synthesize_tts(
    *,
    text: str,
    output_path: str,
    speaker: str = "Emma",
    quality: str = "fast",
    engine: str = "vibevoice",
    model_id: Optional[str] = None,
) -> bool:
    resp = await host.tools.call(
        "dawnchat.tts.synthesize",
        arguments={
            "text": str(text or ""),
            "speaker": str(speaker or "Emma"),
            "quality": str(quality or "fast"),
            "engine": str(engine or "vibevoice"),
            "model_id": (str(model_id).strip() if model_id else None),
            "output_path": str(output_path),
        },
    )
    return bool(resp and resp.get("code") == 200)
