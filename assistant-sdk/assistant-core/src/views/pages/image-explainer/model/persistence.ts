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
    state_binding: cloneImageExplainerResource(snapshot.state_binding),
    active_anchor: snapshot.activeAnchor || "",
  }),
  deserialize: (payload) => {
    const rawResource = payload.state_binding && typeof payload.state_binding === "object" && !Array.isArray(payload.state_binding)
      ? payload.state_binding as Record<string, unknown>
      : {};
    return {
      state_binding: normalizeImageExplainerResource(rawResource),
      activeAnchor: typeof payload.active_anchor === "string" ? payload.active_anchor.trim() : "",
    };
  },
};
