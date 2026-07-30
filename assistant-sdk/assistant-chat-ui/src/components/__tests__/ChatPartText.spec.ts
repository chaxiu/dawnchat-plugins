import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import ChatPartText from "../ChatPartText.vue";

describe("ChatPartText", () => {
  it("renders GFM table and list markers as semantic HTML", () => {
    const wrapper = mount(ChatPartText, {
      props: {
        text: [
          "| Attribute | Before |",
          "| --- | --- |",
          "| required | On all 4 fields |",
          "",
          "- first item",
          "- second item",
          "",
          "1. one",
          "2. two",
        ].join("\n"),
      },
    });

    expect(wrapper.find("table").exists()).toBe(true);
    expect(wrapper.findAll("th").length).toBeGreaterThanOrEqual(2);
    expect(wrapper.findAll("td").length).toBeGreaterThanOrEqual(2);
    expect(wrapper.find("ul").exists()).toBe(true);
    expect(wrapper.find("ol").exists()).toBe(true);
    expect(wrapper.findAll("ul li").map((n) => n.text())).toEqual(["first item", "second item"]);
    expect(wrapper.findAll("ol li").map((n) => n.text())).toEqual(["one", "two"]);
  });
});
