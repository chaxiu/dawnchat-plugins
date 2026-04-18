import { beforeEach, describe, expect, it, vi } from "vitest";

const { openAssistantViewFromShell } = vi.hoisted(() => ({
  openAssistantViewFromShell: vi.fn(),
}));

vi.mock("../view", () => ({
  openAssistantViewFromShell,
}));

import {
  createDexieTaskStore,
  createTaskCapabilityRegistrations,
  createTaskRuntime,
  TASK_MAIN_VIEW_ID,
} from "../task";

function createRuntime() {
  const store = createDexieTaskStore(`assistant-task-runtime-${crypto.randomUUID()}`);
  const openWorkspace = vi.fn().mockResolvedValue(undefined);
  const runtime = createTaskRuntime({
    store,
    openWorkspace,
  });
  return { store, runtime, openWorkspace };
}

describe("taskRuntime", () => {
  beforeEach(() => {
    openAssistantViewFromShell.mockReset();
    openAssistantViewFromShell.mockResolvedValue({
      ok: true,
      data: {
        view_id: TASK_MAIN_VIEW_ID,
      },
    });
  });

  it("creates and opens a task through task.main", async () => {
    const { runtime, store } = createRuntime();

    const task = await runtime.createTask({
      template_id: "general.task",
      title: "Draft Task",
    });
    const openResult = await runtime.openTask(task.task_id);

    expect(openResult).toEqual({
      task_id: task.task_id,
      opened_view_id: TASK_MAIN_VIEW_ID,
      status: "opened",
    });
    expect(openAssistantViewFromShell).toHaveBeenCalledWith(TASK_MAIN_VIEW_ID);
    expect((await store.getCurrentTask())?.task_id).toBe(task.task_id);

    await store.clearAll();
  });

  it("binds workspaces and resumes a workspace head", async () => {
    const { runtime, store, openWorkspace } = createRuntime();
    const task = await runtime.createTask({
      template_id: "general.task",
      title: "Resume Task",
    });
    await runtime.openTask(task.task_id);
    await runtime.bindTaskWorkspace(task.task_id, "board.main", "ws-1");
    const result = await runtime.openWorkspaceForTask("board.main", "ws-1");

    expect(result).toEqual({
      surface_id: "board.main",
      workspace_id: "ws-1",
      status: "opened",
    });
    expect(openWorkspace).toHaveBeenCalledWith("board.main", "ws-1");
    expect((await store.getTask(task.task_id))?.last_active_surface_id).toBe("board.main");

    await store.clearAll();
  });

  it("registers the Phase 1 task capabilities", () => {
    const { runtime } = createRuntime();
    const registrations = createTaskCapabilityRegistrations(runtime);
    expect(registrations.map((item) => item.definition.name)).toEqual([
      "assistant.task.list",
      "assistant.task.describe",
      "assistant.task.get_current",
      "assistant.task.create",
      "assistant.task.open",
      "assistant.task.rename",
      "assistant.task.set_active_surface",
      "assistant.task.bind_workspace",
      "assistant.task_template.list",
    ]);
  });
});
