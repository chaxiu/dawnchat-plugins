export { DexieViewPersistenceAdapter } from "./dexieAdapter";
export { createNoopViewPersistenceAdapter } from "./noopAdapter";
export { createViewPersistenceRuntime, type ViewPersistenceRuntimeDeps } from "./runtime";
export { getAssistantPersistenceScope } from "./scope";
export type { PersistedViewStateRecord, ViewPersistenceAdapter } from "./types";

import { DexieViewPersistenceAdapter } from "./dexieAdapter";
import { getAssistantPersistenceScope } from "./scope";
import type { ViewPersistenceAdapter } from "./types";

export function createDefaultBrowserViewPersistenceAdapter(
  scope = getAssistantPersistenceScope()
): ViewPersistenceAdapter {
  return new DexieViewPersistenceAdapter(`dawnchat_assistant_view_persistence::${scope}`);
}
