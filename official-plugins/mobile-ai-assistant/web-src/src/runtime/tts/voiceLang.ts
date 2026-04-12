/**
 * Map host voice hints (e.g. Azure-style `zh-CN-...`) to BCP 47 `lang` for TTS APIs.
 */
export function voiceHintToBcp47Lang(voice: string | undefined): string | undefined {
  if (!voice) {
    return undefined;
  }
  const trimmed = voice.trim();
  if (!trimmed) {
    return undefined;
  }
  const parts = trimmed.split("-");
  if (parts.length >= 2 && /^[a-zA-Z]{2}$/.test(parts[0]) && /^[a-zA-Z]{2}$/.test(parts[1])) {
    return `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
  }
  return undefined;
}
