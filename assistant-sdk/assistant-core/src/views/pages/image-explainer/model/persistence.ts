import type {
  ViewPersistenceConfig,
  ViewPersistenceStateSnapshot,
} from "../../../../runtime/view/manifest";
import {
  cloneImageExplainerResource,
  normalizeImageExplainerResource,
} from "./resource";

export const imageExplainerMainPersistence: ViewPersistenceConfig = {
  version: 1,
  debounce_ms: 120,
  serialize: (snapshot: ViewPersistenceStateSnapshot) => ({
    resource: cloneImageExplainerResource(snapshot.resource),
    active_anchor: snapshot.activeAnchor || "",
  }),
  deserialize: (payload) => {
    const rawResource = payload.resource && typeof payload.resource === "object" && !Array.isArray(payload.resource)
      ? payload.resource as Record<string, unknown>
      : {};
    return {
      resource: normalizeImageExplainerResource(rawResource),
      activeAnchor: typeof payload.active_anchor === "string" ? payload.active_anchor.trim() : "",
    };
  },
};
