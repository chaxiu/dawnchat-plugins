import type { WebAssistantIdentity } from "../../runtime/assistantIdentity";

const CHAT_DEBUG_LOG_LIMIT = 200;
const CHAT_DEBUG_LOG_STORAGE_KEY_PREFIX = "dawnchat.web-ai-assistant.debug.chat.v1::";

type ChatDebugLevel = "debug" | "info" | "warn" | "error";

interface ChatDebugLogRecord {
  timestamp: string;
  level: ChatDebugLevel;
  event: string;
  data: Record<string, unknown>;
}

declare global {
  interface Window {
    __DAWNCHAT_WEB_ASSISTANT_DEBUG__?: {
      readChatLogs: () => ChatDebugLogRecord[];
      clearChatLogs: () => void;
      storageKey: string;
      sessionId: string;
      assistantInstanceId: string;
    };
  }
}

function toStorageKey(identity: WebAssistantIdentity): string {
  return `${CHAT_DEBUG_LOG_STORAGE_KEY_PREFIX}${identity.assistantInstanceId}`;
}

function safeCloneRecord(input: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(input)) as Record<string, unknown>;
}

function sanitizeString(raw: string): string {
  if (raw.length <= 500) {
    return raw;
  }
  return `${raw.slice(0, 500)}...(truncated ${raw.length - 500} chars)`;
}

function sanitizeValue(value: unknown, path: string[] = []): unknown {
  const joinedPath = path.join(".").toLowerCase();
  if (
    joinedPath.includes("apikey")
    || joinedPath.includes("api_key")
    || joinedPath.includes("authorization")
    || joinedPath.includes("token")
  ) {
    return "[redacted]";
  }
  if (typeof value === "string") {
    return sanitizeString(value);
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => sanitizeValue(item, [...path, String(index)]));
  }
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>(
    (result, [key, nested]) => {
      result[key] = sanitizeValue(nested, [...path, key]);
      return result;
    },
    {}
  );
}

function readLogs(storageKey: string): ChatDebugLogRecord[] {
  if (typeof localStorage === "undefined") {
    return [];
  }
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as ChatDebugLogRecord[] : [];
  } catch {
    return [];
  }
}

function writeLogs(storageKey: string, logs: ChatDebugLogRecord[]) {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(storageKey, JSON.stringify(logs));
}

function asErrorLike(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack || "",
    };
  }
  return {
    message: String(error),
  };
}

export function appendChatDebugLog(
  identity: WebAssistantIdentity,
  event: string,
  data: Record<string, unknown>,
  level: ChatDebugLevel = "info"
) {
  const storageKey = toStorageKey(identity);
  const logs = readLogs(storageKey);
  const record: ChatDebugLogRecord = {
    timestamp: new Date().toISOString(),
    level,
    event,
    data: sanitizeValue(safeCloneRecord(data)) as Record<string, unknown>,
  };
  const nextLogs = [...logs, record].slice(-CHAT_DEBUG_LOG_LIMIT);
  writeLogs(storageKey, nextLogs);

  // Keep a browser-visible trail for fast repro debugging.
  if (typeof console !== "undefined") {
    const prefix = `[web-assistant/chat][${record.level}] ${record.event}`;
    if (record.level === "error") {
      console.error(prefix, record.data);
    } else if (record.level === "warn") {
      console.warn(prefix, record.data);
    } else {
      console.log(prefix, record.data);
    }
  }
}

export function logChatError(
  identity: WebAssistantIdentity,
  event: string,
  error: unknown,
  extra: Record<string, unknown> = {}
) {
  appendChatDebugLog(identity, event, {
    ...extra,
    error: asErrorLike(error),
  }, "error");
}

export function installChatDebugWindowHandle(identity: WebAssistantIdentity) {
  if (typeof window === "undefined") {
    return;
  }
  const storageKey = toStorageKey(identity);
  window.__DAWNCHAT_WEB_ASSISTANT_DEBUG__ = {
    readChatLogs: () => readLogs(storageKey),
    clearChatLogs: () => writeLogs(storageKey, []),
    storageKey,
    sessionId: identity.sessionId,
    assistantInstanceId: identity.assistantInstanceId,
  };
}
