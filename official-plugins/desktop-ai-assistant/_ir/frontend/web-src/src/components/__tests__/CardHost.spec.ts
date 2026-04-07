import { mount } from "@vue/test-utils";
import { nextTick } from "vue";

import CardHost from "../CardHost.vue";
import {
  ASSISTANT_UI_LAYER_GUIDE,
  GUIDE_STACK_BOTTOM,
  GUIDE_STACK_LEFT,
} from "../../runtime/assistantUiLayout";
import { useGuideState } from "../../runtime/guide/state";

describe("CardHost", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  beforeEach(() => {
    useGuideState().resetGuideState();
  });

  it("stays hidden when no guide ui payload exists", () => {
    const wrapper = mount(CardHost, {
      attachTo: document.body,
      props: {
        card: null,
        tip: null,
        narration: {
          status: "idle",
          text: "",
          updatedAtMs: Date.now(),
        },
      },
    });
    expect(wrapper.find(".host").exists()).toBe(false);
  });

  it("renders in left-bottom bubble stack with narration content", () => {
    const wrapper = mount(CardHost, {
      attachTo: document.body,
      props: {
        card: null,
        tip: null,
        narration: {
          status: "playing",
          text: "正在讲解",
          updatedAtMs: Date.now(),
        },
      },
    });
    const host = document.body.querySelector(".host") as HTMLElement | null;
    expect(host).not.toBeNull();
    const hostStyle = host?.getAttribute("style") || "";
    expect(hostStyle).toContain(`left: ${GUIDE_STACK_LEFT}px;`);
    expect(hostStyle).toContain(`bottom: ${GUIDE_STACK_BOTTOM}px;`);
    expect(hostStyle).toContain(`z-index: ${ASSISTANT_UI_LAYER_GUIDE};`);
    expect(document.body.textContent || "").toContain("正在讲解");
  });

  it("supports user close for active guide card", async () => {
    const guideState = useGuideState();
    guideState.setCurrentCard({
      card_type: "word",
      title: "Close Test",
      data: {
        word: "Agent",
      },
    });
    const wrapper = mount(CardHost, {
      attachTo: document.body,
      props: {
        card: guideState.currentCard.value,
        tip: null,
        narration: {
          status: "idle",
          text: "",
          updatedAtMs: Date.now(),
        },
      },
    });
    const closeButton = document.body.querySelector(".card-close-btn") as HTMLButtonElement | null;
    expect(closeButton).not.toBeNull();
    closeButton?.click();
    await nextTick();
    expect(guideState.currentCard.value).toBeNull();
  });
});
