import { afterEach, describe, expect, it } from "vitest";

import { uninstallHostOrchestrationEnvironment } from "../src/env";
import { useAssistantSessionOrchestrator } from "../src/session-core";

describe("session-core", () => {
  afterEach(() => {
    uninstallHostOrchestrationEnvironment();
  });

  it("waits for session end without relying on window globals", async () => {
    const orchestrator = useAssistantSessionOrchestrator({
      pluginId: {
        value: "demo.plugin",
      },
    });

    const executePluginCapability = async (invoke: {
      functionName: string;
      payload: Record<string, unknown>;
      options: Record<string, unknown>;
    }) => {
      if (invoke.functionName === "assistant.session_step_execute") {
        return await new Promise<Record<string, unknown>>(() => {});
      }
      return {
        ok: true,
      };
    };

    const startResult = await orchestrator.handleCapabilityInvokeRequest({
      requestId: "req-start",
      pluginId: "demo.plugin",
      invoke: {
        functionName: "assistant.session.start",
        payload: {
          steps: [
            {
              action: {
                type: "demo.run",
                payload: {},
              },
            },
          ],
        },
        options: {},
      },
      executePluginCapability,
    });

    expect(startResult).not.toBeNull();
    const sessionId = String((startResult as Record<string, unknown>).data
      && typeof (startResult as Record<string, unknown>).data === "object"
      ? ((startResult as Record<string, unknown>).data as Record<string, unknown>).session_id || ""
      : "");
    expect(sessionId).not.toBe("");

    const waitResult = await orchestrator.handleCapabilityInvokeRequest({
      requestId: "req-wait",
      pluginId: "demo.plugin",
      invoke: {
        functionName: "assistant.session.wait_for_end",
        payload: {
          session_id: sessionId,
          timeout_ms: 1,
        },
        options: {},
      },
      executePluginCapability,
    });

    expect(waitResult).toEqual(expect.objectContaining({
      ok: true,
      data: expect.objectContaining({
        session_id: sessionId,
        wait_for: "session_end",
        status: "timed_out",
      }),
    }));
  });
});

