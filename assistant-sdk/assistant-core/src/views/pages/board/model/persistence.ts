import type {
  ViewPersistenceConfig,
  ViewPersistenceStateSnapshot,
} from "../../../../runtime/view/manifest";
import {
  cloneBoardResource,
  normalizeBoardResource,
} from "./resource";

export const boardMainPersistence: ViewPersistenceConfig = {
  version: 1,
  debounce_ms: 180,
  serialize: (snapshot: ViewPersistenceStateSnapshot) => ({
    resource: cloneBoardResource(snapshot.resource),
    active_anchor: snapshot.activeAnchor || "",
  }),
  deserialize: (payload) => {
    const rawResource = payload.resource && typeof payload.resource === "object" && !Array.isArray(payload.resource)
      ? payload.resource as Record<string, unknown>
      : {};
    return {
      resource: normalizeBoardResource(rawResource),
      activeAnchor: typeof payload.active_anchor === "string" ? payload.active_anchor.trim() : "",
    };
  },
};
