import { createHostToolRouter } from "@dawnchat/host-orchestration-sdk/tool-router";
import type { AgentLoopToolDefinition } from "@dawnchat/host-orchestration-sdk/agent-loop";

export const WEB_ASSISTANT_TOOL_DEFINITIONS: AgentLoopToolDefinition[] = [
  {
    name: "math.add",
    description: "Add two numbers together and return a numeric result.",
    inputSchema: {
      type: "object",
      properties: {
        a: { type: "number", description: "Left operand" },
        b: { type: "number", description: "Right operand" },
      },
      required: ["a", "b"],
      additionalProperties: false,
    },
  },
  {
    name: "dawnchat.host_info",
    description: "Read host-level information about the current web preview environment.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
];

export function createWebAssistantHostToolRouter() {
  return createHostToolRouter({})
    .registerFunction("math.add", async (request) => {
      const left = Number(request.payload.a || 0);
      const right = Number(request.payload.b || 0);

      return {
        ok: true,
        result: left + right,
      };
    })
    .register({
      functionName: "dawnchat.host_info",
      executionMode: "remote_route",
      backend: {
        mode: "remote_route",
        invoke: async () => {
          const language = typeof navigator !== "undefined" ? navigator.language : "unknown";
          const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "unknown";

          return {
            ok: true,
            host: "web-preview",
            language,
            user_agent: userAgent,
          };
        },
      },
    });
}
