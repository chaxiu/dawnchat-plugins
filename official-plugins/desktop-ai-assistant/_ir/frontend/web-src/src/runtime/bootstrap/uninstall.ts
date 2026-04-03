import { unregisterCapabilities } from "../capabilities";
import { useGuideState } from "../guide/state";
import { uninstallRuntimeEventEmitter } from "../runtimeEventBridge";
import { useSessionVisualState } from "../session/visualState";
import { useViewState } from "../view";
import { getPersistenceRuntimeHandle, setPersistenceRuntimeHandle } from "./runtimeHandles";

export function uninstallAssistantRuntimeCapabilities(names: string[]) {
  const persistenceRuntime = getPersistenceRuntimeHandle();
  void persistenceRuntime?.flushActiveView();
  persistenceRuntime?.dispose();
  setPersistenceRuntimeHandle(null);
  useSessionVisualState().setSessionIdle();
  useGuideState().setCardDismissObserver(null);
  useGuideState().resetGuideState();
  useViewState().clearViewState();
  uninstallRuntimeEventEmitter();
  unregisterCapabilities(names);
}
