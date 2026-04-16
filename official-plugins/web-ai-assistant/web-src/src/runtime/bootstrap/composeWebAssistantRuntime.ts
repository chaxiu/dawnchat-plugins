import { composeAssistantCoreRuntime, type AssistantHostAdapter } from "@dawnchat/assistant-core";

import { router } from "../../router";
import { getWebAssistantIdentity } from "../assistantIdentity";
import { postWebRuntimeEventToHost } from "../runtimeEventBridge";
import { webAssistantViewRegistryProvider } from "../viewRegistry";

function isInternalAssistantRoute(routePath: string): boolean {
  return (
    routePath === "/" ||
    routePath === "/views" ||
    routePath.startsWith("/views/")
  );
}

export function composeWebAssistantRuntime() {
  const identity = getWebAssistantIdentity();
  const hostAdapter: AssistantHostAdapter = {
    navigateToRoute: async (routePath) => {
      if (!isInternalAssistantRoute(routePath)) {
        return;
      }
      await router.push(routePath);
    },
    postRuntimeEventToHost: postWebRuntimeEventToHost,
  };

  return {
    ...composeAssistantCoreRuntime({
      persistenceScope: identity.persistenceScope,
      environment: {
        hostAdapter,
        viewRegistryProvider: webAssistantViewRegistryProvider,
      },
    }),
    identity,
  };
}
