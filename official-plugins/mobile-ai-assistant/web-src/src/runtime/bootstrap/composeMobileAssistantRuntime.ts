import { composeAssistantCoreRuntime, type AssistantHostAdapter } from "@dawnchat/assistant-core";
import { ASSISTANT_LAUNCHER_ROUTE, listViewRegistrations } from "@dawnchat/assistant-core/view";

import { router } from "../../router";
import { ROUTE_PATHS } from "../../router/routes";
import { getMobileAssistantIdentity } from "../assistantIdentity";
import { postMobileRuntimeEventToHost } from "../runtimeEventBridge";
import {
  createDefaultMobileTtsEngine,
  createMobileHostVoiceAdapter,
  type MobileTtsEngine,
} from "../tts";
import { mobileAssistantViewRegistryProvider } from "../viewRegistry";

function stripQueryAndHash(path: string): string {
  let segment = path.trim();
  const hashIdx = segment.indexOf("#");
  if (hashIdx !== -1) {
    segment = segment.slice(hashIdx + 1);
  }
  const q = segment.indexOf("?");
  return q === -1 ? segment : segment.slice(0, q);
}

function normalizeNavPath(path: string): string {
  const trimmed = stripQueryAndHash(path);
  if (trimmed.length > 1 && trimmed.endsWith("/")) {
    return trimmed.slice(0, -1);
  }
  return trimmed;
}

let cachedAllowedNavPaths: Set<string> | null = null;

function getAllowedNavPathSet(): Set<string> {
  if (cachedAllowedNavPaths) {
    return cachedAllowedNavPaths;
  }
  const allowed = new Set<string>();
  allowed.add(normalizeNavPath(ASSISTANT_LAUNCHER_ROUTE));
  for (const registration of listViewRegistrations()) {
    allowed.add(normalizeNavPath(registration.route.full_path));
  }
  cachedAllowedNavPaths = allowed;
  return allowed;
}

function isAllowedMobileAssistantNavPath(routePath: string): boolean {
  return getAllowedNavPathSet().has(normalizeNavPath(routePath));
}

export interface ComposeMobileAssistantRuntimeOptions {
  ttsEngine?: MobileTtsEngine;
}

export function composeMobileAssistantRuntime(options?: ComposeMobileAssistantRuntimeOptions) {
  const identity = getMobileAssistantIdentity();
  const ttsEngine = options?.ttsEngine ?? createDefaultMobileTtsEngine();
  const hostAdapter: AssistantHostAdapter = {
    navigateToRoute: async (routePath) => {
      if (!isAllowedMobileAssistantNavPath(routePath)) {
        return;
      }
      const target = normalizeNavPath(routePath);
      await router.replace(target);
    },
    postRuntimeEventToHost: postMobileRuntimeEventToHost,
    voice: createMobileHostVoiceAdapter(ttsEngine),
  };

  return {
    ...composeAssistantCoreRuntime({
      persistenceScope: identity.persistenceScope,
      environment: {
        hostAdapter,
        viewRegistryProvider: mobileAssistantViewRegistryProvider,
      },
    }),
    identity,
  };
}
