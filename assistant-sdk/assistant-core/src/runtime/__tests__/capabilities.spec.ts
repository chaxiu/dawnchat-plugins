import {
  registerCapabilities,
  registerCapability,
  toAssistantCardPayload,
  unregisterCapabilities,
  unregisterCapability,
} from "../capabilities";

const originalRegister = window.__DAWNCHAT_UI_REGISTER_CAPABILITY__;
const originalUnregister = window.__DAWNCHAT_UI_UNREGISTER_CAPABILITY__;

describe("runtime capabilities", () => {
  afterEach(() => {
    window.__DAWNCHAT_UI_REGISTER_CAPABILITY__ = originalRegister;
    window.__DAWNCHAT_UI_UNREGISTER_CAPABILITY__ = originalUnregister;
  });

  it("returns false when bridge register api is unavailable", () => {
    window.__DAWNCHAT_UI_REGISTER_CAPABILITY__ = undefined;
    const result = registerCapability(
      {
        name: "assistant.test_capability",
        description: "render",
        input_schema: {},
      },
      async () => ({ ok: true })
    );
    expect(result).toBe(false);
  });

  it("tracks register/unregister failures", () => {
    window.__DAWNCHAT_UI_REGISTER_CAPABILITY__ = () => false;
    window.__DAWNCHAT_UI_UNREGISTER_CAPABILITY__ = () => false;
    const registerResult = registerCapabilities([
      {
        definition: {
          name: "assistant.test_capability",
          description: "render",
          input_schema: {},
        },
        handler: async () => ({ ok: true }),
      },
      {
        definition: {
          name: "assistant.other_test_capability",
          description: "clear",
          input_schema: {},
        },
        handler: async () => ({ ok: true }),
      },
    ]);
    const unregisterResult = unregisterCapabilities([
      "assistant.test_capability",
      "assistant.other_test_capability",
    ]);
    expect(registerResult.registered).toEqual([]);
    expect(registerResult.failed).toEqual([
      "assistant.test_capability",
      "assistant.other_test_capability",
    ]);
    expect(unregisterResult.unregistered).toEqual([]);
    expect(unregisterResult.failed).toEqual([
      "assistant.test_capability",
      "assistant.other_test_capability",
    ]);
  });

  it("normalizes invalid payload values", () => {
    const fallbackPayload = toAssistantCardPayload(undefined);
    expect(fallbackPayload.card_type).toBe("word");
    expect(fallbackPayload.data).toEqual({});

    const payload = toAssistantCardPayload({
      card_type: "quiz",
      title: 123,
      data: "bad-value",
    });
    expect(payload.card_type).toBe("quiz");
    expect(payload.title).toBeUndefined();
    expect(payload.data).toEqual({});
  });

  it("returns false when bridge unregister api is unavailable", () => {
    window.__DAWNCHAT_UI_UNREGISTER_CAPABILITY__ = undefined;
    const result = unregisterCapability("assistant.test_capability");
    expect(result).toBe(false);
  });
});
