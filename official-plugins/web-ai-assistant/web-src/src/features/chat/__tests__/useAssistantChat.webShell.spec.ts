import type { AgentLoopMessage } from "@dawnchat/host-orchestration-sdk/agent-loop";
import { effectScope, nextTick } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createProviderModelMock = vi.fn(() => ({ provider: "mock-model" }));
const createWebAssistantHostToolRouterMock = vi.fn(() => ({ invoke: vi.fn() }));
const listWebAssistantToolDefinitionsMock = vi.fn(() => [
  {
    name: "math.add",
    description: "Add two numbers together and return a numeric result.",
  },
]);
const appendChatDebugLogMock = vi.fn();
const installChatDebugWindowHandleMock = vi.fn();
const logChatErrorMock = vi.fn();
const loadStoredTranscriptMock = vi.fn((): AgentLoopMessage[] => []);
const saveStoredTranscriptMock = vi.fn();
const clearStoredTranscriptMock = vi.fn();

vi.mock("../../provider/providerModel", () => ({
  createProviderModel: createProviderModelMock,
}));

vi.mock("../../../runtime/tools/hostToolRouter", () => ({
  createWebAssistantHostToolRouter: createWebAssistantHostToolRouterMock,
  listWebAssistantToolDefinitions: listWebAssistantToolDefinitionsMock,
}));

vi.mock("../../../runtime/assistantIdentity", () => ({
  getWebAssistantIdentity: () => ({
    assistantInstanceId: "web-assistant-test",
    sessionId: "session-test",
    persistenceScope: "web-assistant-test::session.session-test",
    transcriptStorageKey: "transcript::web-assistant-test",
  }),
}));

vi.mock("../chatStorage", () => ({
  loadStoredTranscript: loadStoredTranscriptMock,
  saveStoredTranscript: saveStoredTranscriptMock,
  clearStoredTranscript: clearStoredTranscriptMock,
}));

vi.mock("../chatDebugLog", () => ({
  appendChatDebugLog: appendChatDebugLogMock,
  installChatDebugWindowHandle: installChatDebugWindowHandleMock,
  logChatError: logChatErrorMock,
}));

vi.mock("@dawnchat/host-orchestration-sdk/vercel-ai", () => ({
  createVercelAiAgentLoopModelAdapter: vi.fn(() => ({ runTurn: vi.fn() })),
}));

vi.mock("@dawnchat/host-orchestration-sdk/agent-loop", () => ({
  createAgentLoopRunner: vi.fn(() => ({
    run: async (input: {
      messages: Array<{ role: string; content: unknown }>;
      onEvent?: (event: unknown) => Promise<void> | void;
    }) => {
      await input.onEvent?.({
        type: "assistant_text_started",
        message: {
          role: "assistant",
          content: "running",
        },
      });
      await input.onEvent?.({
        type: "assistant_message_completed",
        message: {
          role: "assistant",
          content: "done",
        },
      });
      return {
        transcript: [
          ...input.messages,
          {
            role: "assistant",
            content: "done",
          },
        ],
        output: {
          ok: true,
          result: "done",
        },
        iterations: 1,
        stopReason: "assistant_response",
      };
    },
  })),
}));

describe("useAssistantChat (web shell, mocked storage)", () => {
  beforeEach(() => {
    createProviderModelMock.mockClear();
    createWebAssistantHostToolRouterMock.mockClear();
    listWebAssistantToolDefinitionsMock.mockClear();
    appendChatDebugLogMock.mockClear();
    installChatDebugWindowHandleMock.mockClear();
    logChatErrorMock.mockClear();
    loadStoredTranscriptMock.mockReset();
    loadStoredTranscriptMock.mockReturnValue([]);
    saveStoredTranscriptMock.mockClear();
    clearStoredTranscriptMock.mockClear();
  });

  it("hydrates transcript, submits prompts, and clears conversation through the web shell", async () => {
    loadStoredTranscriptMock.mockReturnValue([
      {
        role: "user",
        content: "existing",
      },
    ]);

    const scope = effectScope();
    const api = scope.run(async () => {
      const { useAssistantChat } = await import("../useAssistantChat");
      return useAssistantChat();
    });
    if (!api) {
      throw new Error("useAssistantChat scope failed");
    }
    const chat = await api;

    await Promise.resolve();
    await nextTick();

    expect(installChatDebugWindowHandleMock).toHaveBeenCalled();
    expect(chat.transcript.value).toEqual([
      {
        role: "user",
        content: "existing",
      },
    ]);

    chat.prompt.value = "hello world";
    await nextTick();
    await chat.submitPrompt({
      schemaVersion: 1,
      provider: "openai",
      modelId: "gpt-test",
      apiKey: "secret",
      baseURL: "",
      providerOptions: {},
      headers: {},
    });

    expect(createProviderModelMock).toHaveBeenCalled();
    expect(createWebAssistantHostToolRouterMock).toHaveBeenCalled();
    expect(chat.prompt.value).toBe("");
    expect(chat.isRunning.value).toBe(false);
    expect(chat.errorMessage.value).toBe("");
    expect(chat.lastStopReason.value).toBe("assistant_response");
    expect(chat.transcript.value).toEqual([
      {
        role: "user",
        content: "existing",
      },
      {
        role: "user",
        content: "hello world",
      },
      {
        role: "assistant",
        content: "done",
      },
    ]);
    expect(saveStoredTranscriptMock).toHaveBeenCalled();

    await chat.clearConversation();
    expect(chat.transcript.value).toEqual([]);
    expect(clearStoredTranscriptMock).toHaveBeenCalled();

    scope.stop();
  });
});
