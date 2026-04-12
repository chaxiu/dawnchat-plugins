import { afterEach, describe, expect, it, vi } from "vitest";

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

  it("propagates step_index and total_steps on each assistant.session_step_execute", async () => {
    const orchestrator = useAssistantSessionOrchestrator({
      pluginId: { value: "demo.plugin" },
    });
    const stepPayloads: Record<string, unknown>[] = [];
    const executePluginCapability = async (invoke: {
      functionName: string;
      payload: Record<string, unknown>;
      options: Record<string, unknown>;
    }) => {
      if (invoke.functionName === "assistant.session_step_execute") {
        stepPayloads.push({ ...invoke.payload });
        return { ok: true, data: {} };
      }
      return { ok: true, data: {} };
    };

    const startResult = await orchestrator.handleCapabilityInvokeRequest({
      requestId: "req-start-steps",
      pluginId: "demo.plugin",
      invoke: {
        functionName: "assistant.session.start",
        payload: {
          steps: [
            { action: { type: "a.one", payload: {} } },
            { action: { type: "a.two", payload: {} } },
            { action: { type: "a.three", payload: {} } },
          ],
        },
        options: {},
      },
      executePluginCapability,
    });

    expect(startResult).toEqual(expect.objectContaining({ ok: true }));

    await vi.waitFor(() => {
      expect(stepPayloads).toHaveLength(3);
    });

    expect(stepPayloads[0]).toMatchObject({ step_index: 0, total_steps: 3 });
    expect(stepPayloads[1]).toMatchObject({ step_index: 1, total_steps: 3 });
    expect(stepPayloads[2]).toMatchObject({ step_index: 2, total_steps: 3 });
  });
});

