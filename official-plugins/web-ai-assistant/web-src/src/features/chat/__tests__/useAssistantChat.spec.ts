import { describe, expect, it, beforeEach, vi } from "vitest";

import type { AssistantProviderConfig } from "../../provider/providerTypes";
import type { AgentLoopMessage } from "@dawnchat/host-orchestration-sdk/agent-loop";
import { useAssistantChat } from "../useAssistantChat";

const {
  createProviderModelMock,
  runMock,
  createAgentLoopRunnerMock,
  createVercelAdapterMock,
  createWebAssistantHostToolRouterMock,
  listWebAssistantToolDefinitionsMock,
} = vi.hoisted(() => {
  const runMock = vi.fn();
  return {
    createProviderModelMock: vi.fn(),
    runMock,
    createAgentLoopRunnerMock: vi.fn(() => ({
      run: runMock,
    })),
    createVercelAdapterMock: vi.fn(() => ({
      runTurn: vi.fn(),
    })),
    createWebAssistantHostToolRouterMock: vi.fn(() => ({
      invoke: vi.fn(),
    })),
    listWebAssistantToolDefinitionsMock: vi.fn(() => [
      {
        name: "math.add",
        description: "Add",
        inputSchema: {
          type: "object",
        },
      },
    ]),
  };
});

vi.mock("../../provider/providerModel", () => ({
  createProviderModel: createProviderModelMock,
}));

vi.mock("@dawnchat/host-orchestration-sdk/agent-loop", () => ({
  createAgentLoopRunner: createAgentLoopRunnerMock,
}));

vi.mock("@dawnchat/host-orchestration-sdk/vercel-ai", () => ({
  createVercelAiAgentLoopModelAdapter: createVercelAdapterMock,
}));

vi.mock("../../../runtime/tools/hostToolRouter", () => ({
  createWebAssistantHostToolRouter: createWebAssistantHostToolRouterMock,
  listWebAssistantToolDefinitions: listWebAssistantToolDefinitionsMock,
}));

vi.mock("../../../runtime/assistantIdentity", () => ({
  getWebAssistantIdentity: () => ({
    assistantInstanceId: "assistant-instance",
    sessionId: "session-1",
    persistenceScope: "assistant-instance::session.session-1",
    transcriptStorageKey: "dawnchat.web-ai-assistant.transcript.v1::assistant-instance",
  }),
}));

const validConfig: AssistantProviderConfig = {
  schemaVersion: 1,
  provider: "openai",
  modelId: "gpt-4.1-mini",
  apiKey: "secret",
  baseURL: "",
  providerOptions: {},
  headers: {},
};

describe("useAssistantChat", () => {
  beforeEach(() => {
    localStorage.clear();
    createProviderModelMock.mockReset();
    createProviderModelMock.mockReturnValue("mock-model");
    createAgentLoopRunnerMock.mockClear();
    createVercelAdapterMock.mockClear();
    createWebAssistantHostToolRouterMock.mockClear();
    listWebAssistantToolDefinitionsMock.mockClear();
    runMock.mockReset();
  });

  it("blocks submission when provider config is missing", async () => {
    const chat = useAssistantChat();
    chat.prompt.value = "hello";

    await chat.submitPrompt({
      ...validConfig,
      apiKey: "",
    });

    expect(chat.errorMessage.value).toBe("Please save a valid provider configuration first.");
    expect(createAgentLoopRunnerMock).not.toHaveBeenCalled();
  });

  it("updates transcript after a successful loop run", async () => {
    const chat = useAssistantChat();
    chat.prompt.value = "Use math.add for 2 + 3.";
    runMock.mockResolvedValue({
      transcript: [
        { role: "user", content: "Use math.add for 2 + 3." },
        {
          role: "assistant",
          content: "Calling tool",
          toolCalls: [{ id: "1", name: "math.add", input: { a: 2, b: 3 } }],
        },
        {
          role: "tool",
          name: "math.add",
          toolCallId: "1",
          content: { ok: true, result: 5 },
        },
        {
          role: "assistant",
          content: "The result is 5.",
        },
      ],
      output: {
        ok: true,
        content: "The result is 5.",
      },
      iterations: 2,
      stopReason: "assistant_response",
    });

    await chat.submitPrompt(validConfig);

    expect(createProviderModelMock).toHaveBeenCalledWith(validConfig);
    expect(createVercelAdapterMock).toHaveBeenCalledTimes(1);
    expect(createAgentLoopRunnerMock).toHaveBeenCalledTimes(1);
    expect(listWebAssistantToolDefinitionsMock).toHaveBeenCalledTimes(1);
    expect(chat.transcript.value).toHaveLength(4);
    expect(chat.prompt.value).toBe("");
    expect(chat.lastStopReason.value).toBe("assistant_response");
    expect(chat.errorMessage.value).toBe("");
    expect(JSON.parse(localStorage.getItem(
      "dawnchat.web-ai-assistant.transcript.v1::assistant-instance"
    ) || "[]")).toHaveLength(4);
  });

  it("shows streaming assistant state before the final transcript settles", async () => {
    const chat = useAssistantChat();
    chat.prompt.value = "Please add 3 and 4.";
    let streamingSnapshot: AgentLoopMessage[] = [];

    runMock.mockImplementation(async (input: {
      onEvent?: (event: Record<string, unknown>) => void;
    }) => {
      input.onEvent?.({
        type: "assistant_text_started",
        message: {
          role: "assistant",
          content: "",
        },
      });
      input.onEvent?.({
        type: "assistant_text_delta",
        delta: "Let me calculate that.",
        snapshot: "Let me calculate that.",
        message: {
          role: "assistant",
          content: "Let me calculate that.",
        },
      });
      input.onEvent?.({
        type: "tool_call_started",
        call: {
          id: "call-1",
          name: "math.add",
          input: { a: 3, b: 4 },
        },
        message: {
          role: "assistant",
          content: "Let me calculate that.",
          toolCalls: [{ id: "call-1", name: "math.add", input: { a: 3, b: 4 } }],
        },
      });
      streamingSnapshot = JSON.parse(JSON.stringify(chat.transcript.value)) as AgentLoopMessage[];
      return {
        transcript: [
          { role: "user", content: "Please add 3 and 4." },
          {
            role: "assistant",
            content: "Let me calculate that.",
            toolCalls: [{ id: "call-1", name: "math.add", input: { a: 3, b: 4 } }],
          },
          {
            role: "tool",
            name: "math.add",
            toolCallId: "call-1",
            content: { ok: true, result: 7 },
          },
          {
            role: "assistant",
            content: "The result is 7.",
          },
        ],
        output: {
          ok: true,
          content: "The result is 7.",
        },
        iterations: 2,
        stopReason: "assistant_response",
      };
    });

    await chat.submitPrompt(validConfig);

    expect(streamingSnapshot).toEqual([
      { role: "user", content: "Please add 3 and 4." },
      {
        role: "assistant",
        content: "Let me calculate that.",
        toolCalls: [{ id: "call-1", name: "math.add", input: { a: 3, b: 4 } }],
      },
    ]);
    expect(chat.transcript.value[chat.transcript.value.length - 1]).toEqual({
      role: "assistant",
      content: "The result is 7.",
    });
  });
});
