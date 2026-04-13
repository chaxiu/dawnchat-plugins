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
  serialize: (snapshot: ViewPersistenceStateSnapshot) => ({
    state_binding: cloneMusicResource(snapshot.state_binding),
    active_anchor: snapshot.activeAnchor || "",
  }),
  deserialize: (payload) => {
    const rawResource = payload.state_binding && typeof payload.state_binding === "object" && !Array.isArray(payload.state_binding)
      ? payload.state_binding as Record<string, unknown>
      : {};
    return {
      state_binding: normalizeMusicResource(rawResource),
      activeAnchor: typeof payload.active_anchor === "string" ? payload.active_anchor.trim() : "",
    };
  },
};

