import { composeAssistantCoreRuntime, type AssistantHostAdapter } from "@dawnchat/assistant-core";

import { router } from "../../router";
import { postWebRuntimeEventToHost } from "../runtimeEventBridge";

export function composeWebAssistantRuntime() {
  const hostAdapter: AssistantHostAdapter = {
    navigateToRoute: async (routePath) => {
      await router.push(routePath);
    },
    postRuntimeEventToHost: postWebRuntimeEventToHost,
  };

  return composeAssistantCoreRuntime({
    environment: {
      hostAdapter,
    },
  });
}
