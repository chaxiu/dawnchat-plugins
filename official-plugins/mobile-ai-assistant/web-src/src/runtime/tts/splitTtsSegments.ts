/**
 * Ports `TtsSynthesisService.split_sentences` (packages/backend-kernel/app/voice/synthesis_service.py)
 * for Edge / Dawn-TTS per-segment length limits. Paragraph split uses `\n+` on the normalized string
 * (Python preprocessor turns newlines into spaces, so in practice this is usually a single paragraph).
 */

export const MAX_SEGMENT_CHARS = 120;

/** Curly quotes match Python `["'""''(\[]` in synthesis_service._split_paragraph. */
const PARAGRAPH_BOUNDARIES =
  /(?<=[。！？!?；;])\s*|(?<=\.)\s+(?=(?:["'\u201c\u201d\u2018\u2019(\[]\s*)?[A-Z\u4e00-\u9fff])/u;

const REPLACEMENTS: Record<string, string> = {
  "❓": "?",
  "❔": "?",
  "❕": "!",
  "❗": "!",
};

/** Mirrors `TextPreprocessor.normalize(..., use_nfkc=False)` for split input. */
export function normalizeTextForTtsSplit(text: string): string {
  let replaced = String(text ?? "");
  for (const [src, target] of Object.entries(REPLACEMENTS)) {
    replaced = replaced.split(src).join(target);
  }
  const chars: string[] = [];
  for (const ch of replaced) {
    if (ch === "\n" || ch === "\r" || ch === "\t") {
      chars.push(" ");
      continue;
    }
    if (/\p{Cc}/u.test(ch) || /\p{Cs}/u.test(ch)) {
      chars.push(" ");
      continue;
    }
    if (/\p{So}/u.test(ch)) {
      chars.push(" ");
      continue;
    }
    if (!/[\u0000-\u001f\u007f-\u009f]/.test(ch)) {
      chars.push(ch);
    }
  }
  return chars.join("").replace(/\s+/g, " ").trim();
}

export function splitParagraph(text: string): string[] {
  const chunks = text.split(PARAGRAPH_BOUNDARIES);
  return chunks.map((s) => s.trim()).filter(Boolean);
}

export function bestSplitIndex(window: string, maxChars: number): number {
  const cutPoints = [
    window.lastIndexOf("，"),
    window.lastIndexOf(","),
    window.lastIndexOf("、"),
    window.lastIndexOf("；"),
    window.lastIndexOf(";"),
    window.lastIndexOf(" "),
  ];
  const preferred = Math.max(...cutPoints);
  if (preferred >= Math.max(8, Math.floor(maxChars / 3))) {
    return preferred + 1;
  }
  return maxChars;
}

export function chunkSentence(text: string, maxChars: number): string[] {
  const payload = text.trim();
  if (!payload) {
    return [];
  }
  if (payload.length <= maxChars) {
    return [payload];
  }
  const chunks: string[] = [];
  let rest = payload;
  while (rest.length > maxChars) {
    const window = rest.slice(0, maxChars + 1);
    const splitAt = bestSplitIndex(window, maxChars);
    const head = rest.slice(0, splitAt).trim();
    if (head) {
      chunks.push(head);
    }
    rest = rest.slice(splitAt).trim();
    if (!rest) {
      break;
    }
  }
  if (rest) {
    chunks.push(rest);
  }
  return chunks;
}

/**
 * Same semantics as `TtsSynthesisService.split_sentences(text, max_chars)`.
 */
export function splitTtsSegments(text: string, maxChars: number = MAX_SEGMENT_CHARS): string[] {
  const normalized = normalizeTextForTtsSplit(text);
  if (!normalized) {
    return [];
  }
  const paragraphs = normalized.split(/\n+/);
  const sentences: string[] = [];
  for (const paragraph of paragraphs) {
    const part = paragraph.trim();
    if (!part) {
      continue;
    }
    for (const sentence of splitParagraph(part)) {
      sentences.push(...chunkSentence(sentence, maxChars));
    }
  }
  return sentences;
}
