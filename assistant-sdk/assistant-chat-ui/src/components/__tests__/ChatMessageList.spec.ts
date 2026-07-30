import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";

import ChatMessageList from "../ChatMessageList.vue";

describe("ChatMessageList", () => {
  it("question 卡片可提交答案并发出事件", async () => {
    const wrapper = mount(ChatMessageList, {
      props: {
        timelineItems: [
          {
            id: "que_1",
            kind: "question",
            question: {
              id: "que_1",
              questions: [
                {
                  header: "Q1",
                  question: "请选择一个选项",
                  options: [
                    { label: "A", description: "选项A" },
                    { label: "B", description: "选项B" },
                  ],
                },
              ],
            },
          },
        ],
        activeReasoningItemId: "",
        isStreaming: false,
        waitingReason: "",
        canSwitchPlanToBuild: false,
        lastError: null,
      },
    });

    await wrapper.find(".question-option-btn").trigger("click");
    await wrapper.find(".question-actions .permission-btn").trigger("click");

    const emitted = wrapper.emitted("question-reply");
    expect(emitted).toBeTruthy();
    expect(emitted?.[0]?.[0]).toBe("que_1");
    expect(emitted?.[0]?.[1]).toEqual([["A"]]);
  });

  it("question 卡片可拒绝并发出事件", async () => {
    const wrapper = mount(ChatMessageList, {
      props: {
        timelineItems: [
          {
            id: "que_2",
            kind: "question",
            question: {
              id: "que_2",
              questions: [
                {
                  header: "Q1",
                  question: "是否继续",
                  options: [{ label: "继续", description: "" }],
                },
              ],
            },
          },
        ],
        activeReasoningItemId: "",
        isStreaming: false,
        waitingReason: "",
        canSwitchPlanToBuild: false,
        lastError: null,
      },
    });

    await wrapper.find(".question-actions .permission-btn.danger").trigger("click");
    expect(wrapper.emitted("question-reject")?.[0]).toEqual(["que_2"]);
  });

  it("todo dock 支持折叠并高亮 in_progress 项", async () => {
    const wrapper = mount(ChatMessageList, {
      props: {
        timelineItems: [
          {
            id: "todo_1",
            kind: "todo",
            todos: [
              { id: "todo_1", content: "write tests", status: "completed" },
              { id: "todo_2", content: "apply patch", status: "in_progress" },
            ],
          },
        ],
        activeReasoningItemId: "",
        isStreaming: false,
        waitingReason: "",
        canSwitchPlanToBuild: false,
        lastError: null,
      },
    });

    expect(wrapper.find('.todo-item[data-active="true"]').text()).toContain("apply patch");
    expect(wrapper.find(".todo-list").isVisible()).toBe(true);
    await wrapper.find(".todo-header").trigger("click");
    await nextTick();
    expect(wrapper.find(".todo-list").attributes("style")).toContain("display: none");
    expect(wrapper.text()).toContain("1/2");
  });

  it("可切 Build 且已有 assistant 回复时显示快捷切换按钮", async () => {
    const wrapper = mount(ChatMessageList, {
      props: {
        timelineItems: [
          {
            id: "msg_a_part_a",
            kind: "part",
            role: "assistant",
            item: { id: "part_a", type: "text", text: "plan done", isStreaming: false },
          },
        ],
        activeReasoningItemId: "",
        isStreaming: false,
        waitingReason: "",
        canSwitchPlanToBuild: true,
        lastError: null,
      },
    });
    const button = wrapper.find(".plan-quick-switch-btn");
    expect(button.exists()).toBe(true);
    await button.trigger("click");
    expect(wrapper.emitted("switch-to-build")).toBeTruthy();
  });

  it("独立 permission 卡片可触发 once/always/reject", async () => {
    const wrapper = mount(ChatMessageList, {
      props: {
        timelineItems: [
          {
            id: "perm_1",
            kind: "permission",
            permission: {
              id: "perm_1",
              tool: "bash",
              detail: "需要执行 ls -la",
              status: "pending",
            },
          },
        ],
        activeReasoningItemId: "",
        isStreaming: false,
        waitingReason: "",
        canSwitchPlanToBuild: false,
        lastError: null,
      },
    });
    expect(wrapper.find(".permission-tool").text()).toBe("bash");
    expect(wrapper.find(".permission-badge").text()).toBe("待确认");
    const buttons = wrapper.findAll(".permission-actions .permission-btn");
    expect(buttons).toHaveLength(3);
    await buttons[0].trigger("click");
    await buttons[1].trigger("click");
    await buttons[2].trigger("click");
    const events = wrapper.emitted("permission") || [];
    expect(events[0]).toEqual(["perm_1", "once", undefined]);
    expect(events[1]).toEqual(["perm_1", "always", true]);
    expect(events[2]).toEqual(["perm_1", "reject", undefined]);
  });

  it("非 pending permission 不渲染操作按钮", async () => {
    const wrapper = mount(ChatMessageList, {
      props: {
        timelineItems: [
          {
            id: "perm_2",
            kind: "permission",
            permission: {
              id: "perm_2",
              tool: "bash",
              detail: "已处理",
              status: "approved",
            },
          },
        ],
        activeReasoningItemId: "",
        isStreaming: false,
        waitingReason: "",
        canSwitchPlanToBuild: false,
        lastError: null,
      },
    });
    expect(wrapper.find(".permission-actions").exists()).toBe(false);
    expect(wrapper.find(".permission-badge").text()).toBe("已批准");
  });

  it("timeline 数量不变但文本增量变长时仍会触发自动滚动", async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mount(ChatMessageList, {
        attachTo: document.body,
        props: {
          timelineItems: [
            {
              id: "msg_a_part_a",
              kind: "part",
              role: "assistant",
              item: { id: "part_a", type: "text", text: "a", isStreaming: true },
            },
          ],
          activeReasoningItemId: "",
          isStreaming: true,
          waitingReason: "",
          canSwitchPlanToBuild: false,
          lastError: null,
        },
      });

      const element = wrapper.find(".message-list").element as HTMLElement;
      Object.defineProperty(element, "clientHeight", { value: 100, configurable: true });
      Object.defineProperty(element, "scrollHeight", { value: 120, configurable: true });
      element.scrollTop = 0;

      await nextTick();
      await vi.advanceTimersByTimeAsync(40);

      Object.defineProperty(element, "scrollHeight", { value: 260, configurable: true });
      await wrapper.setProps({
        timelineItems: [
          {
            id: "msg_a_part_a",
            kind: "part",
            role: "assistant",
            item: { id: "part_a", type: "text", text: "abcdef", isStreaming: true },
          },
        ],
      });
      await vi.advanceTimersByTimeAsync(80);
      await nextTick();

      expect(element.scrollTop).toBe(260);
      wrapper.unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it("首段等待时会在消息末尾显示 loading 占位，首条 assistant 消息到达后立即隐藏", async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mount(ChatMessageList, {
        props: {
          timelineItems: [
            {
              id: "msg_wait_user",
              kind: "part",
              role: "user",
              item: { id: "part_wait_user", type: "text", text: "hello", isStreaming: false },
            },
          ],
          activeReasoningItemId: "",
          isStreaming: true,
          waitingReason: "",
          canSwitchPlanToBuild: false,
          lastError: null,
        },
      });

      expect(wrapper.find(".waiting-placeholder").exists()).toBe(true);
      const rows = wrapper.find(".message-list").element.children;
      expect((rows[rows.length - 1] as HTMLElement).className).toContain("waiting-placeholder");

      await wrapper.setProps({
        timelineItems: [
          {
            id: "msg_wait_user",
            kind: "part",
            role: "user",
            item: { id: "part_wait_user", type: "text", text: "hello", isStreaming: false },
          },
          {
            id: "msg_wait_assistant",
            kind: "part",
            role: "assistant",
            item: { id: "part_wait_assistant", type: "text", text: "world", isStreaming: true },
          },
        ],
      });
      await nextTick();
      expect(wrapper.find(".waiting-placeholder").exists()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("task 卡片点击发出 task-open", async () => {
    const wrapper = mount(ChatMessageList, {
      props: {
        timelineItems: [
          {
            id: "task_1",
            kind: "task",
            task: {
              id: "task_1",
              title: "Research topic",
              status: "running",
              agentLabel: "research",
              summary: "Gathering sources",
            },
          },
        ],
        activeReasoningItemId: "",
        isStreaming: false,
        waitingReason: "",
        canSwitchPlanToBuild: false,
        lastError: null,
      },
    });

    expect(wrapper.find(".task-card").exists()).toBe(true);
    expect(wrapper.text()).toContain("Research topic");
    await wrapper.find(".task-card").trigger("click");
    expect(wrapper.emitted("task-open")?.[0]).toEqual(["task_1"]);
  });

  it("file-edit 卡片点击文件名发出 file-open，并支持展开", async () => {
    const wrapper = mount(ChatMessageList, {
      props: {
        timelineItems: [
          {
            id: "edit_1",
            kind: "file-edit",
            fileEdit: {
              id: "prt_edit",
              callId: "call_1",
              tool: "edit",
              status: "completed",
              files: [
                {
                  path: "src/foo.ts",
                  displayName: "foo.ts",
                  unifiedDiff: "--- a/src/foo.ts\n+++ b/src/foo.ts\n@@ -1 +1 @@\n-old\n+new\n",
                  additions: 1,
                  deletions: 1,
                  previewMode: "diff",
                },
              ],
            },
          },
        ],
        activeReasoningItemId: "",
        isStreaming: false,
        waitingReason: "",
        canSwitchPlanToBuild: false,
        lastError: null,
      },
    });

    expect(wrapper.find(".file-edit-card").exists()).toBe(true);
    expect(wrapper.text()).toContain("foo.ts");
    expect(wrapper.text()).toContain("new");
    expect(wrapper.text()).not.toContain("+new");
    expect(wrapper.find(".file-edit-body--collapsed").exists()).toBe(true);
    expect(wrapper.find(".file-edit-body--expanded").exists()).toBe(false);
    await wrapper.find(".file-edit-toggle").trigger("click");
    expect(wrapper.find(".file-edit-body--expanded").exists()).toBe(true);
    expect(wrapper.find(".file-edit-body--collapsed").exists()).toBe(false);
    await wrapper.find(".file-edit-name").trigger("click");
    expect(wrapper.emitted("file-open")?.[0]).toEqual(["src/foo.ts"]);
  });

  it("tool 行带 openPath 的 argsPreview 点击发出 file-open", async () => {
    const wrapper = mount(ChatMessageList, {
      props: {
        timelineItems: [
          {
            id: "tool_read",
            kind: "part",
            role: "assistant",
            item: {
              id: "prt_read",
              type: "tool",
              tool: "read",
              status: "completed",
              isStreaming: false,
              toolDisplay: {
                toolName: "read",
                title: "read",
                argsPreview: "foo.ts",
                argsText: "src/foo.ts",
                openPath: "src/foo.ts",
                hasInput: true,
                fullInputText: '{"filePath":"src/foo.ts"}',
              },
            },
          },
        ],
        activeReasoningItemId: "",
        isStreaming: false,
        waitingReason: "",
        canSwitchPlanToBuild: false,
        lastError: null,
      },
    });

    expect(wrapper.find(".tool-args--link").text()).toContain("foo.ts");
    await wrapper.find(".tool-args--link").trigger("click");
    expect(wrapper.emitted("file-open")?.[0]).toEqual(["src/foo.ts"]);
  });
});
