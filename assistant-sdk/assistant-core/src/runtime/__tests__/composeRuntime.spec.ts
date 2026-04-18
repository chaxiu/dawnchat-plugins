import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { composeAssistantCoreRuntime } from "../bootstrap/composeRuntime";
import * as taskModule from "../task";
import type { TaskStore } from "../task";
import * as workspaceModule from "../workspace";
import type { WorkspaceStore } from "../workspace";

function createMockWorkspaceStore(): WorkspaceStore {
  return {
    getLastActiveSurfaceId: vi.fn(async () => null),
    setLastActiveSurfaceId: vi.fn(async () => {}),
    getActiveWorkspaceId: vi.fn(async () => null),
    setActiveWorkspace: vi.fn(async () => {}),
    listWorkspaces: vi.fn(async () => []),
    renameWorkspace: vi.fn(async () => null),
    createWorkspaceWithHead: vi.fn(async () => {}),
    getWorkspaceHead: vi.fn(async () => null),
    updateHead: vi.fn(async () => {}),
    appendSnapshot: vi.fn(async () => {}),
    countHistorySnapshots: vi.fn(async () => 0),
    listSnapshots: vi.fn(async () => []),
    getSnapshotBySeq: vi.fn(async () => null),
    clearAll: vi.fn(async () => {}),
  };
}

function createMockTaskStore(): TaskStore {
  return {
    listTasks: vi.fn(async () => []),
    getTask: vi.fn(async () => null),
    getCurrentTaskId: vi.fn(async () => null),
    getCurrentTask: vi.fn(async () => null),
    setCurrentTask: vi.fn(async () => {}),
    createTask: vi.fn(async (input) => ({
      task_id: input.task_id,
      template_id: input.template_id,
      title: input.title,
      summary: input.summary,
      status: "draft",
      created_at_ms: 1,
      updated_at_ms: 1,
      surface_workspace_refs: {},
    })),
    updateTaskMeta: vi.fn(async () => null),
    setTaskActiveSurface: vi.fn(async () => null),
    bindTaskWorkspace: vi.fn(async () => null),
    clearAll: vi.fn(async () => {}),
  };
}

describe("composeAssistantCoreRuntime", () => {
  let createDexieSpy: ReturnType<typeof vi.spyOn>;
  let createTaskDexieSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    createDexieSpy = vi.spyOn(workspaceModule, "createDexieWorkspaceStore");
    createTaskDexieSpy = vi.spyOn(taskModule, "createDexieTaskStore");
  });

  afterEach(() => {
    createDexieSpy.mockRestore();
    createTaskDexieSpy.mockRestore();
  });

  it("uses injected workspaceStore and taskStore without creating Dexie defaults", () => {
    const mockStore = createMockWorkspaceStore();
    const mockTaskStore = createMockTaskStore();
    const { workspaceRuntime, taskRuntime, registrations } = composeAssistantCoreRuntime({
      workspaceStore: mockStore,
      taskStore: mockTaskStore,
    });
    expect(workspaceRuntime.getWorkspaceStore()).toBe(mockStore);
    expect(taskRuntime).toBeTruthy();
    expect(registrations.map((item) => item.definition.name)).toEqual(expect.arrayContaining([
      "assistant.workspace.list",
      "assistant.workspace.get_current",
      "assistant.workspace.checkpoint",
    ]));
    expect(createDexieSpy).not.toHaveBeenCalled();
    expect(createTaskDexieSpy).not.toHaveBeenCalled();
  });

  it("creates Dexie workspace and task stores when stores are omitted", () => {
    composeAssistantCoreRuntime({
      persistenceScope: `compose-test-${crypto.randomUUID()}`,
    });
    expect(createDexieSpy).toHaveBeenCalledTimes(1);
    expect(createTaskDexieSpy).toHaveBeenCalledTimes(1);
    expect(typeof createDexieSpy.mock.calls[0]?.[0]).toBe("string");
    expect(typeof createTaskDexieSpy.mock.calls[0]?.[0]).toBe("string");
  });
});
