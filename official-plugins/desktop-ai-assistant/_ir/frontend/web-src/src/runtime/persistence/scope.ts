function sanitizeScopePart(raw: string): string {
  const value = raw.trim().toLowerCase();
  if (!value) {
    return "";
  }
  return value.replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export function getAssistantPersistenceScope(): string {
  if (typeof window === "undefined" || !window.location) {
    return "default";
  }

  const url = new URL(window.location.href);
  const explicitPluginId = sanitizeScopePart(
    url.searchParams.get("plugin_id")
    || url.searchParams.get("pluginId")
    || ""
  );
  if (explicitPluginId) {
    return explicitPluginId;
  }

  const pathScope = sanitizeScopePart(url.pathname);
  if (pathScope) {
    return pathScope;
  }

  const hostScope = sanitizeScopePart(url.host);
  return hostScope || "default";
}

