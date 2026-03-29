import { jsonResponse } from "../response";

export function handleInfoRoute(pluginId: string, hostPort: string): Response {
  return jsonResponse({
    status: "ok",
    plugin_id: pluginId,
    host_port: hostPort,
    runtime: "bun",
  });
}
