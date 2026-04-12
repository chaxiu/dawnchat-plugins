import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { composeAssistantCoreRuntime } from "../bootstrap/composeRuntime";
import * as workspaceModule from "../workspace";
import type { WorkspaceStore } from "../workspace";

function createMockWorkspaceStore(): WorkspaceStore {
  return {
    getLastActiveSurfaceId: vi.fn(async () => null),
    setLastActiveSurfaceId: vi.fn(async () => {}),
    getActiveWorkspaceId: vi.fn(async () => null),
    setActiveWorkspace: vi.fn(async () => {}),
    listWorkspaces: vi.fn(async () => []),
    createWorkspaceWithHead: vi.fn(async () => {}),
    getWorkspaceHead: vi.fn(async () => null),
    updateHead: vi.fn(async () => {}),
    appendSnapshot: vi.fn(async () => {}),
    countHistorySnapshots: vi.fn(async () => 0),
    clearAll: vi.fn(async () => {}),
  };
}

describe("composeAssistantCoreRuntime", () => {
  let createDexieSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    createDexieSpy = vi.spyOn(workspaceModule, "createDexieWorkspaceStore");
  });

  afterEach(() => {
    createDexieSpy.mockRestore();
  });

  it("uses injected workspaceStore and does not call createDexieWorkspaceStore", () => {
    const mockStore = createMockWorkspaceStore();
    const { workspaceRuntime } = composeAssistantCoreRuntime({
      workspaceStore: mockStore,
    });
    expect(workspaceRuntime.getWorkspaceStore()).toBe(mockStore);
    expect(createDexieSpy).not.toHaveBeenCalled();
  });

  it("creates Dexie workspace store when workspaceStore is omitted", () => {
    composeAssistantCoreRuntime({
      persistenceScope: `compose-test-${crypto.randomUUID()}`,
    });
    expect(createDexieSpy).toHaveBeenCalledTimes(1);
    expect(typeof createDexieSpy.mock.calls[0]?.[0]).toBe("string");
  });
});
