import { describe, expect, it, vi } from "vitest";

import { createHostToolRouter } from "../src/tool-router";

describe("tool-router", () => {
  it("supports remote backends while preserving invoke()", async () => {
    const middlewareMode = vi.fn();
    const backendInvoke = vi.fn(async (request, context) => {
      expect(context.executionMode).toBe("remote_route");
      return {
        echoed: request.payload.value,
      };
    });

    const router = createHostToolRouter({
      middleware: [
        async (_request, context, next) => {
          middlewareMode(context.executionMode);
          return next();
        },
      ],
    }).register({
      functionName: "remote.echo",
      executionMode: "remote_route",
      backend: {
        mode: "remote_route",
        invoke: backendInvoke,
      },
    });

    const result = await router.invoke({
      functionName: "remote.echo",
      payload: {
        value: "hi",
      },
    });

    expect(result).toEqual({
      echoed: "hi",
    });
    expect(middlewareMode).toHaveBeenCalledWith("remote_route");
    expect(backendInvoke).toHaveBeenCalledTimes(1);
  });

  it("normalizes timeout failures across non-local backends", async () => {
    const router = createHostToolRouter({}).register({
      functionName: "remote.slow",
      executionMode: "remote_route",
      backend: {
        mode: "remote_route",
        invoke: async () => await new Promise(() => {}),
      },
    });

    const result = await router.invoke({
      functionName: "remote.slow",
      payload: {},
      timeoutMs: 1,
    });

    expect(result).toEqual(expect.objectContaining({
      ok: false,
      error_code: "host_tool_failed",
      message: "host_tool_timeout",
    }));
  });
});

