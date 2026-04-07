import type {
  ViewPersistenceConfig,
  ViewPersistenceStateSnapshot,
} from "../../../../runtime/view/manifest";
import {
  cloneMusicResource,
  normalizeMusicResource,
} from "./resource";

export const musicMainPersistence: ViewPersistenceConfig = {
  version: 1,
  debounce_ms: 140,
  getResourceKey: (resource) => {
    if (typeof resource.resource_id === "string" && resource.resource_id.trim()) {
      return resource.resource_id.trim();
    }
    return "music:piano-demo";
  },
  serialize: (snapshot: ViewPersistenceStateSnapshot) => ({
    resource: cloneMusicResource(snapshot.resource),
    active_anchor: snapshot.activeAnchor || "",
  }),
  deserialize: (payload) => {
    const rawResource = payload.resource && typeof payload.resource === "object" && !Array.isArray(payload.resource)
      ? payload.resource as Record<string, unknown>
      : {};
    return {
      resource: normalizeMusicResource(rawResource),
      activeAnchor: typeof payload.active_anchor === "string" ? payload.active_anchor.trim() : "",
    };
  },
};

