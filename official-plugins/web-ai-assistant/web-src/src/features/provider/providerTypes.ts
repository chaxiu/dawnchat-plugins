export type AssistantProviderKind = "openai" | "gemini";

export interface AssistantProviderConfig {
  schemaVersion: 1;
  provider: AssistantProviderKind;
  modelId: string;
  apiKey: string;
  baseURL?: string;
  providerOptions?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export const DEFAULT_PROVIDER_CONFIG: AssistantProviderConfig = {
  schemaVersion: 1,
  provider: "openai",
  modelId: "gpt-4.1-mini",
  apiKey: "",
  baseURL: "",
  providerOptions: {},
  headers: {},
};
