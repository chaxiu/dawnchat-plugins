import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

import CardHost from "../../components/CardHost.vue";
import { resolveCardComponent } from "../registry";

describe("card registry", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("resolves known card type", () => {
    expect(resolveCardComponent("word")).toBeTruthy();
    expect(resolveCardComponent("confirm")).toBeTruthy();
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
      }),
      {
        attachTo: document.body,
      }
    );
    expect(document.body.textContent || "").toContain("Unsupported card type");
    wrapper.unmount();
  });
});
