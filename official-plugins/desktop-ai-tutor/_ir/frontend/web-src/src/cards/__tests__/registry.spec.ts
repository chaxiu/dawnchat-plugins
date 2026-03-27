import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

import CardHost from "../../components/CardHost.vue";
import { listCardFunctions, resolveCardComponent } from "../registry";

describe("card registry", () => {
  it("resolves known card type", () => {
    expect(resolveCardComponent("word")).toBeTruthy();
    expect(resolveCardComponent("unknown")).toBeNull();
  });

  it("returns callable function definitions", () => {
    const defs = listCardFunctions();
    const names = defs.map((item) => item.name);
    expect(names).toContain("tutor.render_card");
    expect(names).toContain("tutor.clear_cards");
  });

  it("renders fallback for unsupported card", () => {
    const wrapper = mount(
      defineComponent({
        render() {
          return h(CardHost, {
            cards: [{ card_type: "unknown", title: "x", data: {} } as any],
          });
        },
      })
    );
    expect(wrapper.text()).toContain("Unsupported card type");
  });
});
