import { describe, expect, it, beforeEach, vi } from "vitest";

import type { AssistantProviderConfig } from "../../provider/providerTypes";
import { useAssistantChat } from "../useAssistantChat";

const {
  createProviderModelMock,
  runMock,
  createAgentLoopRunnerMock,
  createVercelAdapterMock,
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
    createProviderModelMock.mockReset();
    createProviderModelMock.mockReturnValue("mock-model");
    createAgentLoopRunnerMock.mockClear();
    createVercelAdapterMock.mockClear();
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
    expect(chat.transcript.value).toHaveLength(4);
    expect(chat.prompt.value).toBe("");
    expect(chat.lastStopReason.value).toBe("assistant_response");
    expect(chat.errorMessage.value).toBe("");
  });
});
