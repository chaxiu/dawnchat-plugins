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
            },
          ],
          finishReason: "tool-calls",
        };
      }

      expect(messages.at(-1)).toEqual(expect.objectContaining({
        role: "tool",
      }));

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

