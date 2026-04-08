import { composeAssistantCoreRuntime } from "@dawnchat/assistant-core/runtime/bootstrap/composeRuntime";
import type { AssistantHostAdapter } from "@dawnchat/assistant-core/runtime/hostAdapter";
import { router } from "../../router";
import { createDesktopHostVoiceAdapter } from "../hostVoiceBridge";
import { postDesktopRuntimeEventToHost } from "../runtimeEventBridge";
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
    environment: {
      hostAdapter,
      viewRegistryProvider: createDesktopViewRegistryProvider(),
    }
  });
}
