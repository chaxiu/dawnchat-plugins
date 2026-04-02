import { unregisterCapabilities } from "../capabilities";
import { useGuideState } from "../guide/state";
import { uninstallRuntimeEventEmitter } from "../runtimeEventBridge";
import { useSessionVisualState } from "../session/visualState";
import { useViewState } from "../view";

export function uninstallAssistantRuntimeCapabilities(names: string[]) {
  useSessionVisualState().setSessionIdle();
  useGuideState().resetGuideState();
  useViewState().clearViewState();
  uninstallRuntimeEventEmitter();
  unregisterCapabilities(names);
}
