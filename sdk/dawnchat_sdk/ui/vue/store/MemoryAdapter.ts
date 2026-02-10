import type { RawProtocolMessage } from '@dawnchat/shared-protocol'
import type { StorageAdapter } from '../types'

export class MemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, RawProtocolMessage[]>()

  async loadSessionMessages(sessionId: string) {
    return [...(this.store.get(sessionId) ?? [])]
  }

  async saveMessage(sessionId: string, message: RawProtocolMessage) {
    const list = this.store.get(sessionId) ?? []
    const index = list.findIndex(item => item.id === message.id)
    if (index >= 0) {
      list[index] = message
    } else {
      list.push(message)
    }
    this.store.set(sessionId, list)
  }

  async updateMessage(sessionId: string, message: RawProtocolMessage) {
    await this.saveMessage(sessionId, message)
  }

  async clearSession(sessionId: string) {
    this.store.delete(sessionId)
  }
}
