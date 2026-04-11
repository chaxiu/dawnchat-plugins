import type { AgentLoopToolDefinition } from "../agent-loop";
import { createHostProtocolError, type HostProtocolPayload, type HostProtocolResult } from "../protocol";

export interface RuntimeCapabilityRegistrationLike {
  definition: {
    name: string;
    description?: string;
    input_schema: Record<string, unknown>;
  };
}

export interface BuildAgentLoopToolDefinitionsOptions {
  allowNames?: Iterable<string>;
}

export type DawnchatUiAliasParseResult =
  | {
      ok: true;
      functionName: string;
      payload: Record<string, unknown>;
      options: Record<string, unknown>;
    }
  | {
      ok: false;
      error: HostProtocolResult;
    };

export const DIRECT_ASSISTANT_ORCHESTRATION_TOOL_DEFINITIONS: AgentLoopToolDefinition[] = [
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

export const DIRECT_ASSISTANT_ORCHESTRATION_TOOL_NAMES =
  DIRECT_ASSISTANT_ORCHESTRATION_TOOL_DEFINITIONS.map((definition) => definition.name);

export const DAWNCHAT_UI_ALIAS_TOOL_DEFINITIONS: AgentLoopToolDefinition[] = [
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

export const DAWNCHAT_UI_ALIAS_TARGET_FUNCTION_NAMES: Readonly<Record<string, string>> = {
  "dawnchat.ui.session.start": "assistant.session.start",
  "dawnchat.ui.session.status": "assistant.session.status",
  "dawnchat.ui.session.stop": "assistant.session.stop",
  "dawnchat.ui.event.wait": "assistant.event.wait",
  "dawnchat.ui.session.wait_for_end": "assistant.session.wait_for_end",
};

function toRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  return raw as Record<string, unknown>;
}

export function cloneToolSchema(schema: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(schema)) as Record<string, unknown>;
}

export function buildAgentLoopToolDefinitionsFromRegistrations(
  registrations: RuntimeCapabilityRegistrationLike[],
  options: BuildAgentLoopToolDefinitionsOptions = {}
): AgentLoopToolDefinition[] {
  const allowNames = options.allowNames ? new Set(options.allowNames) : null;
  return registrations
    .filter((registration) =>
      !allowNames || allowNames.has(registration.definition.name)
    )
    .map((registration) => ({
      name: registration.definition.name,
      description: registration.definition.description,
      inputSchema: cloneToolSchema(registration.definition.input_schema),
    }));
}

export function normalizeDawnchatUiAliasPayload(payload: Record<string, unknown>) {
  const next = { ...payload };
  delete next.plugin_id;
  delete next.title;
  delete next.description;
  return next;
}

export function resolveDawnchatUiAliasTargetFunctionName(aliasToolName: string): string | null {
  return DAWNCHAT_UI_ALIAS_TARGET_FUNCTION_NAMES[aliasToolName] || null;
}

export function parseDawnchatUiCapabilityInvokePayload(
  payload: HostProtocolPayload,
  requestOptions: HostProtocolPayload = {}
): DawnchatUiAliasParseResult {
  const normalizedPayload = normalizeDawnchatUiAliasPayload(toRecord(payload));
  const functionName = String(normalizedPayload.function || "").trim();
  if (!functionName) {
    return {
      ok: false,
      error: createHostProtocolError("invalid_arguments", "function is required"),
    };
  }

  const input = normalizedPayload.input;
  const nestedPayload = normalizedPayload.payload;
  const capabilityPayload = input && typeof input === "object" && !Array.isArray(input)
    ? toRecord(input)
    : nestedPayload && typeof nestedPayload === "object" && !Array.isArray(nestedPayload)
      ? toRecord(nestedPayload)
      : {};

  return {
    ok: true,
    functionName,
    payload: capabilityPayload,
    options: toRecord(normalizedPayload.options || requestOptions),
  };
}
