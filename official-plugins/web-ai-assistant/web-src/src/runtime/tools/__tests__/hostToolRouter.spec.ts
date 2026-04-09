import { describe, expect, it } from "vitest";

import { createWebAssistantHostToolRouter } from "../hostToolRouter";

describe("createWebAssistantHostToolRouter", () => {
  it("supports the local math tool and remote host info tool", async () => {
    const router = createWebAssistantHostToolRouter();

    const mathResult = await router.invoke({
      functionName: "math.add",
      payload: {
        a: 18,
        b: 24,
      },
    });

    const hostResult = await router.invoke({
      functionName: "dawnchat.host_info",
      payload: {},
    });

    expect(mathResult).toEqual({
      ok: true,
      result: 42,
    });
    expect(hostResult).toEqual(expect.objectContaining({
      ok: true,
      host: "web-preview",
      language: expect.any(String),
      user_agent: expect.any(String),
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
});
