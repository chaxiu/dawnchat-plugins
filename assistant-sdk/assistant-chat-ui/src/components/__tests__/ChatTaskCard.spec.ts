import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import ChatTaskCard from "../ChatTaskCard.vue";

function mountCard(task: Record<string, unknown>) {
  return mount(ChatTaskCard, {
    props: {
      task: { id: "task-1", title: "Research model support", ...task },
      agentLabel: "Scout",
    },
  });
}

describe("ChatTaskCard model badge", () => {
  it("renders a model chip with modelLabel and modelTitle tooltip", () => {
    const wrapper = mountCard({
      modelLabel: "gpt-5.1",
      modelTitle: "openai/gpt-5.1",
    });

    const chips = wrapper.findAll(".task-meta-chip");
    expect(chips).toHaveLength(1);
    expect(chips[0].text()).toBe("gpt-5.1");
    expect(chips[0].attributes("title")).toBe("openai/gpt-5.1");
  });

  it("falls back to modelLabel for the chip title when modelTitle is missing", () => {
    const wrapper = mountCard({ modelLabel: "claude-sonnet-4.6" });

    const chip = wrapper.find(".task-meta-chip");
    expect(chip.exists()).toBe(true);
    expect(chip.text()).toBe("claude-sonnet-4.6");
    expect(chip.attributes("title")).toBe("claude-sonnet-4.6");
  });

  it("falls back to modelLabel when modelTitle is blank", () => {
    const wrapper = mountCard({ modelLabel: "gpt-5.1", modelTitle: "   " });

    expect(wrapper.find(".task-meta-chip").attributes("title")).toBe("gpt-5.1");
  });

  it("does not render a model chip without modelLabel", () => {
    const wrapper = mountCard({});

    expect(wrapper.find(".task-meta-chip").exists()).toBe(false);
    expect(wrapper.find(".task-model-row").exists()).toBe(false);
  });

  it("does not render a model chip for a blank modelLabel", () => {
    const wrapper = mountCard({ modelLabel: "   " });

    expect(wrapper.find(".task-meta-chip").exists()).toBe(false);
    expect(wrapper.find(".task-model-row").exists()).toBe(false);
  });

  it("keeps existing agent, summary and expanded meta rendering intact", async () => {
    const wrapper = mountCard({
      agentLabel: "Scout",
      summary: "Full provider/model identifier surfaced.",
      mode: "read-only",
      writeScope: ["src"],
      durationMs: 2500,
      exitCode: 0,
      expandableInline: true,
      prompt: "Find the model name",
      output: "done",
      modelLabel: "gpt-5.1",
    });

    expect(wrapper.find(".task-agent").text()).toBe("Scout");
    expect(wrapper.find(".task-summary").text()).toContain(
      "Full provider/model identifier surfaced.",
    );

    await wrapper.find(".task-card").trigger("click");

    const chips = wrapper.findAll(".task-inline-meta .task-meta-chip");
    expect(chips.map((chip) => chip.text())).toEqual([
      "mode: read-only",
      "scope: src",
      "2.5s",
      "exit: 0",
    ]);
    expect(wrapper.find(".task-model-row .task-meta-chip").text()).toBe("gpt-5.1");
  });

  it("emits task-open on click and keyboard activation", async () => {
    const wrapper = mountCard({ expandableInline: true });

    await wrapper.find(".task-card").trigger("click");
    await wrapper.find(".task-card").trigger("keydown.enter");

    expect(wrapper.emitted("task-open")).toEqual([["task-1"], ["task-1"]]);
  });
});
