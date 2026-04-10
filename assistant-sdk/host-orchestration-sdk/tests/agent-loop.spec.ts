import { describe, expect, it, vi } from "vitest";

import { createAgentLoopRunner } from "../src/agent-loop";
import { createHostToolRouter } from "../src/tool-router";
import { createVercelAiAgentLoopModelAdapter } from "../src/vercel-ai";

describe("agent-loop", () => {
  it("runs a minimal loop with the Vercel adapter", async () => {
    const generateTextImpl = vi.fn(async (input: Record<string, unknown>) => {
      const messages = Array.isArray(input.messages) ? input.messages : [];
      if (messages.length === 1) {
        return {
          text: "Let me calculate that.",
          toolCalls: [
            {
              toolCallId: "call-1",
              toolName: "math.add",
              input: {
                a: 1,
                b: 2,
              },
              thought_signature: "sig-123",
            },
          ],
          finishReason: "tool-calls",
        };
      }

      expect(messages.at(1)).toEqual({
        role: "assistant",
        content: [
          {
            type: "text",
            text: "Let me calculate that.",
          },
          {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "math.add",
            input: {
              a: 1,
              b: 2,
            },
            thought_signature: "sig-123",
            thoughtSignature: "sig-123",
          },
        ],
      });
      expect(messages.at(-1)).toEqual(expect.objectContaining({
        role: "tool",
      }));
      expect(messages.at(-1)).toEqual({
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "call-1",
            toolName: "math.add",
            output: {
              type: "json",
              value: {
                result: 3,
              },
            },
          },
        ],
      });

      return {
        text: "The answer is 3.",
        finishReason: "stop",
      };
    });

    const model = createVercelAiAgentLoopModelAdapter({
      model: { provider: "test" },
      generateTextImpl,
    });

    const toolRouter = createHostToolRouter({})
      .registerFunction("math.add", (request) => {
        const left = Number(request.payload.a || 0);
        const right = Number(request.payload.b || 0);
        return {
          result: left + right,
        };
      });

    const runner = createAgentLoopRunner({
      model,
      toolRouter,
    });

    const result = await runner.run({
      messages: [
        {
          role: "user",
          content: "What is 1 + 2?",
        },
      ],
      tools: [
        {
          name: "math.add",
          description: "Add two numbers",
          inputSchema: {
            type: "object",
          },
        },
      ],
    });

    expect(generateTextImpl).toHaveBeenCalledTimes(2);
    expect(result.output).toEqual({
      ok: true,
      content: "The answer is 3.",
    });
    expect(result.transcript[1]).toEqual(expect.objectContaining({
      role: "assistant",
      toolCalls: [
        expect.objectContaining({
          id: "call-1",
          name: "math.add",
          thought_signature: "sig-123",
        }),
      ],
    }));
    expect(result.transcript[2]).toEqual(expect.objectContaining({
      role: "tool",
      name: "math.add",
      toolCallId: "call-1",
      content: {
        result: 3,
      },
    }));
  });

  it("replays raw assistant model messages when provided by SDK response", async () => {
    const generateTextImpl = vi.fn(async (input: Record<string, unknown>) => {
      const messages = Array.isArray(input.messages) ? input.messages : [];
      if (messages.length === 1) {
        return {
          text: "",
          toolCalls: [
            {
              toolCallId: "call-raw-1",
              toolName: "math.add",
              input: { a: 2, b: 4 },
              thought_signature: "sig-raw-1",
            },
          ],
          response: {
            messages: [
              {
                role: "assistant",
                content: [
                  { type: "text", text: "Let me use a tool." },
                  {
                    type: "tool-call",
                    toolCallId: "call-raw-1",
                    toolName: "math.add",
                    input: { a: 2, b: 4 },
                    thought_signature: "sig-raw-1",
                    thoughtSignature: "sig-raw-1",
                  },
                ],
              },
            ],
          },
          finishReason: "tool-calls",
        };
      }

      expect(messages.at(1)).toEqual({
        role: "assistant",
        content: [
          { type: "text", text: "Let me use a tool." },
          {
            type: "tool-call",
            toolCallId: "call-raw-1",
            toolName: "math.add",
            input: { a: 2, b: 4 },
            thought_signature: "sig-raw-1",
            thoughtSignature: "sig-raw-1",
          },
        ],
      });

      return {
        text: "Done.",
        finishReason: "stop",
      };
    });

    const model = createVercelAiAgentLoopModelAdapter({
      model: { provider: "test" },
      generateTextImpl,
    });

    const toolRouter = createHostToolRouter({})
      .registerFunction("math.add", (request) => {
        const left = Number(request.payload.a || 0);
        const right = Number(request.payload.b || 0);
        return { result: left + right };
      });

    const runner = createAgentLoopRunner({
      model,
      toolRouter,
    });

    const result = await runner.run({
      messages: [
        {
          role: "user",
          content: "What is 2 + 4?",
        },
      ],
      tools: [
        {
          name: "math.add",
          description: "Add two numbers",
          inputSchema: { type: "object" },
        },
      ],
    });

    expect(generateTextImpl).toHaveBeenCalledTimes(2);
    expect(result.output).toEqual({
      ok: true,
      content: "Done.",
    });
  });

  it("streams assistant deltas and tool lifecycle events", async () => {
    const streamTextImpl = vi.fn((input: Record<string, unknown>) => {
      const messages = Array.isArray(input.messages) ? input.messages : [];
      if (messages.length === 1) {
        return {
          fullStream: (async function* () {
            yield {
              type: "text-delta",
              textDelta: "Let me calculate that.",
            };
            yield {
              type: "tool-call",
              toolCallId: "call-stream-1",
              toolName: "math.add",
              input: {
                a: 3,
                b: 4,
              },
              thought_signature: "sig-stream-1",
            };
          })(),
          text: Promise.resolve("Let me calculate that."),
          finishReason: Promise.resolve("tool-calls"),
          toolCalls: Promise.resolve([
            {
              toolCallId: "call-stream-1",
              toolName: "math.add",
              input: {
                a: 3,
                b: 4,
              },
              thought_signature: "sig-stream-1",
            },
          ]),
          response: Promise.resolve({
            messages: [
              {
                role: "assistant",
                content: [
                  {
                    type: "text",
                    text: "Let me calculate that.",
                  },
                  {
                    type: "tool-call",
                    toolCallId: "call-stream-1",
                    toolName: "math.add",
                    input: {
                      a: 3,
                      b: 4,
                    },
                    thought_signature: "sig-stream-1",
                    thoughtSignature: "sig-stream-1",
                  },
                ],
              },
            ],
          }),
        };
      }

      return {
        fullStream: (async function* () {
          yield {
            type: "text-delta",
            textDelta: "The answer is 7.",
          };
        })(),
        text: Promise.resolve("The answer is 7."),
        finishReason: Promise.resolve("stop"),
        toolCalls: Promise.resolve([]),
        response: Promise.resolve({
          messages: [
            {
              role: "assistant",
              content: "The answer is 7.",
            },
          ],
        }),
      };
    });

    const events: Array<Record<string, unknown>> = [];
    const model = createVercelAiAgentLoopModelAdapter({
      model: { provider: "test" },
      streamTextImpl,
    });

    const toolRouter = createHostToolRouter({})
      .registerFunction("math.add", (request) => {
        const left = Number(request.payload.a || 0);
        const right = Number(request.payload.b || 0);
        return {
          ok: true,
          result: left + right,
        };
      });

    const runner = createAgentLoopRunner({
      model,
      toolRouter,
    });

    const result = await runner.run({
      messages: [
        {
          role: "user",
          content: "What is 3 + 4?",
        },
      ],
      tools: [
        {
          name: "math.add",
          description: "Add two numbers",
          inputSchema: {
            type: "object",
          },
        },
      ],
      onEvent(event) {
        events.push(event as Record<string, unknown>);
      },
    });

    expect(streamTextImpl).toHaveBeenCalledTimes(2);
    expect(events.map((event) => event.type)).toEqual([
      "assistant_text_started",
      "assistant_text_delta",
      "tool_call_started",
      "assistant_message_completed",
      "tool_result_received",
      "assistant_text_started",
      "assistant_text_delta",
      "assistant_message_completed",
      "run_completed",
    ]);
    expect(events.find((event) => event.type === "tool_result_received")).toEqual(
      expect.objectContaining({
        call: expect.objectContaining({
          id: "call-stream-1",
          name: "math.add",
        }),
        result: expect.objectContaining({
          ok: true,
          result: 7,
        }),
      })
    );
    expect(result.output).toEqual({
      ok: true,
      content: "The answer is 7.",
    });
  });

  it("returns iteration-limit errors when tool calls never finish", async () => {
    const runner = createAgentLoopRunner({
      maxIterations: 1,
      model: {
        async runTurn() {
          return {
            assistantMessage: {
              role: "assistant",
              content: "Still working",
            },
            toolCalls: [
              {
                id: "loop-1",
                name: "echo",
                input: {
                  text: "hello",
                },
              },
            ],
          };
        },
      },
      toolRouter: createHostToolRouter({})
        .registerFunction("echo", (request) => ({
          echoed: request.payload.text,
        })),
    });

    const result = await runner.run({
      messages: [
        {
          role: "user",
          content: "loop forever",
        },
      ],
    });

    expect(result.output).toEqual(expect.objectContaining({
      ok: false,
      error_code: "agent_loop_iteration_limit",
    }));
    expect(result.stopReason).toBe("max_iterations");
  });

  it("keeps an explicit external-loop slot without implementing it yet", async () => {
    const runner = createAgentLoopRunner({
      executionMode: "external_loop",
    });

    const result = await runner.run({
      messages: [
        {
          role: "user",
          content: "hello",
        },
      ],
    });

    expect(result.output).toEqual(expect.objectContaining({
      ok: false,
      error_code: "agent_loop_external_runner_missing",
    }));
    expect(result.stopReason).toBe("external_runner_missing");
  });
});

