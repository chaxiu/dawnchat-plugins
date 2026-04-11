import type { AgentLoopToolDefinition } from "@dawnchat/host-orchestration-sdk/agent-loop";
import {
  buildAgentLoopToolDefinitionsFromRegistrations,
  DAWNCHAT_UI_ALIAS_TOOL_DEFINITIONS,
  DIRECT_ASSISTANT_ORCHESTRATION_TOOL_DEFINITIONS,
} from "@dawnchat/host-orchestration-sdk/tool-router";
import type { UiCapabilityRegistration } from "@dawnchat/assistant-core";

import { getRuntimeCapabilityRegistrations } from "../bootstrap/runtimeHandles";

export const EXPOSED_RUNTIME_CAPABILITY_NAMES = new Set([
  "assistant.runtime.bootstrap",
  "assistant.view.list",
  "assistant.view.describe",
  "assistant.view.contract",
  "view.open",
]);

export const WEB_ASSISTANT_LOCAL_TOOL_DEFINITIONS: AgentLoopToolDefinition[] = [
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

export function getExposedRuntimeCapabilityRegistrations(): UiCapabilityRegistration[] {
  return getRuntimeCapabilityRegistrations().filter((registration) =>
    EXPOSED_RUNTIME_CAPABILITY_NAMES.has(registration.definition.name)
  );
}

export function listWebAssistantToolDefinitions(): AgentLoopToolDefinition[] {
  const runtimeTools = buildAgentLoopToolDefinitionsFromRegistrations(
    getRuntimeCapabilityRegistrations(),
    { allowNames: EXPOSED_RUNTIME_CAPABILITY_NAMES }
  );

  return [
    ...WEB_ASSISTANT_LOCAL_TOOL_DEFINITIONS,
    ...DIRECT_ASSISTANT_ORCHESTRATION_TOOL_DEFINITIONS,
    ...DAWNCHAT_UI_ALIAS_TOOL_DEFINITIONS,
    ...runtimeTools,
  ];
}
