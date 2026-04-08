import { unregisterCapabilities } from "../capabilities";
import { uninstallAssistantRuntimeEnvironment } from "@dawnchat/assistant-core";
import { useGuideState } from "@dawnchat/assistant-core/runtime/guide/state";
import { uninstallRuntimeEventEmitter } from "../runtimeEventBridge";
import { useSessionVisualState } from "@dawnchat/assistant-core/runtime/session/visualState";
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
  uninstallAssistantRuntimeEnvironment();
  useViewState().clearViewState();
  uninstallRuntimeEventEmitter();
  unregisterCapabilities(names);
}
