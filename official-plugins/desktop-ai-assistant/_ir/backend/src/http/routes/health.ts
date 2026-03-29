import { jsonResponse } from "../response";

export function handleHealthRoute(pluginId: string): Response {
  return jsonResponse({ status: "ok", plugin_id: pluginId });
}
