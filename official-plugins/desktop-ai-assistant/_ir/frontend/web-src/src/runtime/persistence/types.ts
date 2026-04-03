export interface PersistedViewStateRecord {
  storage_key: string;
  view_id: string;
  resource_key: string;
  version: number;
  updated_at_ms: number;
  payload: Record<string, unknown>;
}

export interface ViewPersistenceAdapter {
  getLatest(): Promise<PersistedViewStateRecord | null>;
  put(record: PersistedViewStateRecord): Promise<void>;
  delete(storageKey: string): Promise<void>;
  clear(): Promise<void>;
}
