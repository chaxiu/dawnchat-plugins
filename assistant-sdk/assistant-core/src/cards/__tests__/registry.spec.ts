import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

import { resolveCardComponent } from "../registry";

const CardHostStub = defineComponent({
  props: {
    card: { type: Object, required: true },
  },
  setup(props) {
    return () => {
      const card = props.card as { card_type: string };
      const Comp = resolveCardComponent(card.card_type);
      if (!Comp) {
        return h("div", "Unsupported card type");
      }
      return h(Comp, { card: props.card });
    };
  },
});

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
          return h(CardHostStub, {
            card: { card_type: "unknown", title: "x", data: {} } as Record<string, unknown>,
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
