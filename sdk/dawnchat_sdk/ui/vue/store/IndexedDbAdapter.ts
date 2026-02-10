import type { RawProtocolMessage } from '@dawnchat/shared-protocol'
import type { StorageAdapter } from '../types'

type StoredMessage = {
  key: string
  sessionId: string
  timestamp: number
  message: RawProtocolMessage
}

type IndexedDbAdapterOptions = {
  dbName?: string
  storeName?: string
  version?: number
  dbPath?: string
  namespace?: string
}

const normalizeSegment = (value: string) => value.trim().replace(/[^a-zA-Z0-9_-]+/g, '_')

const buildDbName = (dbPath?: string, namespace?: string) => {
  if (dbPath && dbPath.trim()) {
    const normalized = dbPath
      .split('/')
      .map(segment => normalizeSegment(segment))
      .filter(Boolean)
      .join('_')
    if (normalized) {
      return `dawnchat_${normalized}`
    }
  }
  if (namespace && namespace.trim()) {
    return `dawnchat_chat_${normalizeSegment(namespace)}`
  }
  return 'dawnchat_chat'
}

export class IndexedDbAdapter implements StorageAdapter {
  private dbName: string
  private storeName: string
  private version: number
  private namespace?: string

  constructor(options?: IndexedDbAdapterOptions) {
    this.namespace = options?.namespace?.trim() || undefined
    this.dbName = options?.dbName ?? buildDbName(options?.dbPath, this.namespace)
    this.storeName = options?.storeName ?? 'messages'
    this.version = options?.version ?? 1
  }

  async loadSessionMessages(sessionId: string) {
    const db = await this.openDb()
    return new Promise<RawProtocolMessage[]>((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly')
      const store = tx.objectStore(this.storeName)
      const index = store.index('sessionId')
      const request = index.getAll(IDBKeyRange.only(sessionId))
      request.onsuccess = () => {
        const items = (request.result as StoredMessage[]) ?? []
        const messages = items.map(item => item.message).sort((a, b) => a.timestamp - b.timestamp)
        resolve(messages)
      }
      request.onerror = () => reject(request.error)
      tx.oncomplete = () => db.close()
      tx.onerror = () => db.close()
    })
  }

  async saveMessage(sessionId: string, message: RawProtocolMessage) {
    await this.putMessage(sessionId, message)
  }

  async updateMessage(sessionId: string, message: RawProtocolMessage) {
    await this.putMessage(sessionId, message)
  }

  async clearSession(sessionId: string) {
    const db = await this.openDb()
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite')
      const store = tx.objectStore(this.storeName)
      const index = store.index('sessionId')
      const request = index.getAllKeys(IDBKeyRange.only(sessionId))
      request.onsuccess = () => {
        const keys = request.result as IDBValidKey[]
        keys.forEach(key => store.delete(key))
      }
      request.onerror = () => reject(request.error)
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        reject(tx.error)
      }
    })
  }

  private async putMessage(sessionId: string, message: RawProtocolMessage) {
    const db = await this.openDb()
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite')
      const store = tx.objectStore(this.storeName)
      const record: StoredMessage = {
        key: `${sessionId}:${message.id}`,
        sessionId,
        timestamp: message.timestamp,
        message
      }
      const request = store.put(record)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
      tx.oncomplete = () => db.close()
      tx.onerror = () => db.close()
    })
  }

  private openDb() {
    if (typeof indexedDB === 'undefined') {
      return Promise.reject(new Error('IndexedDB is not available'))
    }
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' })
          store.createIndex('sessionId', 'sessionId', { unique: false })
          store.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }
}
