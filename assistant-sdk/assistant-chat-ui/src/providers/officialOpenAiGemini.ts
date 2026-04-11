import type { SettingsField } from "../types/assistantSettingsForm";

/**
 * Default provider form fields for official OpenAI + Gemini plugins.
 * No network calls — layout only; hosts own persistence and validation.
 */
export function officialOpenAiGeminiProviderFields(): SettingsField[] {
  return [
    {
      kind: "select",
      key: "provider",
      label: "Provider",
      testId: "provider-select",
      options: [
        { value: "openai", label: "OpenAI" },
        { value: "gemini", label: "Gemini" },
      ],
    },
    {
      kind: "text",
      key: "modelId",
      label: "Model ID",
      placeholder: "Model id",
    },
    {
      kind: "password",
      key: "apiKey",
      label: "API key",
      placeholder: "API key",
      gridColumn: "full",
    },
    {
      kind: "text",
      key: "baseURL",
      label: "Base URL (optional)",
      placeholder: "https://api.openai.com/v1",
      gridColumn: "full",
      visibleWhen: (draft) => draft.provider === "openai",
    },
  ];
}
