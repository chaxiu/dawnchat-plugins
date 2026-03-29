import { jsonResponse } from "../http/response";
import { buildEchoTool, type McpToolDefinition, type McpToolHandler } from "./tools/echo";

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

interface ToolRegistry {
  tools: McpToolDefinition[];
  handlers: Record<string, McpToolHandler>;
}

function buildToolRegistry(pluginId: string): ToolRegistry {
  const { tool, handler } = buildEchoTool(pluginId);
  return {
    tools: [tool],
    handlers: {
      [tool.name]: handler,
    },
  };
}

function jsonrpcResult(id: JsonRpcRequest["id"], result: Record<string, unknown>): Response {
  return jsonResponse({
    jsonrpc: "2.0",
    id: id ?? null,
    result,
  });
}

function jsonrpcError(id: JsonRpcRequest["id"], code: number, message: string): Response {
  return jsonResponse({
    jsonrpc: "2.0",
    id: id ?? null,
    error: {
      code,
      message,
    },
  });
}

export async function handleMcpRoute(pluginId: string, request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ status: "error", message: "Method Not Allowed" }, 405);
  }
  let body: JsonRpcRequest;
  try {
    body = (await request.json()) as JsonRpcRequest;
  } catch {
    return jsonrpcError(null, -32700, "Parse error");
  }
  const method = String(body?.method || "");
  const requestId = body?.id ?? null;
  const registry = buildToolRegistry(pluginId);

  if (method === "initialize") {
    return jsonrpcResult(requestId, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: {
        name: "desktop-ai-assistant-bun-mcp",
        version: "0.1.0",
      },
    });
  }
  if (method === "tools/list") {
    return jsonrpcResult(requestId, { tools: registry.tools });
  }
  if (method === "tools/call") {
    const params = (body?.params || {}) as Record<string, unknown>;
    const toolName = String(params.name || "");
    const args = (params.arguments || {}) as Record<string, unknown>;
    const handler = registry.handlers[toolName];
    if (!handler) {
      return jsonrpcError(requestId, -32602, `Unknown tool: ${toolName}`);
    }
    try {
      const callResult = await handler(args);
      return jsonrpcResult(requestId, callResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tool call failed";
      return jsonrpcError(requestId, -32603, message);
    }
  }
  return jsonrpcError(requestId, -32601, `Method not found: ${method}`);
}
