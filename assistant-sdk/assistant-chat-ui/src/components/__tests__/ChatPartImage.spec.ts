import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import ChatPartImage from "../ChatPartImage.vue";
import ChatPartTool from "../ChatPartTool.vue";

describe("ChatPartImage", () => {
  it("renders a thumbnail and opens lightbox on click", async () => {
    const wrapper = mount(ChatPartImage, {
      props: {
        image: {
          url: "data:image/png;base64,abc",
          mime: "image/png",
          filename: "shot.png",
        },
      },
      attachTo: document.body,
    });

    const thumb = wrapper.find("button.part-image-thumb");
    expect(thumb.exists()).toBe(true);
    expect(thumb.find("img").attributes("src")).toBe("data:image/png;base64,abc");
    expect(document.body.querySelector(".part-image-lightbox")).toBeNull();

    await thumb.trigger("click");
    await wrapper.vm.$nextTick();

    const lightbox = document.body.querySelector(".part-image-lightbox");
    expect(lightbox).not.toBeNull();
    expect(lightbox?.querySelector("img")?.getAttribute("src")).toBe(
      "data:image/png;base64,abc",
    );

    wrapper.unmount();
  });
});

describe("ChatPartTool images", () => {
  it("renders toolDisplay.images below the tool line", () => {
    const wrapper = mount(ChatPartTool, {
      props: {
        tool: "session_observe",
        status: "completed",
        display: {
          toolName: "session_observe",
          title: "session_observe",
          images: [
            {
              url: "data:image/png;base64,xyz",
              mime: "image/png",
              filename: "observe.png",
            },
          ],
        },
      },
    });

    expect(wrapper.find(".chat-image-strip").exists()).toBe(true);
    expect(wrapper.find(".part-image-thumb img").attributes("src")).toBe(
      "data:image/png;base64,xyz",
    );
  });
});
