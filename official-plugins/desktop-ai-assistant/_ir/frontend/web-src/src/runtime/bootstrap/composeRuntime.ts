import { composeAssistantCoreRuntime, type AssistantHostAdapter } from "@dawnchat/assistant-core";
import { router } from "../../router";
import { createDesktopHostVoiceAdapter } from "../hostVoiceBridge";
import { postDesktopRuntimeEventToHost } from "../runtimeEventBridge";
import { createDesktopHostTaskStore } from "../task/createDesktopHostTaskStore";
import { createDesktopViewRegistryProvider } from "../view/registry";

export function composeDesktopAssistantRuntime() {
  const hostAdapter: AssistantHostAdapter = {
    navigateToRoute: async (routePath) => {
      await router.push(routePath);
    },
    postRuntimeEventToHost: postDesktopRuntimeEventToHost,
    voice: createDesktopHostVoiceAdapter(),
  };
  return composeAssistantCoreRuntime({
    workspaceSnapshotOnSessionEnd: true,
    taskStore: createDesktopHostTaskStore(),
    environment: {
      hostAdapter,
      viewRegistryProvider: createDesktopViewRegistryProvider(),
    },
  });
}
