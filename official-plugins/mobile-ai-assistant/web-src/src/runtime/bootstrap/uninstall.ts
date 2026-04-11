import { uninstallAssistantRuntimeEnvironment } from "@dawnchat/assistant-core";
import { useGuideState } from "@dawnchat/assistant-core/guide";
import { useSessionVisualState } from "@dawnchat/assistant-core/session";
import { useViewState } from "@dawnchat/assistant-core/view";

import { unregisterCapabilities } from "../capabilities";
import { uninstallRuntimeEventEmitter } from "../runtimeEventBridge";

import {
  getPersistenceRuntimeHandle,
  setPersistenceRuntimeHandle,
  setRuntimeCapabilityRegistrations,
  setMobileAssistantIdentityHandle,
} from "./runtimeHandles";

export function uninstallAssistantRuntimeCapabilities(names: string[]) {
  const persistenceRuntime = getPersistenceRuntimeHandle();
  void persistenceRuntime?.flushActiveView();
  persistenceRuntime?.dispose();
  setPersistenceRuntimeHandle(null);
  setRuntimeCapabilityRegistrations([]);
  setMobileAssistantIdentityHandle(null);
  useSessionVisualState().setSessionIdle();
  useGuideState().setCardDismissObserver(null);
  useGuideState().resetGuideState();
  uninstallAssistantRuntimeEnvironment();
  useViewState().clearViewState();
  uninstallRuntimeEventEmitter();
  unregisterCapabilities(names);
}
