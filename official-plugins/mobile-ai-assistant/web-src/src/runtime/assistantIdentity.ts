const SESSION_STORAGE_KEY_PREFIX = "dawnchat.mobile-ai-assistant.session.v1::";
const TRANSCRIPT_STORAGE_KEY_PREFIX = "dawnchat.mobile-ai-assistant.transcript.v1::";

export interface MobileAssistantIdentity {
  assistantInstanceId: string;
  sessionId: string;
  persistenceScope: string;
  transcriptStorageKey: string;
}

let cachedIdentity: MobileAssistantIdentity | null = null;

function sanitizeScopePart(raw: string): string {
  const value = raw.trim().toLowerCase();
  if (!value) {
    return "";
  }
  return value
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function readFirstQueryParam(url: URL, keys: string[]): string {
  for (const key of keys) {
    const value = sanitizeScopePart(url.searchParams.get(key) || "");
    if (value) {
      return value;
    }
  }
  return "";
}

function createFallbackSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return sanitizeScopePart(crypto.randomUUID());
  }
  return sanitizeScopePart(`session-${Date.now()}-${Math.random().toString(16).slice(2)}`);
}

function resolveAssistantInstanceId(url: URL): string {
  const explicitInstanceId = readFirstQueryParam(url, [
    "assistant_instance_id",
    "assistantInstanceId",
    "instance_id",
    "instanceId",
    "plugin_id",
    "pluginId",
  ]);
  if (explicitInstanceId) {
    return explicitInstanceId;
  }

  const pathScope = sanitizeScopePart(url.pathname);
  if (pathScope) {
    return pathScope;
  }

  const hostScope = sanitizeScopePart(url.host);
  return hostScope || "default";
}

function resolveSessionId(url: URL, assistantInstanceId: string): string {
  const explicitSessionId = readFirstQueryParam(url, ["session_id", "sessionId"]);
  if (explicitSessionId) {
    return explicitSessionId;
  }

  if (typeof sessionStorage === "undefined") {
    return createFallbackSessionId();
  }

  const storageKey = `${SESSION_STORAGE_KEY_PREFIX}${assistantInstanceId}`;
  const stored = sanitizeScopePart(sessionStorage.getItem(storageKey) || "");
  if (stored) {
    return stored;
  }

  const nextSessionId = createFallbackSessionId();
  sessionStorage.setItem(storageKey, nextSessionId);
  return nextSessionId;
}

export function getMobileAssistantIdentity(): MobileAssistantIdentity {
  if (cachedIdentity) {
    return cachedIdentity;
  }

  if (typeof window === "undefined" || !window.location) {
    cachedIdentity = {
      assistantInstanceId: "default",
      sessionId: "default-session",
      persistenceScope: "default::session.default-session",
      transcriptStorageKey: `${TRANSCRIPT_STORAGE_KEY_PREFIX}default`,
    };
    return cachedIdentity;
  }

  const url = new URL(window.location.href);
  const assistantInstanceId = resolveAssistantInstanceId(url);
  const sessionId = resolveSessionId(url, assistantInstanceId);
  cachedIdentity = {
    assistantInstanceId,
    sessionId,
    persistenceScope: `${assistantInstanceId}::session.${sessionId}`,
    transcriptStorageKey: `${TRANSCRIPT_STORAGE_KEY_PREFIX}${assistantInstanceId}`,
  };
  return cachedIdentity;
}

export function resetMobileAssistantIdentityForTests() {
  cachedIdentity = null;
}
