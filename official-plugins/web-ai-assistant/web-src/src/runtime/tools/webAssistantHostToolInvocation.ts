import { useAssistantSessionOrchestrator } from "@dawnchat/host-orchestration-sdk/session-core";
import type {
  CapabilityInvokeExecutionContext,
  CapabilityInvokeRequest,
} from "@dawnchat/host-orchestration-sdk/assistant-client";
import {
  HOST_ASSISTANT_RUNTIME_EVENT_MESSAGE,
  type AssistantRuntimeEventEnvelope,
} from "@dawnchat/assistant-core";

import {
  getRuntimeCapabilityRegistrations,
  getWebAssistantIdentityHandle,
} from "../bootstrap/runtimeHandles";

export function toRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  return raw as Record<string, unknown>;
}

function resolveLocalPluginId() {
  return getWebAssistantIdentityHandle()?.assistantInstanceId || "web-ai-assistant";
}

function getRuntimeCapabilityRegistration(functionName: string) {
  return getRuntimeCapabilityRegistrations().find((registration) =>
    registration.definition.name === functionName
  ) || null;
}

function createCapabilityInvokeExecutionContext(
  functionName: string,
  payload: Record<string, unknown>,
  options: Record<string, unknown>
): CapabilityInvokeExecutionContext {
  return {
    requestId: `web_assistant_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    pluginId: resolveLocalPluginId(),
    invoke: {
      functionName,
      payload,
      options,
    },
    executePluginCapability: async (invoke: CapabilityInvokeRequest) => {
      const registration = getRuntimeCapabilityRegistration(invoke.functionName);
      if (!registration) {
        return {
          ok: false,
          error_code: "host_tool_not_found",
          message: `No local runtime capability registered for ${invoke.functionName}`,
        };
      }
      return await registration.handler(invoke.payload, invoke.options);
    },
  };
}

const sessionOrchestrator = useAssistantSessionOrchestrator({
  pluginId: {
    get value() {
      return resolveLocalPluginId();
    },
  } as { value: string },
});

let runtimeEventForwardingInstalled = false;

export function ensureRuntimeEventForwardingInstalled() {
  if (runtimeEventForwardingInstalled || typeof window === "undefined") {
    return;
  }
  window.addEventListener(HOST_ASSISTANT_RUNTIME_EVENT_MESSAGE, (event: Event) => {
    const customEvent = event as CustomEvent<AssistantRuntimeEventEnvelope | undefined>;
    if (!customEvent.detail) {
      return;
    }
    sessionOrchestrator.handleAssistantRuntimeEvent(customEvent.detail);
  });
  runtimeEventForwardingInstalled = true;
}

export async function invokeLocalWebAssistantFunction(
  functionName: string,
  payload: Record<string, unknown>,
  options: Record<string, unknown> = {}
) {
  const normalizedPayload = toRecord(payload);
  const normalizedOptions = toRecord(options);

  const sessionResult = await sessionOrchestrator.handleCapabilityInvokeRequest(
    createCapabilityInvokeExecutionContext(functionName, normalizedPayload, normalizedOptions)
  );
  if (sessionResult) {
    return sessionResult;
  }

  if (functionName === "view.capability.invoke") {
    const syntheticSessionPayload = {
      session_id: `direct_view_capability_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      step_id: "direct-view-capability",
      step_index: 0,
      total_steps: 1,
      action: {
        type: "view.capability.invoke",
        payload: normalizedPayload,
      },
    };
    const registration = getRuntimeCapabilityRegistration("assistant.session_step_execute");
    if (!registration) {
      return {
        ok: false,
        error_code: "host_tool_not_found",
        message: "assistant.session_step_execute is not available",
      };
    }
    return await registration.handler(syntheticSessionPayload, normalizedOptions);
  }

  const registration = getRuntimeCapabilityRegistration(functionName);
  if (!registration) {
    return {
      ok: false,
      error_code: "host_tool_not_found",
      message: `No local route registered for ${functionName}`,
    };
  }
  return await registration.handler(normalizedPayload, normalizedOptions);
}
