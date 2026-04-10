import type { AgentLoopMessage } from "@dawnchat/host-orchestration-sdk/agent-loop";

function normalizeTranscript(raw: unknown): AgentLoopMessage[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter((entry) => !!entry && typeof entry === "object")
    .map((entry) => JSON.parse(JSON.stringify(entry)) as AgentLoopMessage);
}

export function loadStoredTranscript(storageKey: string): AgentLoopMessage[] {
  if (typeof localStorage === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? normalizeTranscript(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function saveStoredTranscript(storageKey: string, transcript: AgentLoopMessage[]) {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(storageKey, JSON.stringify(normalizeTranscript(transcript)));
}

export function clearStoredTranscript(storageKey: string) {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.removeItem(storageKey);
}
