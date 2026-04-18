import { unregisterCapabilities } from "../capabilities";
import { uninstallAssistantRuntimeEnvironment } from "@dawnchat/assistant-core";
import { useGuideState } from "@dawnchat/assistant-core/guide";
import { uninstallRuntimeEventEmitter } from "../runtimeEventBridge";
import { useSessionVisualState } from "@dawnchat/assistant-core/session";
import { useViewState } from "../view";
import {
  getPersistenceRuntimeHandle,
  setPersistenceRuntimeHandle,
  setTaskRuntimeHandle,
} from "./runtimeHandles";

export function uninstallAssistantRuntimeCapabilities(names: string[]) {
  const persistenceRuntime = getPersistenceRuntimeHandle();
  void persistenceRuntime?.flushActiveView();
  persistenceRuntime?.dispose();
  setPersistenceRuntimeHandle(null);
  setTaskRuntimeHandle(null);
  useSessionVisualState().setSessionIdle();
  useGuideState().setCardDismissObserver(null);
  useGuideState().resetGuideState();
  uninstallAssistantRuntimeEnvironment();
  useViewState().clearViewState();
  uninstallRuntimeEventEmitter();
  unregisterCapabilities(names);
}
