import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

import CardHost from "../../components/CardHost.vue";
import { resolveCardComponent } from "../registry";

describe("card registry", () => {
  it("resolves known card type", () => {
    expect(resolveCardComponent("word")).toBeTruthy();
    expect(resolveCardComponent("unknown")).toBeNull();
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
