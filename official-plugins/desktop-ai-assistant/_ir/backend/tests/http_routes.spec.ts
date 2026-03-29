import { describe, expect, it } from "bun:test";

import { createBackendFetch } from "../src/server";

const fetchHandler = createBackendFetch({
  pluginId: "com.dawnchat.desktop-ai-assistant",
  hostPort: "7820",
  webRoot: "/tmp/non-exist",
});

describe("backend routes", () => {
  it("returns health payload", async () => {
    const response = await fetchHandler(new Request("http://127.0.0.1/health"));
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload).toEqual({
      status: "ok",
      plugin_id: "com.dawnchat.desktop-ai-assistant",
    });
  });

  it("returns info payload", async () => {
    const response = await fetchHandler(new Request("http://127.0.0.1/api/info"));
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload).toEqual({
      status: "ok",
      plugin_id: "com.dawnchat.desktop-ai-assistant",
      host_port: "7820",
      runtime: "bun",
    });
  });

  it("returns greeting payload", async () => {
    const response = await fetchHandler(new Request("http://127.0.0.1/api/hello?name=Dawn"));
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.greeting).toBe("Hello, Dawn!");
  });

  it("returns mcp tools list", async () => {
    const response = await fetchHandler(
      new Request("http://127.0.0.1/mcp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "tools-list-1",
          method: "tools/list",
        }),
      })
    );
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.result.tools[0].name).toBe("assistant.backend.echo");
  });

  it("returns mcp tool call result", async () => {
    const response = await fetchHandler(
      new Request("http://127.0.0.1/mcp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "tools-call-1",
          method: "tools/call",
          params: {
            name: "assistant.backend.echo",
            arguments: { message: "ping" },
          },
        }),
      })
    );
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.result.content[0].text).toBe("ping");
    expect(payload.result.meta.plugin_id).toBe("com.dawnchat.desktop-ai-assistant");
  });

  it("returns not found for unsupported endpoint", async () => {
    const response = await fetchHandler(new Request("http://127.0.0.1/unknown", { method: "POST" }));
    const payload = await response.json();
    expect(response.status).toBe(404);
    expect(payload).toEqual({
      status: "error",
      message: "Not Found",
    });
  });
});
