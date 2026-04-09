import { mount } from "@vue/test-utils";
import { computed, ref } from "vue";
import { describe, expect, it, beforeEach, vi } from "vitest";

import AssistantChatPage from "../AssistantChatPage.vue";

const submitPromptMock = vi.fn();
const clearConversationMock = vi.fn();
const updateProviderMock = vi.fn();
const saveDraftMock = vi.fn();
const resetDraftMock = vi.fn();
const clearProviderConfigMock = vi.fn();

const promptRef = ref("");
const transcriptRef = ref([]);
const draftConfigRef = ref({
  schemaVersion: 1 as const,
  provider: "openai" as const,
  modelId: "gpt-4.1-mini",
  apiKey: "",
  baseURL: "",
  providerOptions: {},
  headers: {},
});
const savedConfigRef = ref({
  schemaVersion: 1 as const,
  provider: "openai" as const,
  modelId: "gpt-4.1-mini",
  apiKey: "secret-key",
  baseURL: "",
  providerOptions: {},
  headers: {},
});
const isConfiguredRef = computed(() => true);
const statusMessageRef = ref("");
const errorMessageRef = ref("");
const lastStopReasonRef = ref("");

vi.mock("../../../features/chat/useAssistantChat", () => ({
  useAssistantChat: () => ({
    prompt: promptRef,
    transcript: transcriptRef,
    isRunning: ref(false),
    errorMessage: errorMessageRef,
    lastStopReason: lastStopReasonRef,
    hasTranscript: computed(() => transcriptRef.value.length > 0),
    submitPrompt: submitPromptMock,
    clearConversation: clearConversationMock,
  }),
}));

vi.mock("../../../features/provider/useProviderConfig", () => ({
  useProviderConfig: () => ({
    draftConfig: draftConfigRef,
    savedConfig: savedConfigRef,
    isConfigured: isConfiguredRef,
    statusMessage: statusMessageRef,
    updateProvider: updateProviderMock,
    saveDraft: saveDraftMock,
    resetDraft: resetDraftMock,
    clearProviderConfig: clearProviderConfigMock,
  }),
}));

describe("AssistantChatPage", () => {
  beforeEach(() => {
    submitPromptMock.mockReset();
    clearConversationMock.mockReset();
    updateProviderMock.mockReset();
    saveDraftMock.mockReset();
    resetDraftMock.mockReset();
    clearProviderConfigMock.mockReset();
    promptRef.value = "";
    transcriptRef.value = [];
    statusMessageRef.value = "";
    errorMessageRef.value = "";
    lastStopReasonRef.value = "";
  });

  it("saves provider settings and submits chat prompts", async () => {
    const wrapper = mount(AssistantChatPage);

    await wrapper.get("button").trigger("click");
    expect(saveDraftMock).toHaveBeenCalledTimes(1);

    await wrapper.get("select").setValue("gemini");
    expect(updateProviderMock).toHaveBeenCalledWith("gemini");

    await wrapper.get("textarea").setValue("Use math.add for 2 + 3.");
    await wrapper.get("form").trigger("submit.prevent");

    expect(submitPromptMock).toHaveBeenCalledWith(savedConfigRef.value);
  });
});
