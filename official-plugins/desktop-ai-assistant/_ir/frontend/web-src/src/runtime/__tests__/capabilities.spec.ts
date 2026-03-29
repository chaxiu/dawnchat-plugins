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
        name: "assistant.render_card",
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
          name: "assistant.render_card",
          description: "render",
          input_schema: {},
        },
        handler: async () => ({ ok: true }),
      },
      {
        definition: {
          name: "assistant.clear_cards",
          description: "clear",
          input_schema: {},
        },
        handler: async () => ({ ok: true }),
      },
    ]);
    const unregisterResult = unregisterCapabilities(["assistant.render_card", "assistant.clear_cards"]);
    expect(registerResult.registered).toEqual([]);
    expect(registerResult.failed).toEqual(["assistant.render_card", "assistant.clear_cards"]);
    expect(unregisterResult.unregistered).toEqual([]);
    expect(unregisterResult.failed).toEqual(["assistant.render_card", "assistant.clear_cards"]);
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
    const result = unregisterCapability("assistant.render_card");
    expect(result).toBe(false);
  });
});
