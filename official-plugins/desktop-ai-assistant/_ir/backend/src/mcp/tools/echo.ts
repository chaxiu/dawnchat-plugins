export interface McpToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export type McpToolHandler = (args: Record<string, unknown>) => Promise<Record<string, unknown>>;

export function buildEchoTool(pluginId: string): {
  tool: McpToolDefinition;
  handler: McpToolHandler;
} {
  const tool: McpToolDefinition = {
    name: "assistant.backend.echo",
    title: "Backend Echo",
    description: "Echo payload from Bun backend MCP",
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string" },
      },
      required: ["message"],
    },
  };

  const handler: McpToolHandler = async (args) => {
    const message = String(args.message ?? "").trim();
    return {
      content: [
        {
          type: "text",
          text: message || "empty",
        },
      ],
      meta: {
        plugin_id: pluginId,
        runtime: "bun",
      },
    };
  };

  return { tool, handler };
}
