import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { RawProtocolMessage, UserCommandPayload, ZmpEnvelope, ChatSessionConfig, ConnectionState, ModelConfig } from '../types'
import { ZmpLiteClient } from '../client/ZmpLiteClient'
import { ChatStore } from '../store/ChatStore'
import { IndexedDbAdapter } from '../store/IndexedDbAdapter'

export type UseChatSessionConfig = ChatSessionConfig & {
  client?: ZmpLiteClient
  store?: ChatStore
}

const toRawProtocolMessage = (envelope: ZmpEnvelope, senderId = 'assistant'): RawProtocolMessage => ({
  id: envelope.message_id,
  trace_id: envelope.trace_id,
  message_type: envelope.type,
  project_id: envelope.project_id,
  payload: envelope.payload ?? {},
  timestamp: envelope.timestamp ?? Date.now(),
  sender_id: senderId
})

export const useChatSession = (config: UseChatSessionConfig) => {
  const storageNamespace = config.storageNamespace ?? config.namespace
  const storageAdapter = config.storageAdapter ?? ((config.dbPath || storageNamespace) ? new IndexedDbAdapter({
    dbPath: config.dbPath,
    namespace: storageNamespace
  }) : undefined)

  const store = config.store ?? new ChatStore({
    sessionId: config.sessionId ?? config.projectId,
    storageAdapter,
    storageNamespace,
    messageMapperOptions: config.messageMapperOptions,
    messageMapper: config.messageMapper
  })

  const client = config.client ?? new ZmpLiteClient({
    url: config.wsUrl,
    projectId: config.projectId,
    sessionId: config.sessionId,
    capabilities: config.capabilities,
    heartbeatInterval: config.heartbeatInterval,
    reconnect: config.reconnect
  })

  const connectionState = ref<ConnectionState>('idle')
  const sessionInfo = ref({
    sessionId: config.sessionId ?? null,
    serverVersion: null as string | null,
    supportedFeatures: [] as string[]
  })
  const lastError = ref<unknown>(null)

  client.on('state', state => {
    connectionState.value = state as ConnectionState
  })

  client.on('handshake', payload => {
    const data = payload as { sessionId?: string | null; serverVersion?: string | null; supportedFeatures?: string[] }
    sessionInfo.value = {
      sessionId: data.sessionId ?? null,
      serverVersion: data.serverVersion ?? null,
      supportedFeatures: data.supportedFeatures ?? []
    }
  })

  client.on('error', error => {
    lastError.value = error
  })

  client.onMessage(message => {
    store.addMessage(toRawProtocolMessage(message))
  })

  const connect = async () => {
    const sessionKey = config.sessionId ?? config.projectId
    if (sessionKey) {
      await store.loadSession(sessionKey)
    }
    await client.connect()
  }

  const disconnect = () => {
    client.disconnect()
  }

  const sendMessage = (text: string, options?: { files?: string[]; history?: RawProtocolMessage[]; modelConfig?: ModelConfig; mode?: string; workflowContext?: Record<string, unknown>; pluginContext?: Record<string, unknown> }) => {
    const payload: UserCommandPayload = {
      text,
      files: options?.files,
      model_config: options?.modelConfig ?? config.modelConfig,
      mode: options?.mode ?? config.mode,
      workflow_context: options?.workflowContext ?? config.workflowContext,
      plugin_context: options?.pluginContext ?? config.pluginContext,
      chat_history: options?.history
    }
    const result = client.sendUserCommand(payload, {
      projectId: config.projectId
    })
    const raw = toRawProtocolMessage(
      {
        protocol: 'zmp',
        version: '2.0',
        trace_id: result.traceId,
        message_id: result.messageId,
        project_id: config.projectId ?? '',
        timestamp: Date.now(),
        type: 'user_command',
        direction: 'request',
        context: { task_id: result.taskId },
        payload: payload as unknown as Record<string, unknown>
      },
      'user'
    )
    store.addMessage(raw)
    return result
  }

  const sendHumanResponse = (payload: { requestId: string; action: 'accept' | 'reject' | 'edit' | 'response'; args?: Record<string, unknown>; reason?: string }) =>
    client.sendHumanInterventionResponse(payload)

  if (config.autoConnect !== false) {
    onMounted(() => {
      connect()
    })
    onUnmounted(() => {
      disconnect()
    })
  }

  return {
    store,
    client,
    messages: computed(() => store.uiMessages.value),
    rawMessages: computed(() => store.rawMessages.value),
    connectionState,
    sessionInfo,
    lastError,
    connect,
    disconnect,
    sendMessage,
    sendHumanResponse
  }
}
