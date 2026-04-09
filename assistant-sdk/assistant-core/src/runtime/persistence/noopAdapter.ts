import type { PersistedViewStateRecord, ViewPersistenceAdapter } from "./types";

class NoopViewPersistenceAdapter implements ViewPersistenceAdapter {
  async getLatest(): Promise<PersistedViewStateRecord | null> {
    return null;
  }

  async put(_record: PersistedViewStateRecord): Promise<void> {
  }

  async delete(_storageKey: string): Promise<void> {
  }

  async clear(): Promise<void> {
  }
}

export function createNoopViewPersistenceAdapter(): ViewPersistenceAdapter {
  return new NoopViewPersistenceAdapter();
}
