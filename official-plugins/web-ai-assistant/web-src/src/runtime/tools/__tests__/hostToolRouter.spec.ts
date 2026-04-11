import { describe, expect, it, vi } from "vitest";

const {
  getRuntimeCapabilityRegistrationsMock,
  handleCapabilityInvokeRequestMock,
  handleAssistantRuntimeEventMock,
  runtimeCapabilityRegistrations,
} = vi.hoisted(() => ({
  runtimeCapabilityRegistrations: [
    {
      definition: {
        name: "assistant.view.list",
        description: "List views",
        input_schema: {
          type: "object",
          properties: {},
        },
      },
      handler: vi.fn(async () => ({
        ok: true,
        data: {
          views: [{ view_id: "tictactoe.main" }],
        },
      })),
    },
    {
      definition: {
        name: "assistant.session_step_execute",
        description: "Execute step",
        input_schema: {
          type: "object",
          properties: {},
        },
      },
      handler: vi.fn(async (payload: Record<string, unknown>) => ({
        ok: true,
        data: {
          status: "applied",
          echo: payload,
        },
      })),
    },
  ],
  getRuntimeCapabilityRegistrationsMock: vi.fn(() => runtimeCapabilityRegistrations),
  handleCapabilityInvokeRequestMock: vi.fn(async (context: { invoke: { functionName: string } }) => {
    if (context.invoke.functionName === "assistant.session.start") {
      return {
        ok: true,
        data: {
          accepted: true,
          session_id: "sess_test",
        },
      };
    }
    return null;
  }),
  handleAssistantRuntimeEventMock: vi.fn(),
}));

vi.mock("../../bootstrap/runtimeHandles", () => ({
  getRuntimeCapabilityRegistrations: getRuntimeCapabilityRegistrationsMock,
  getWebAssistantIdentityHandle: () => ({
    assistantInstanceId: "web-assistant-test",
    sessionId: "web-session-test",
    persistenceScope: "web-assistant-test::session.web-session-test",
    transcriptStorageKey: "transcript::web-assistant-test",
  }),
}));

vi.mock("@dawnchat/host-orchestration-sdk/session-core", () => ({
  useAssistantSessionOrchestrator: () => ({
    handleCapabilityInvokeRequest: handleCapabilityInvokeRequestMock,
    handleAssistantRuntimeEvent: handleAssistantRuntimeEventMock,
  }),
}));

import {
  createWebAssistantHostToolRouter,
  listWebAssistantToolDefinitions,
} from "../hostToolRouter";

describe("createWebAssistantHostToolRouter", () => {
  it("supports local math and exposed runtime capability tools", async () => {
    const router = createWebAssistantHostToolRouter();

    const mathResult = await router.invoke({
      functionName: "math.add",
      payload: {
        a: 18,
        b: 24,
      },
    });

    const viewListResult = await router.invoke({
      functionName: "assistant.view.list",
      payload: {},
    });

    expect(mathResult).toEqual({
      ok: true,
      result: 42,
    });
    expect(viewListResult).toEqual(expect.objectContaining({
      ok: true,
      data: {
        views: [{ view_id: "tictactoe.main" }],
      },
    }));
  });

  it("returns a normalized error when the tool is missing", async () => {
    const router = createWebAssistantHostToolRouter();

    const result = await router.invoke({
      functionName: "dawnchat.unknown_tool",
      payload: {},
    });

    expect(result).toEqual(expect.objectContaining({
      ok: false,
      error_code: "host_tool_not_found",
    }));
  });

  it("merges local tools with exposed runtime capability definitions", () => {
    const definitions = listWebAssistantToolDefinitions();

    expect(definitions.map((definition) => definition.name)).toEqual(expect.arrayContaining([
      "math.add",
      "assistant.session.start",
      "assistant.session.status",
      "assistant.session.stop",
      "assistant.event.wait",
      "assistant.session.wait_for_end",
      "view.capability.invoke",
      "dawnchat.ui.capability.invoke",
      "dawnchat.ui.session.start",
      "dawnchat.ui.event.wait",
      "dawnchat.ui.session.wait_for_end",
      "assistant.view.list",
    ]));
  });

  it("routes assistant.session.start through the local session orchestrator", async () => {
    const router = createWebAssistantHostToolRouter();

    const result = await router.invoke({
      functionName: "assistant.session.start",
      payload: {
        steps: [
          {
            id: "step-1",
            action: {
              type: "view.open",
              payload: {
                view_id: "tictactoe.main",
              },
            },
          },
        ],
      },
    });

    expect(handleCapabilityInvokeRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pluginId: "web-assistant-test",
        invoke: expect.objectContaining({
          functionName: "assistant.session.start",
        }),
      })
    );
    expect(result).toEqual(expect.objectContaining({
      ok: true,
      data: expect.objectContaining({
        accepted: true,
        session_id: "sess_test",
      }),
    }));
  });

  it("maps dawnchat.ui.capability.invoke to local view.capability.invoke", async () => {
    const router = createWebAssistantHostToolRouter();

    const result = await router.invoke({
      functionName: "dawnchat.ui.capability.invoke",
      payload: {
        plugin_id: "ignored.plugin",
        function: "view.capability.invoke",
        input: {
          view_id: "tictactoe.main",
          capability_id: "game.place_mark",
          input: {
            index: 3,
          },
        },
      },
    });

    expect(result).toEqual(expect.objectContaining({
      ok: true,
      data: expect.objectContaining({
        status: "applied",
      }),
    }));

    const sessionStepRegistration = runtimeCapabilityRegistrations
      .find((registration) => registration.definition.name === "assistant.session_step_execute");
    expect(sessionStepRegistration?.handler).toHaveBeenCalledWith(
      expect.objectContaining({
        action: expect.objectContaining({
          type: "view.capability.invoke",
          payload: {
            view_id: "tictactoe.main",
            capability_id: "game.place_mark",
            input: {
              index: 3,
            },
          },
        }),
      }),
      {}
    );
  });
});
