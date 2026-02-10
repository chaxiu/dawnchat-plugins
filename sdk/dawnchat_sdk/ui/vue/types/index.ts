import type { MessageMapperOptions, RawProtocolMessage, UIMessage } from '@dawnchat/shared-protocol'
import { createMessageMapper } from '@dawnchat/shared-protocol'

export type { MessageMapperOptions, RawProtocolMessage, UIMessage }
export { createMessageMapper }

export type ZmpDirection = 'request' | 'response' | 'event'

export interface ZmpContext {
  task_id?: string
  workflow_id?: string
  session_id?: string
  stage_id?: string
  terminal_id?: string
}

export interface ZmpEnvelope {
  protocol: 'zmp'
  version: '2.0'
  trace_id: string
  message_id: string
  project_id: string
  timestamp: number
  type: string
  direction: ZmpDirection
  context?: ZmpContext
  payload: Record<string, unknown>
}

export type ConnectionState = 'idle' | 'connecting' | 'open' | 'closed' | 'error' | 'reconnecting'

export interface ModelConfig {
  provider: string
  model: string
  temperature?: number
  max_tokens?: number
}

export interface UserCommandPayload {
  text: string
  files?: string[]
  model_config?: ModelConfig
  mode?: string
  workflow_context?: Record<string, unknown>
  plugin_context?: Record<string, unknown>
  chat_history?: RawProtocolMessage[]
}

export interface StorageAdapter {
  loadSessionMessages(sessionId: string): Promise<RawProtocolMessage[]>
  saveMessage(sessionId: string, message: RawProtocolMessage): Promise<void>
  updateMessage(sessionId: string, message: RawProtocolMessage): Promise<void>
  clearSession(sessionId: string): Promise<void>
}

export interface ZmpLiteClientOptions {
  url: string
  projectId?: string
  sessionId?: string
  capabilities?: string[]
  heartbeatInterval?: number
  reconnect?: {
    enabled?: boolean
    maxAttempts?: number
    baseDelay?: number
  }
}

export interface ChatSessionConfig {
  wsUrl: string
  projectId?: string
  sessionId?: string
  dbPath?: string
  namespace?: string
  mode?: string
  pluginContext?: Record<string, unknown>
  workflowContext?: Record<string, unknown>
  modelConfig?: ModelConfig
  messageMapperOptions?: MessageMapperOptions
  messageMapper?: ReturnType<typeof createMessageMapper>
  storageAdapter?: StorageAdapter
  storageNamespace?: string
  autoConnect?: boolean
  heartbeatInterval?: number
  capabilities?: string[]
  reconnect?: ZmpLiteClientOptions['reconnect']
}
