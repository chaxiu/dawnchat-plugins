import { computed, ref } from "vue";

import { loadProviderConfig, saveProviderConfig } from "./providerStorage";
import {
  DEFAULT_PROVIDER_CONFIG,
  type AssistantProviderConfig,
} from "./providerTypes";

function cloneConfig(config: AssistantProviderConfig): AssistantProviderConfig {
  return {
    schemaVersion: 1,
    provider: config.provider,
    modelId: config.modelId,
    apiKey: config.apiKey,
    baseURL: config.baseURL || "",
    providerOptions: { ...(config.providerOptions || {}) },
    headers: { ...(config.headers || {}) },
  };
}

function defaultModelId(provider: AssistantProviderConfig["provider"]): string {
  return provider === "gemini" ? "gemini-2.5-flash" : "gpt-4.1-mini";
}

export function useProviderConfig() {
  const initial = loadProviderConfig();
  const savedConfig = ref<AssistantProviderConfig>(cloneConfig(initial));
  const draftConfig = ref<AssistantProviderConfig>(cloneConfig(initial));
  const statusMessage = ref("");

  const isConfigured = computed(() =>
    draftConfig.value.apiKey.trim().length > 0 && draftConfig.value.modelId.trim().length > 0
  );

  function updateProvider(provider: AssistantProviderConfig["provider"]) {
    draftConfig.value.provider = provider;
    draftConfig.value.modelId = defaultModelId(provider);
    if (provider === "gemini") {
      draftConfig.value.baseURL = "";
    }
  }

  function saveDraft() {
    const normalized = cloneConfig(draftConfig.value);
    saveProviderConfig(normalized);
    savedConfig.value = cloneConfig(normalized);
    draftConfig.value = cloneConfig(normalized);
    statusMessage.value = "Provider settings saved locally.";
  }

  function resetDraft() {
    draftConfig.value = cloneConfig(savedConfig.value);
    statusMessage.value = "Reverted unsaved changes.";
  }

  function clearProviderConfig() {
    savedConfig.value = cloneConfig(DEFAULT_PROVIDER_CONFIG);
    draftConfig.value = cloneConfig(DEFAULT_PROVIDER_CONFIG);
    saveProviderConfig(DEFAULT_PROVIDER_CONFIG);
    statusMessage.value = "Cleared local provider settings.";
  }

  return {
    draftConfig,
    savedConfig,
    isConfigured,
    statusMessage,
    updateProvider,
    saveDraft,
    resetDraft,
    clearProviderConfig,
  };
}
