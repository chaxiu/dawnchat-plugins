import "fake-indexeddb/auto";

if (typeof window !== "undefined") {
  Object.assign(window, {
    indexedDB: globalThis.indexedDB,
    IDBKeyRange: globalThis.IDBKeyRange,
  });
}
