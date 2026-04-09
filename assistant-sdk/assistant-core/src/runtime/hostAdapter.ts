import type { AssistantRuntimeEventEnvelope } from "./events";

type HostBridgeResult = Record<string, unknown>;

export interface AssistantHostAdapter {
  navigateToRoute?: (routePath: string) => Promise<void> | void;
  // Backward-compatible alias. Prefer `navigateToRoute` for new hosts.
  navigateToView?: (routePath: string) => Promise<void> | void;
  postRuntimeEventToHost?: (event: AssistantRuntimeEventEnvelope) => boolean;
  voice?: {
    speak?: (payload: Record<string, unknown>) => Promise<HostBridgeResult> | HostBridgeResult;
    stop?: (payload: Record<string, unknown>) => Promise<HostBridgeResult> | HostBridgeResult;
    status?: (payload: Record<string, unknown>) => Promise<HostBridgeResult> | HostBridgeResult;
  };
}

let activeHostAdapter: AssistantHostAdapter | null = null;

export function installAssistantHostAdapter(adapter: AssistantHostAdapter | null) {
  activeHostAdapter = adapter || null;
}

export function uninstallAssistantHostAdapter() {
  activeHostAdapter = null;
}

export function getAssistantHostAdapter(): AssistantHostAdapter | null {
  return activeHostAdapter;
}

export function getAssistantRouteNavigator():
  | ((routePath: string) => Promise<void> | void)
  | null {
  const adapter = getAssistantHostAdapter();
  return adapter?.navigateToRoute || adapter?.navigateToView || null;
}
