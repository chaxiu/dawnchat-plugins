import { describe, expect, it } from "vitest";

import {
  buildAgentLoopToolDefinitionsFromRegistrations,
  DAWNCHAT_UI_ALIAS_TOOL_DEFINITIONS,
  DIRECT_ASSISTANT_ORCHESTRATION_TOOL_DEFINITIONS,
  normalizeDawnchatUiAliasPayload,
  parseDawnchatUiCapabilityInvokePayload,
  resolveDawnchatUiAliasTargetFunctionName,
} from "./toolDefinitions";

describe("tool-router tool definitions helpers", () => {
  it("exposes canonical orchestration and alias tool definitions", () => {
    expect(DIRECT_ASSISTANT_ORCHESTRATION_TOOL_DEFINITIONS.map((item) => item.name)).toEqual([
      "assistant.session.start",
      "assistant.session.status",
      "assistant.session.stop",
      "assistant.event.wait",
      "assistant.session.wait_for_end",
      "view.capability.invoke",
    ]);

    expect(DAWNCHAT_UI_ALIAS_TOOL_DEFINITIONS.map((item) => item.name)).toEqual([
      "dawnchat.ui.capability.invoke",
      "dawnchat.ui.session.start",
      "dawnchat.ui.session.status",
      "dawnchat.ui.session.stop",
      "dawnchat.ui.event.wait",
      "dawnchat.ui.session.wait_for_end",
    ]);
  });

  it("builds agent-loop tool definitions from registrations with deep-cloned schemas", () => {
    const registrations = [
      {
        definition: {
          name: "assistant.view.list",
          description: "List views",
          input_schema: {
            type: "object",
            properties: {
              scope: { type: "string" },
            },
          },
        },
      },
      {
        definition: {
          name: "view.open",
          description: "Open one view",
          input_schema: {
            type: "object",
            properties: {
              view_id: { type: "string" },
            },
          },
        },
      },
    ];

    const definitions = buildAgentLoopToolDefinitionsFromRegistrations(registrations, {
      allowNames: ["assistant.view.list"],
    });

    expect(definitions).toHaveLength(1);
    expect(definitions[0]).toEqual({
      name: "assistant.view.list",
      description: "List views",
      inputSchema: {
        type: "object",
        properties: {
          scope: { type: "string" },
        },
      },
    });

    const firstDefinition = definitions[0];
    if (!firstDefinition) {
      throw new Error("missing tool definition");
    }
    if (!firstDefinition.inputSchema || typeof firstDefinition.inputSchema !== "object") {
      throw new Error("missing input schema");
    }
    firstDefinition.inputSchema.properties = {};
    expect(registrations[0]!.definition.input_schema.properties).toEqual({
      scope: { type: "string" },
    });
  });

  it("normalizes alias payload and resolves fixed alias targets", () => {
    expect(normalizeDawnchatUiAliasPayload({
      plugin_id: "demo",
      title: "ignored",
      description: "ignored",
      session_id: "sess-1",
    })).toEqual({
      session_id: "sess-1",
    });

    expect(resolveDawnchatUiAliasTargetFunctionName("dawnchat.ui.session.start")).toBe("assistant.session.start");
    expect(resolveDawnchatUiAliasTargetFunctionName("dawnchat.ui.event.wait")).toBe("assistant.event.wait");
    expect(resolveDawnchatUiAliasTargetFunctionName("dawnchat.ui.capability.invoke")).toBeNull();
  });

  it("parses dawnchat.ui.capability.invoke payload from input or payload fields", () => {
    const fromInput = parseDawnchatUiCapabilityInvokePayload(
      {
        plugin_id: "ignored",
        function: "view.capability.invoke",
        input: {
          view_id: "board.main",
          capability_id: "board.add_node",
        },
        options: {
          timeout_ms: 5000,
        },
      },
      {
        timeout_ms: 10,
      }
    );

    expect(fromInput).toEqual({
      ok: true,
      functionName: "view.capability.invoke",
      payload: {
        view_id: "board.main",
        capability_id: "board.add_node",
      },
      options: {
        timeout_ms: 5000,
      },
    });

    const fromPayload = parseDawnchatUiCapabilityInvokePayload(
      {
        function: "assistant.view.describe",
        payload: {
          view_id: "board.main",
        },
      },
      {
        timeout_ms: 10,
      }
    );

    expect(fromPayload).toEqual({
      ok: true,
      functionName: "assistant.view.describe",
      payload: {
        view_id: "board.main",
      },
      options: {
        timeout_ms: 10,
      },
    });
  });

  it("returns invalid_arguments when capability alias omits function", () => {
    const parsed = parseDawnchatUiCapabilityInvokePayload({});

    expect(parsed).toEqual({
      ok: false,
      error: expect.objectContaining({
        ok: false,
        error_code: "invalid_arguments",
      }),
    });
  });
});
