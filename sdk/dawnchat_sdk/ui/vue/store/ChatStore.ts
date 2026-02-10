import { computed, ref } from 'vue'
import type { MessageMapperOptions, RawProtocolMessage } from '@dawnchat/shared-protocol'
import { createMessageMapper } from '@dawnchat/shared-protocol'
import type { StorageAdapter } from '../types'
import { defaultMessageMapperStrings } from '../defaults'

type ChatStoreOptions = {
  sessionId?: string
  storageAdapter?: StorageAdapter
  storageNamespace?: string
  messageMapperOptions?: MessageMapperOptions
  messageMapper?: ReturnType<typeof createMessageMapper>
}

const mergeStrings = (options?: MessageMapperOptions) => {
  const hil = { ...defaultMessageMapperStrings.hil, ...options?.strings?.hil }
  return {
    ...defaultMessageMapperStrings,
    ...options?.strings,
    hil
  }
}

export class ChatStore {
  rawMessages = ref<RawProtocolMessage[]>([])
  uiMessages = computed(() => this.mapper.mergeMessages(this.rawMessages.value))
  private messageIds = new Set<string>()
  private sessionId: string | null
  private storageAdapter?: StorageAdapter
  private storageNamespace?: string
  private mapper: ReturnType<typeof createMessageMapper>

  constructor(options?: ChatStoreOptions) {
    this.sessionId = options?.sessionId ?? null
    this.storageAdapter = options?.storageAdapter
    this.storageNamespace = options?.storageNamespace?.trim() || undefined
    if (options?.messageMapper) {
      this.mapper = options.messageMapper
    } else {
      const strings = mergeStrings(options?.messageMapperOptions)
      this.mapper = createMessageMapper({
        strings,
        sanitizeAssistantText: options?.messageMapperOptions?.sanitizeAssistantText
      })
    }
  }

  setSession(sessionId: string) {
    this.sessionId = sessionId
  }

  private getStorageKey(sessionId: string) {
    if (!this.storageNamespace) return sessionId
    return `${this.storageNamespace}:${sessionId}`
  }

  async loadSession(sessionId?: string) {
    const target = sessionId ?? this.sessionId
    if (!target || !this.storageAdapter) return
    this.sessionId = target
    const messages = await this.storageAdapter.loadSessionMessages(this.getStorageKey(target))
    const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp)
    this.rawMessages.value = sorted
    this.messageIds = new Set(sorted.map(message => message.id))
  }

  async addMessage(message: RawProtocolMessage) {
    const existingIndex = this.rawMessages.value.findIndex((item: RawProtocolMessage) => item.id === message.id)
    if (existingIndex >= 0) {
      this.rawMessages.value[existingIndex] = { ...this.rawMessages.value[existingIndex], ...message }
      if (this.storageAdapter && this.sessionId) {
        await this.storageAdapter.updateMessage(this.getStorageKey(this.sessionId), message)
      }
      return
    }
    this.messageIds.add(message.id)
    this.rawMessages.value.push(message)
    if (this.storageAdapter && this.sessionId) {
      await this.storageAdapter.saveMessage(this.getStorageKey(this.sessionId), message)
    }
  }

  async clearSession(sessionId?: string) {
    const target = sessionId ?? this.sessionId
    if (target && this.storageAdapter) {
      await this.storageAdapter.clearSession(this.getStorageKey(target))
    }
    this.rawMessages.value = []
    this.messageIds.clear()
  }
}
