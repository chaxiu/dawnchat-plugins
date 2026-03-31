import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

import CardHost from "../../components/CardHost.vue";
import { createCardCapabilityRegistrations, listCardFunctions, resolveCardComponent } from "../registry";

describe("card registry", () => {
  it("resolves known card type", () => {
    expect(resolveCardComponent("word")).toBeTruthy();
    expect(resolveCardComponent("unknown")).toBeNull();
  });

  it("returns callable function definitions", () => {
    const defs = listCardFunctions();
    const names = defs.map((item) => item.name);
    expect(names).toContain("assistant.render_card");
    expect(names).toContain("assistant.clear_cards");
  });

  it("builds capability registrations with handlers", async () => {
    const registrations = createCardCapabilityRegistrations({
      onRenderCard: async () => ({ ok: true, data: { kind: "render" } }),
      onClearCards: async () => ({ ok: true, data: { kind: "clear" } }),
    });
    expect(registrations.map((item) => item.definition.name)).toEqual([
      "assistant.render_card",
      "assistant.clear_cards",
    ]);
    await expect(registrations[0].handler({}, {})).resolves.toEqual({
      ok: true,
      data: { kind: "render" },
    });
  });

  it("renders fallback for unsupported card", () => {
    const wrapper = mount(
      defineComponent({
        render() {
          return h(CardHost, {
            card: { card_type: "unknown", title: "x", data: {} } as any,
          });
        },
      })
    );
    expect(wrapper.text()).toContain("Unsupported card type");
  });
});
