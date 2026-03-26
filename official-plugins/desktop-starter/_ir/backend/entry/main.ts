import { dirname, join, normalize } from "node:path";

const host = process.env.DAWNCHAT_PLUGIN_BIND_HOST || process.env.HOST || "127.0.0.1";
const port = Number(process.env.DAWNCHAT_PLUGIN_PORT || process.env.PORT || "8080");
const pluginId = process.env.DAWNCHAT_PLUGIN_ID || "com.dawnchat.desktop-starter";
const hostPort = process.env.DAWNCHAT_HOST_PORT || "";
const sourceRoot = process.env.DAWNCHAT_PLUGIN_SOURCE_DIR || dirname(dirname(dirname(dirname(import.meta.path))));
const webRoot = join(sourceRoot, "frontend", "web");
// @iwp.link system.md::n.2ecb

const defaultHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: defaultHeaders,
  });
}

function resolveStaticPath(requestPath: string): string {
  const candidate = requestPath === "/" ? "/index.html" : requestPath;
  const normalized = normalize(candidate).replace(/^(\.\.[/\\])+/, "");
  return join(webRoot, normalized);
}

const server = Bun.serve({
  hostname: host,
  port,
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === "/health") {
      return jsonResponse({ status: "ok", plugin_id: pluginId });
    }

    if (pathname === "/api/info") {
      return jsonResponse({
        status: "ok",
        plugin_id: pluginId,
        host_port: hostPort,
        runtime: "bun",
      });
    }

    if (pathname === "/api/hello" && request.method === "GET") {
      // @iwp.link logic/tools/hello_world.md::n.ab7e
      const name = (url.searchParams.get("name") || "World").trim() || "World";
      return jsonResponse({
        // @iwp.link logic/tools/hello_world.md::n.ed75
        status: "ok",
        greeting: `Hello, ${name}!`,
      });
    }

    if (request.method === "GET") {
      const file = Bun.file(resolveStaticPath(pathname));
      if (await file.exists()) {
        return new Response(file);
      }
      const indexFile = Bun.file(join(webRoot, "index.html"));
      if (await indexFile.exists()) {
        return new Response(indexFile, {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store",
          },
        });
      }
    }

    return jsonResponse(
      {
        status: "error",
        message: "Not Found",
      },
      404
    );
  },
});

console.error(JSON.stringify({ status: "ready", runtime: "bun", port: server.port }));
