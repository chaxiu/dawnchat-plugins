import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";

import TaskMainView from "../TaskMainView.vue";
import {
  resetTaskRuntimeState,
  setCurrentTaskState,
  setTaskRuntimeHandle,
  type TaskDetail,
  type TaskRuntime,
} from "../../../../runtime";

function createTask(overrides?: Partial<TaskDetail>): TaskDetail {
  return {
    task_id: "task-1",
    template_id: "general.task",
    title: "Task One",
    summary: "Summary",
    status: "draft",
    created_at_ms: 1,
    updated_at_ms: 2,
    surface_workspace_refs: {
      "board.main": "ws-1",
    },
    ...overrides,
  };
}

afterEach(() => {
  setTaskRuntimeHandle(null);
  resetTaskRuntimeState();
});

describe("TaskMainView", () => {
  it("renders the current task and resumes a workspace", async () => {
    const getCurrentTask = vi.fn().mockResolvedValue(createTask());
    const openWorkspaceForTask = vi.fn().mockResolvedValue({
      surface_id: "board.main",
      workspace_id: "ws-1",
      status: "opened",
    });
    const handle: TaskRuntime = {
      listTasks: vi.fn(),
      getTask: vi.fn(),
      getCurrentTask,
      createTask: vi.fn(),
      openTask: vi.fn(),
      renameTask: vi.fn(),
      setTaskActiveSurface: vi.fn(),
      bindTaskWorkspace: vi.fn(),
      listTaskTemplates: vi.fn(),
      openWorkspaceForTask,
    } as unknown as TaskRuntime;
    setTaskRuntimeHandle(handle);
    setCurrentTaskState(createTask());

    const wrapper = mount(TaskMainView);
    await Promise.resolve();
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("Task One");

    await wrapper.get("button.task-main-page__resume").trigger("click");

    expect(openWorkspaceForTask).toHaveBeenCalledWith("board.main", "ws-1");
  });
});
