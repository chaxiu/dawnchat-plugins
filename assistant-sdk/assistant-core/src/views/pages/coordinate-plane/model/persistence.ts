import type {
  ViewPersistenceConfig,
  ViewPersistenceStateSnapshot,
} from "../../../../runtime/view/manifest";
import {
  cloneCoordinatePlaneResource,
  normalizeCoordinatePlaneResource,
} from "./resource";

export const coordinatePlaneMainPersistence: ViewPersistenceConfig = {
  version: 1,
  debounce_ms: 120,
  getResourceKey: (resource) => {
    if (typeof resource.resource_id === "string" && resource.resource_id.trim()) {
      return resource.resource_id.trim();
    }
    return "plane:coordinate-lab";
  },
  serialize: (snapshot: ViewPersistenceStateSnapshot) => ({
    resource: cloneCoordinatePlaneResource(snapshot.resource),
    active_anchor: snapshot.activeAnchor || "",
  }),
  deserialize: (payload) => {
    const rawResource = payload.resource && typeof payload.resource === "object" && !Array.isArray(payload.resource)
      ? payload.resource as Record<string, unknown>
      : {};
    return {
      resource: normalizeCoordinatePlaneResource(rawResource),
      activeAnchor: typeof payload.active_anchor === "string" ? payload.active_anchor.trim() : "",
    };
  },
};
