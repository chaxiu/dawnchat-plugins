import type { WorkspaceCheckpointRecord } from "./checkpointTypes";

const DEFAULT_STORAGE_KEY = "dawnchat.desktop-ai-assistant.workspace-checkpoint.v1";

export interface CheckpointStorageAdapter {
  read: () => WorkspaceCheckpointRecord | null;
  write: (record: WorkspaceCheckpointRecord) => void;
  clear: () => void;
}

function cloneJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getBrowserStorage(): Storage | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  return window.localStorage;
}

export function createLocalStorageCheckpointAdapter(
  storageKey = DEFAULT_STORAGE_KEY
): CheckpointStorageAdapter {
  return {
    read: () => {
      const storage = getBrowserStorage();
      if (!storage) {
        return null;
      }
      const raw = storage.getItem(storageKey);
      if (!raw) {
        return null;
      }
      try {
        return cloneJsonValue(JSON.parse(raw) as WorkspaceCheckpointRecord);
      } catch {
        return null;
      }
    },
    write: (record) => {
      const storage = getBrowserStorage();
      if (!storage) {
        return;
      }
      storage.setItem(storageKey, JSON.stringify(record));
    },
    clear: () => {
      const storage = getBrowserStorage();
      if (!storage) {
        return;
      }
      storage.removeItem(storageKey);
    },
  };
}
