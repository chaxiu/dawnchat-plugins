import { handleHealthRoute } from "./http/routes/health";
import { handleHelloRoute } from "./http/routes/hello";
import { handleInfoRoute } from "./http/routes/info";
import { jsonResponse } from "./http/response";
import { resolveStaticResponse } from "./http/static";
import { handleMcpRoute } from "./mcp/router";

export interface BackendServerContext {
  pluginId: string;
  hostPort: string;
  webRoot: string;
}

export function createBackendFetch(context: BackendServerContext) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === "/health") {
      return handleHealthRoute(context.pluginId);
    }

    if (pathname === "/api/info") {
      return handleInfoRoute(context.pluginId, context.hostPort);
    }

    if (pathname === "/api/hello" && request.method === "GET") {
      return handleHelloRoute(context.pluginId, url);
    }

    if (pathname === "/mcp") {
      return handleMcpRoute(context.pluginId, request);
    }

    if (request.method === "GET") {
      const staticResponse = await resolveStaticResponse(context.webRoot, pathname);
      if (staticResponse) {
        return staticResponse;
      }
    }

    return jsonResponse(
      {
        status: "error",
        message: "Not Found",
      },
      404
    );
  };
}
