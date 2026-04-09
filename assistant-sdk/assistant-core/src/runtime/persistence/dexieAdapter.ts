import Dexie, { type Table } from "dexie";

import type { PersistedViewStateRecord, ViewPersistenceAdapter } from "./types";

interface PersistenceDbRecord extends PersistedViewStateRecord {}

class AssistantPersistenceDexieDb extends Dexie {
  view_states!: Table<PersistenceDbRecord, string>;

  constructor(databaseName = "dawnchat_assistant_view_persistence") {
    super(databaseName);
    this.version(1).stores({
      view_states: "&storage_key, view_id, resource_key, updated_at_ms",
    });
  }
}

export class DexieViewPersistenceAdapter implements ViewPersistenceAdapter {
  private readonly db: AssistantPersistenceDexieDb;

  constructor(dbOrName?: AssistantPersistenceDexieDb | string) {
    this.db = typeof dbOrName === "string"
      ? new AssistantPersistenceDexieDb(dbOrName)
      : dbOrName || new AssistantPersistenceDexieDb();
  }

  async getLatest(): Promise<PersistedViewStateRecord | null> {
    const record = await this.db.view_states.orderBy("updated_at_ms").last();
    return record || null;
  }

  async put(record: PersistedViewStateRecord): Promise<void> {
    await this.db.view_states.put({
      ...record,
      payload: JSON.parse(JSON.stringify(record.payload)) as Record<string, unknown>,
    });
  }

  async delete(storageKey: string): Promise<void> {
    await this.db.view_states.delete(storageKey);
  }

  async clear(): Promise<void> {
    await this.db.view_states.clear();
  }
}
