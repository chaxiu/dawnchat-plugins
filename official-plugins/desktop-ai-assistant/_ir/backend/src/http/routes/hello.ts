import { buildGreeting } from "../../../entry/assistant_runtime";
import { jsonResponse } from "../response";

export function handleHelloRoute(pluginId: string, url: URL): Response {
  const name = url.searchParams.get("name") || "";
  return jsonResponse({
    status: "ok",
    plugin_id: pluginId,
    greeting: buildGreeting(name),
  });
}
