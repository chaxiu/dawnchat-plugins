import {
  DEFAULT_PROVIDER_CONFIG,
  type AssistantProviderConfig,
} from "./providerTypes";

const PROVIDER_STORAGE_KEY = "dawnchat.mobile-ai-assistant.provider-config.v1";

function toRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  return raw as Record<string, unknown>;
}

function toStringRecord(raw: unknown): Record<string, string> {
  const source = toRecord(raw);
  return Object.entries(source).reduce<Record<string, string>>((result, [key, value]) => {
    if (typeof value === "string") {
      result[key] = value;
    }
    return result;
  }, {});
}

export function normalizeProviderConfig(raw: unknown): AssistantProviderConfig {
  const source = toRecord(raw);
  const provider = source.provider === "gemini" ? "gemini" : "openai";
  return {
    schemaVersion: 1,
    provider,
    modelId: typeof source.modelId === "string" && source.modelId.trim()
      ? source.modelId.trim()
      : provider === "gemini"
        ? "gemini-2.5-flash"
        : DEFAULT_PROVIDER_CONFIG.modelId,
    apiKey: typeof source.apiKey === "string" ? source.apiKey.trim() : "",
    baseURL: typeof source.baseURL === "string" ? source.baseURL.trim() : "",
    providerOptions: toRecord(source.providerOptions),
    headers: toStringRecord(source.headers),
  };
}

export function loadProviderConfig(): AssistantProviderConfig {
  if (typeof localStorage === "undefined") {
    return { ...DEFAULT_PROVIDER_CONFIG };
  }

  try {
    const raw = localStorage.getItem(PROVIDER_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_PROVIDER_CONFIG };
    }
    return normalizeProviderConfig(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_PROVIDER_CONFIG };
  }
}

export function saveProviderConfig(config: AssistantProviderConfig) {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(PROVIDER_STORAGE_KEY, JSON.stringify(normalizeProviderConfig(config)));
}
