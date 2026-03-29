import { dirname, join } from "node:path";

import { createBackendFetch } from "../src/server";

const host = process.env.DAWNCHAT_PLUGIN_BIND_HOST || process.env.HOST || "127.0.0.1";
const port = Number(process.env.DAWNCHAT_PLUGIN_PORT || process.env.PORT || "8080");
const pluginId = process.env.DAWNCHAT_PLUGIN_ID || "com.dawnchat.desktop-ai-assistant";
const hostPort = process.env.DAWNCHAT_HOST_PORT || "";
const sourceRoot = process.env.DAWNCHAT_PLUGIN_SOURCE_DIR || dirname(dirname(dirname(dirname(import.meta.path))));
const webRoot = join(sourceRoot, "frontend", "web");

const server = Bun.serve({
  hostname: host,
  port,
  fetch: createBackendFetch({ pluginId, hostPort, webRoot }),
});

console.error(JSON.stringify({ status: "ready", runtime: "bun", port: server.port }));
