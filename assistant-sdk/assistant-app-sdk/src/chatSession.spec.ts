import { describe, expect, it, vi } from "vitest";

import type {
  AgentLoopMessage,
  AgentLoopRunner,
} from "@dawnchat/host-orchestration-sdk/agent-loop";

import {
  applyAgentLoopStreamEvent,
  createAssistantChatSession,
} from "./chatSession";

describe("applyAgentLoopStreamEvent", () => {
  it("advances assistant and tool streaming transcript state", () => {
    const started = applyAgentLoopStreamEvent(
      {
        type: "assistant_text_started",
        message: {
          role: "assistant",
          content: "hello",
        },
      },
      {
        streamingTranscript: [],
        activeAssistantIndex: -1,
      }
    );

    expect(started.streamingTranscript).toEqual([
      {
        role: "assistant",
        content: "hello",
      },
    ]);
    expect(started.activeAssistantIndex).toBe(0);

    const toolStarted = applyAgentLoopStreamEvent(
      {
        type: "tool_call_started",
        call: {
          id: "call-1",
          name: "math.add",
          input: { a: 1, b: 2 },
        },
        message: {
          role: "assistant",
          content: "working",
          toolCalls: [
            {
              id: "call-1",
              name: "math.add",
              input: { a: 1, b: 2 },
            },
          ],
        },
      },
      started
    );

    expect(toolStarted.streamingTranscript[0]).toEqual({
      role: "assistant",
      content: "working",
      toolCalls: [
        {
          id: "call-1",
          name: "math.add",
          input: { a: 1, b: 2 },
        },
      ],
    });

    const resultReceived = applyAgentLoopStreamEvent(
      {
        type: "tool_result_received",
        call: {
          id: "call-1",
          name: "math.add",
          input: { a: 1, b: 2 },
        },
        result: {
          ok: true,
          result: 3,
        },
      },
      toolStarted
    );

    expect(resultReceived.streamingTranscript[1]).toEqual({
      role: "tool",
      name: "math.add",
      toolCallId: "call-1",
      content: {
        ok: true,
        result: 3,
      },
    });
  });
});

describe("createAssistantChatSession", () => {
  it("hydrates persisted transcript and runs one prompt successfully", async () => {
    const savedTranscripts: AgentLoopMessage[][] = [];
    const clearTranscriptMock = vi.fn();
    const runner: AgentLoopRunner = {
      async run(input) {
        await input.onEvent?.({
          type: "assistant_text_started",
          message: {
            role: "assistant",
            content: "thinking",
          },
        });
        await input.onEvent?.({
          type: "tool_call_started",
          call: {
            id: "call-1",
            name: "math.add",
            input: { a: 2, b: 3 },
          },
          message: {
            role: "assistant",
            content: "thinking",
            toolCalls: [
              {
                id: "call-1",
                name: "math.add",
                input: { a: 2, b: 3 },
              },
            ],
          },
        });
        await input.onEvent?.({
          type: "tool_result_received",
          call: {
            id: "call-1",
            name: "math.add",
            input: { a: 2, b: 3 },
          },
          result: {
            ok: true,
            result: 5,
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
            result: 5,
          },
          iterations: 1,
          stopReason: "assistant_response",
        };
      },
    };

    const session = createAssistantChatSession({
      systemPrompt: "Test system prompt",
      transcriptStore: {
        loadTranscript: () => [
          {
            role: "user",
            content: "existing",
          },
        ],
        saveTranscript: (transcript) => {
          savedTranscripts.push(transcript);
        },
        clearTranscript: clearTranscriptMock,
      },
      createRunContext: () => ({
        runner,
        tools: [
          {
            name: "math.add",
          },
        ],
      }),
    });

    await session.hydrate();
    expect(session.getSnapshot().transcript).toEqual([
      {
        role: "user",
        content: "existing",
      },
    ]);

    session.setPrompt("2 + 3");
    await session.submitPrompt({
      provider: "openai",
      modelId: "gpt-test",
      apiKey: "secret",
    });

    const snapshot = session.getSnapshot();
    expect(snapshot.prompt).toBe("");
    expect(snapshot.isRunning).toBe(false);
    expect(snapshot.errorMessage).toBe("");
    expect(snapshot.lastStopReason).toBe("assistant_response");
    expect(snapshot.streamingTranscript).toEqual([]);
    expect(snapshot.transcript).toEqual([
      {
        role: "user",
        content: "existing",
      },
      {
        role: "user",
        content: "2 + 3",
      },
      {
        role: "assistant",
        content: "done",
      },
    ]);
    expect(savedTranscripts.at(-1)).toEqual(snapshot.transcript);
    expect(clearTranscriptMock).not.toHaveBeenCalled();
  });

  it("sets validation error without starting the run", async () => {
    const createRunContextMock = vi.fn();
    const session = createAssistantChatSession({
      systemPrompt: "Test",
      validateConfig: () => "config invalid",
      createRunContext: createRunContextMock,
    });

    session.setPrompt("hello");
    await session.submitPrompt({
      provider: "openai",
      modelId: "",
      apiKey: "",
    });

    expect(session.getSnapshot().errorMessage).toBe("config invalid");
    expect(createRunContextMock).not.toHaveBeenCalled();
  });

  it("captures runner failures and clears conversation", async () => {
    const clearTranscriptMock = vi.fn();
    const logErrorMock = vi.fn();
    const session = createAssistantChatSession({
      systemPrompt: "Test",
      transcriptStore: {
        loadTranscript: () => [],
        saveTranscript: () => undefined,
        clearTranscript: clearTranscriptMock,
      },
      logger: {
        log: () => undefined,
        logError: logErrorMock,
      },
      createRunContext: () => ({
        runner: {
          async run() {
            throw new Error("runner failed");
          },
        },
        tools: [],
      }),
    });

    session.setPrompt("hello");
    await session.submitPrompt({
      provider: "openai",
      modelId: "gpt-test",
      apiKey: "secret",
    });

    expect(session.getSnapshot().errorMessage).toBe("runner failed");
    expect(logErrorMock).toHaveBeenCalled();

    await session.clearConversation();
    expect(session.getSnapshot()).toEqual(expect.objectContaining({
      prompt: "",
      transcript: [],
      errorMessage: "",
      lastStopReason: "",
      hasTranscript: false,
    }));
    expect(clearTranscriptMock).toHaveBeenCalled();
  });
});
