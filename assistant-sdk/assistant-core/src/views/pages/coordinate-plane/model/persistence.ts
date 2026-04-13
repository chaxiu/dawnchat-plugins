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
  serialize: (snapshot: ViewPersistenceStateSnapshot) => ({
    state_binding: cloneCoordinatePlaneResource(snapshot.state_binding),
    active_anchor: snapshot.activeAnchor || "",
  }),
  deserialize: (payload) => {
    const rawResource = payload.state_binding && typeof payload.state_binding === "object" && !Array.isArray(payload.state_binding)
      ? payload.state_binding as Record<string, unknown>
      : {};
    return {
      state_binding: normalizeCoordinatePlaneResource(rawResource),
      activeAnchor: typeof payload.active_anchor === "string" ? payload.active_anchor.trim() : "",
    };
  },
};
