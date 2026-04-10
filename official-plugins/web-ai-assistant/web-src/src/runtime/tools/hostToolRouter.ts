import type { AgentLoopToolDefinition } from "@dawnchat/host-orchestration-sdk/agent-loop";
import {
  createHostToolRouter,
  type HostToolInvokeRequest,
} from "@dawnchat/host-orchestration-sdk/tool-router";
import { useAssistantSessionOrchestrator } from "@dawnchat/host-orchestration-sdk/session-core";
import type {
  CapabilityInvokeExecutionContext,
  CapabilityInvokeRequest,
} from "@dawnchat/host-orchestration-sdk/assistant-client";
import {
  HOST_ASSISTANT_RUNTIME_EVENT_MESSAGE,
  type AssistantRuntimeEventEnvelope,
  type UiCapabilityRegistration,
} from "@dawnchat/assistant-core";

import {
  getRuntimeCapabilityRegistrations,
  getWebAssistantIdentityHandle,
} from "../bootstrap/runtimeHandles";

const EXPOSED_RUNTIME_CAPABILITY_NAMES = new Set([
  "assistant.runtime.bootstrap",
  "assistant.view.list",
  "assistant.view.describe",
  "assistant.view.contract",
  "view.open",
]);

const DIRECT_SESSION_TOOL_DEFINITIONS: AgentLoopToolDefinition[] = [
  {
    name: "assistant.session.start",
    description: "Run an ordered assistant session locally.",
    inputSchema: {
      type: "object",
      properties: {
        steps: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              action: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  payload: { type: "object" },
                },
                required: ["type"],
              },
              timeout_ms: { type: "number", minimum: 0 },
            },
            required: ["action"],
          },
        },
      },
      required: ["steps"],
    },
  },
  {
    name: "assistant.session.status",
    description: "Read the local assistant session status.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: { type: "string" },
      },
      required: ["session_id"],
    },
  },
  {
    name: "assistant.session.stop",
    description: "Stop one running local assistant session.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: { type: "string" },
        reason: { type: "string" },
      },
      required: ["session_id"],
    },
  },
  {
    name: "assistant.event.wait",
    description: "Wait for a runtime event emitted by the local assistant view.",
    inputSchema: {
      type: "object",
      properties: {
        event_types: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
        },
        match: { type: "object" },
        timeout_ms: { type: "number", minimum: 0 },
      },
      required: ["event_types"],
    },
  },
  {
    name: "assistant.session.wait_for_end",
    description: "Wait for one local assistant session to reach terminal state.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: { type: "string" },
        timeout_ms: { type: "number", minimum: 0 },
      },
      required: ["session_id"],
    },
  },
  {
    name: "view.capability.invoke",
    description: "Invoke one capability on the active assistant view.",
    inputSchema: {
      type: "object",
      properties: {
        view_id: { type: "string" },
        capability_id: { type: "string" },
        input: { type: "object" },
      },
      required: ["view_id", "capability_id"],
    },
  },
];

const DAWNCHAT_UI_ALIAS_TOOL_DEFINITIONS: AgentLoopToolDefinition[] = [
  {
    name: "dawnchat.ui.capability.invoke",
    description: "Compatibility wrapper for local assistant capability calls.",
    inputSchema: {
      type: "object",
      properties: {
        plugin_id: { type: "string" },
        function: { type: "string" },
        input: { type: "object" },
        payload: { type: "object" },
        options: { type: "object" },
      },
      required: ["function"],
    },
  },
  {
    name: "dawnchat.ui.session.start",
    description: "Compatibility wrapper for assistant.session.start.",
    inputSchema: {
      type: "object",
      properties: {
        plugin_id: { type: "string" },
        steps: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              action: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  payload: { type: "object" },
                },
                required: ["type"],
              },
              timeout_ms: { type: "number", minimum: 0 },
            },
            required: ["action"],
          },
        },
        options: { type: "object" },
      },
      required: ["steps"],
    },
  },
  {
    name: "dawnchat.ui.session.status",
    description: "Compatibility wrapper for assistant.session.status.",
    inputSchema: {
      type: "object",
      properties: {
        plugin_id: { type: "string" },
        session_id: { type: "string" },
        options: { type: "object" },
      },
      required: ["session_id"],
    },
  },
  {
    name: "dawnchat.ui.session.stop",
    description: "Compatibility wrapper for assistant.session.stop.",
    inputSchema: {
      type: "object",
      properties: {
        plugin_id: { type: "string" },
        session_id: { type: "string" },
        reason: { type: "string" },
        options: { type: "object" },
      },
      required: ["session_id"],
    },
  },
  {
    name: "dawnchat.ui.event.wait",
    description: "Compatibility wrapper for assistant.event.wait.",
    inputSchema: {
      type: "object",
      properties: {
        plugin_id: { type: "string" },
        event_types: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
        },
        match: { type: "object" },
        timeout_ms: { type: "number", minimum: 0 },
        options: { type: "object" },
      },
      required: ["event_types"],
    },
  },
  {
    name: "dawnchat.ui.session.wait_for_end",
    description: "Compatibility wrapper for assistant.session.wait_for_end.",
    inputSchema: {
      type: "object",
      properties: {
        plugin_id: { type: "string" },
        session_id: { type: "string" },
        timeout_ms: { type: "number", minimum: 0 },
        options: { type: "object" },
      },
      required: ["session_id"],
    },
  },
];

const WEB_ASSISTANT_LOCAL_TOOL_DEFINITIONS: AgentLoopToolDefinition[] = [
  {
    name: "math.add",
    description: "Add two numbers together and return a numeric result.",
    inputSchema: {
      type: "object",
      properties: {
        a: { type: "number", description: "Left operand" },
        b: { type: "number", description: "Right operand" },
      },
      required: ["a", "b"],
      additionalProperties: false,
    },
  },
];

function cloneToolSchema(schema: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(schema)) as Record<string, unknown>;
}

function toRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  return raw as Record<string, unknown>;
}

function resolveLocalPluginId() {
  return getWebAssistantIdentityHandle()?.assistantInstanceId || "web-ai-assistant";
}

function getExposedRuntimeCapabilityRegistrations(): UiCapabilityRegistration[] {
  return getRuntimeCapabilityRegistrations().filter((registration) =>
    EXPOSED_RUNTIME_CAPABILITY_NAMES.has(registration.definition.name)
  );
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

function ensureRuntimeEventForwardingInstalled() {
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

function normalizeAliasPayload(payload: Record<string, unknown>) {
  const next = { ...payload };
  delete next.plugin_id;
  delete next.title;
  delete next.description;
  return next;
}

async function invokeLocalFunction(
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

export function listWebAssistantToolDefinitions(): AgentLoopToolDefinition[] {
  const runtimeTools = getExposedRuntimeCapabilityRegistrations().map((registration) => ({
    name: registration.definition.name,
    description: registration.definition.description,
    inputSchema: cloneToolSchema(registration.definition.input_schema),
  }));

  return [
    ...WEB_ASSISTANT_LOCAL_TOOL_DEFINITIONS,
    ...DIRECT_SESSION_TOOL_DEFINITIONS,
    ...DAWNCHAT_UI_ALIAS_TOOL_DEFINITIONS,
    ...runtimeTools,
  ];
}

export function createWebAssistantHostToolRouter() {
  ensureRuntimeEventForwardingInstalled();

  const invokeMathAdd = async (request: { payload: Record<string, unknown> }) => {
    const left = Number(request.payload.a || 0);
    const right = Number(request.payload.b || 0);

    return {
      ok: true,
      result: left + right,
    };
  };

  const invokeDirectLocalTool = async (request: {
    functionName: string;
    payload: Record<string, unknown>;
    options?: Record<string, unknown>;
  }) =>
    invokeLocalFunction(request.functionName, request.payload, request.options || {});

  const invokeDawnchatUiCapability = async (request: {
    payload: Record<string, unknown>;
    options?: Record<string, unknown>;
  }) => {
    const rawPayload = normalizeAliasPayload(toRecord(request.payload));
    const functionName = String(rawPayload.function || "").trim();
    if (!functionName) {
      return {
        ok: false,
        error_code: "invalid_arguments",
        message: "function is required",
      };
    }
    const input = rawPayload.input;
    const payload = rawPayload.payload;
    const capabilityPayload = input && typeof input === "object" && !Array.isArray(input)
      ? toRecord(input)
      : payload && typeof payload === "object" && !Array.isArray(payload)
        ? toRecord(payload)
        : {};
    const options = toRecord(rawPayload.options || request.options);
    return await invokeLocalFunction(functionName, capabilityPayload, options);
  };

  const invokeDawnchatUiAlias = async (
    functionName: string,
    request: { payload: Record<string, unknown>; options?: Record<string, unknown> }
  ) => {
    const rawPayload = normalizeAliasPayload(toRecord(request.payload));
    const options = toRecord(rawPayload.options || request.options);
    return await invokeLocalFunction(functionName, rawPayload, options);
  };

  let router = createHostToolRouter({}).registerFunction("math.add", invokeMathAdd);

  const directToolNames = DIRECT_SESSION_TOOL_DEFINITIONS.map((definition) => definition.name);
  for (const functionName of directToolNames) {
    router = router.registerFunction(functionName, invokeDirectLocalTool);
  }

  router = router
    .registerFunction("dawnchat.ui.capability.invoke", invokeDawnchatUiCapability)
    .registerFunction("dawnchat.ui.session.start", (request: HostToolInvokeRequest) =>
      invokeDawnchatUiAlias("assistant.session.start", request))
    .registerFunction("dawnchat.ui.session.status", (request: HostToolInvokeRequest) =>
      invokeDawnchatUiAlias("assistant.session.status", request))
    .registerFunction("dawnchat.ui.session.stop", (request: HostToolInvokeRequest) =>
      invokeDawnchatUiAlias("assistant.session.stop", request))
    .registerFunction("dawnchat.ui.event.wait", (request: HostToolInvokeRequest) =>
      invokeDawnchatUiAlias("assistant.event.wait", request))
    .registerFunction("dawnchat.ui.session.wait_for_end", (request: HostToolInvokeRequest) =>
      invokeDawnchatUiAlias("assistant.session.wait_for_end", request));

  for (const registration of getExposedRuntimeCapabilityRegistrations()) {
    router = router.registerFunction(
      registration.definition.name,
      async (request: { payload: Record<string, unknown> }) =>
        registration.handler(request.payload, {})
    );
  }

  return router;
}
