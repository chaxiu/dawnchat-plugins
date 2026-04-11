import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";

import AssistantChatChrome from "../AssistantChatChrome.vue";
import type { AssistantChatChromeLabels } from "../../types/assistantChrome";
import { DEFAULT_CHAT_MESSAGE_LIST_LABELS } from "../../types";
import { officialOpenAiGeminiProviderFields } from "../../providers/officialOpenAiGemini";

const baseLabels: AssistantChatChromeLabels = {
  toolbarTitle: "Chat",
  providerReadyTitle: "Ready",
  providerNotReadyTitle: "Configure",
  settingsAriaLabel: "Settings",
  settingsDialogAriaLabel: "Dialog",
  settingsEyebrow: "Settings",
  settingsTitle: "Model & status",
  statusReady: "Ready",
  statusNeedsKey: "Needs key",
  sectionSaved: "Saved",
  sectionProvider: "Provider",
  sectionConversation: "Conversation",
  lastStopPrefix: "Last stop: ",
  composerPlaceholder: "Type…",
  send: "Send",
  sending: "Running…",
  clearChat: "Clear",
  copyDebugLogs: "Copy logs",
  saveLocally: "Save",
  resetDraft: "Reset",
  clearSaved: "Clear saved",
  expandSheetAriaLabel: "Expand chat",
  mobileDockPlaceholder: "Message…",
};

function mountChrome(overrides: Record<string, unknown> = {}) {
  return mount(AssistantChatChrome, {
    props: {
      labels: baseLabels,
      providerFields: officialOpenAiGeminiProviderFields(),
      isMobile: false,
      settingsOpen: false,
      isConfigured: false,
      isRunning: false,
      errorMessage: "",
      statusMessage: "",
      lastStopReason: "",
      savedConfig: { provider: "openai", modelId: "gpt-4.1-mini" },
      maskedApiKey: "Not configured",
      draftConfig: { provider: "openai", modelId: "", apiKey: "", baseURL: "" },
      prompt: "",
      timelineItems: [],
      messageListLabels: { ...DEFAULT_CHAT_MESSAGE_LIST_LABELS },
      waitingReason: "",
      ...overrides,
    },
    attachTo: document.body,
  });
}

describe("AssistantChatChrome", () => {
  it("emits submit when form is submitted", async () => {
    const wrapper = mountChrome({ prompt: "hi" });
    await wrapper.find('[data-testid="chat-form"]').trigger("submit.prevent");
    expect(wrapper.emitted("submit")).toBeTruthy();
  });

  it("emits toggle-settings when gear is clicked", async () => {
    const wrapper = mountChrome();
    await wrapper.find('[data-testid="chat-settings-trigger"]').trigger("click");
    expect(wrapper.emitted("toggle-settings")).toBeTruthy();
  });

  it("emits update:draft-config when a text field changes", async () => {
    const wrapper = mountChrome({
      settingsOpen: true,
      draftConfig: { provider: "openai", modelId: "x", apiKey: "", baseURL: "" },
    });
    await nextTick();
    const input = wrapper.find('input[placeholder="Model id"]');
    expect(input.exists()).toBe(true);
    await input.setValue("new-model");
    const emitted = wrapper.emitted("update:draft-config");
    expect(emitted?.length).toBeGreaterThan(0);
    expect(emitted?.[emitted.length - 1]?.[0]).toEqual({ modelId: "new-model" });
  });

  it("emits change-provider when provider select changes", async () => {
    const wrapper = mountChrome({
      settingsOpen: true,
      draftConfig: { provider: "openai", modelId: "m", apiKey: "", baseURL: "" },
    });
    await nextTick();
    const select = wrapper.find('[data-testid="provider-select"]');
    await select.setValue("gemini");
    expect(wrapper.emitted("change-provider")?.[0]).toEqual(["gemini"]);
  });

  it("shows mobile dock when isMobile and sheet collapsed; full chrome when expanded", async () => {
    const collapsed = mountChrome({
      isMobile: true,
      mobileSheetExpanded: false,
    });
    expect(collapsed.find('[data-testid="mobile-chat-dock"]').exists()).toBe(true);
    expect(collapsed.find('[data-testid="chat-form"]').exists()).toBe(false);

    const expanded = mountChrome({
      isMobile: true,
      mobileSheetExpanded: true,
    });
    expect(expanded.find('[data-testid="mobile-chat-dock"]').exists()).toBe(false);
    expect(expanded.find('[data-testid="chat-form"]').exists()).toBe(true);
  });

  it("emits expand-mobile-sheet when dock expand is clicked", async () => {
    const wrapper = mountChrome({
      isMobile: true,
      mobileSheetExpanded: false,
    });
    await wrapper.find('[data-testid="mobile-expand-sheet"]').trigger("click");
    expect(wrapper.emitted("expand-mobile-sheet")).toBeTruthy();
  });

  it("emits submit from dock form", async () => {
    const wrapper = mountChrome({
      isMobile: true,
      mobileSheetExpanded: false,
      prompt: "dock",
    });
    await wrapper.find('[data-testid="chat-dock-form"]').trigger("submit.prevent");
    expect(wrapper.emitted("submit")).toBeTruthy();
  });
});
