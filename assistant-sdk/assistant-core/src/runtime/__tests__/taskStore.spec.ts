import { describe, expect, it } from "vitest";

import { createDexieTaskStore } from "../task";

function createStore() {
  return createDexieTaskStore(`assistant-task-test-${crypto.randomUUID()}`);
}

describe("DexieTaskStore", () => {
  it("creates, binds, and lists tasks", async () => {
    const store = createStore();
    const task = await store.createTask({
      task_id: "task-1",
      template_id: "general.task",
      title: "Task One",
      summary: "First task",
    });

    expect(task.surface_workspace_refs).toEqual({});

    await store.bindTaskWorkspace(task.task_id, "board.main", "ws-1");
    await store.setTaskActiveSurface(task.task_id, "board.main");
    await store.setCurrentTask(task.task_id);

    const detail = await store.getTask(task.task_id);
    expect(detail).toEqual(
      expect.objectContaining({
        task_id: "task-1",
        last_active_surface_id: "board.main",
        surface_workspace_refs: {
          "board.main": "ws-1",
        },
      })
    );

    const current = await store.getCurrentTask();
    expect(current?.task_id).toBe("task-1");

    const tasks = await store.listTasks({ limit: 10 });
    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.task_id).toBe("task-1");

    await store.clearAll();
  });
});
