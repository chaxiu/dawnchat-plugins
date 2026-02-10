import type { ConnectionState, UserCommandPayload, ZmpEnvelope, ZmpLiteClientOptions } from '../types'

type Handler = (payload?: unknown) => void
type MessageHandler = (message: ZmpEnvelope) => void

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
}

export class ZmpLiteClient {
  private ws: WebSocket | null = null
  private options: ZmpLiteClientOptions
  private handlers = new Map<string, Set<Handler>>()
  private messageHandlers = new Set<MessageHandler>()
  private pendingMessages: ZmpEnvelope[] = []
  private heartbeatTimer: number | null = null
  private reconnectAttempts = 0
  private state: ConnectionState = 'idle'
  private sessionId: string | null = null
  private serverVersion: string | null = null
  private supportedFeatures: string[] = []

  constructor(options: ZmpLiteClientOptions) {
    this.options = {
      heartbeatInterval: 30000,
      reconnect: { enabled: true, maxAttempts: 5, baseDelay: 1200 },
      ...options
    }
  }

  get connectionState() {
    return this.state
  }

  get sessionInfo() {
    return {
      sessionId: this.sessionId,
      serverVersion: this.serverVersion,
      supportedFeatures: this.supportedFeatures
    }
  }

  on(event: 'open' | 'close' | 'error' | 'handshake' | 'state', handler: Handler) {
    const set = this.handlers.get(event) ?? new Set<Handler>()
    set.add(handler)
    this.handlers.set(event, set)
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler)
  }

  off(event: 'open' | 'close' | 'error' | 'handshake' | 'state', handler: Handler) {
    const set = this.handlers.get(event)
    if (set) {
      set.delete(handler)
    }
  }

  offMessage(handler: MessageHandler) {
    this.messageHandlers.delete(handler)
  }

  async connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }
    this.updateState('connecting')
    const ws = new WebSocket(this.options.url)
    this.ws = ws
    ws.onopen = () => {
      this.reconnectAttempts = 0
      this.updateState('open')
      this.sendHandshake()
      this.flushPendingMessages()
      this.startHeartbeat()
      this.emit('open')
    }
    ws.onclose = () => {
      this.stopHeartbeat()
      this.updateState('closed')
      this.emit('close')
      if (this.shouldReconnect()) {
        this.scheduleReconnect()
      }
    }
    ws.onerror = () => {
      this.updateState('error')
      this.emit('error')
    }
    ws.onmessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data) as ZmpEnvelope
        this.handleMessage(message)
      } catch {
        this.emit('error')
      }
    }
  }

  disconnect() {
    this.stopHeartbeat()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.updateState('closed')
  }

  sendUserCommand(payload: UserCommandPayload, options?: { traceId?: string; messageId?: string; taskId?: string; projectId?: string }) {
    const traceId = options?.traceId ?? createId()
    const messageId = options?.messageId ?? createId()
    const taskId = options?.taskId ?? createId()
    const envelope = this.createEnvelope({
      type: 'user_command',
      trace_id: traceId,
      message_id: messageId,
      project_id: options?.projectId ?? this.options.projectId ?? '',
      context: { task_id: taskId },
      payload: payload as unknown as Record<string, unknown>
    })
    this.sendEnvelope(envelope)
    return { traceId, messageId, taskId }
  }

  sendHumanInterventionResponse(payload: { requestId: string; action: 'accept' | 'reject' | 'edit' | 'response'; args?: Record<string, unknown>; reason?: string }) {
    const envelope = this.createEnvelope({
      type: 'human_intervention_response',
      payload: {
        request_id: payload.requestId,
        action: payload.action,
        args: payload.args,
        reason: payload.reason
      }
    })
    this.sendEnvelope(envelope)
    return envelope.message_id
  }

  sendEnvelope(partial: Partial<ZmpEnvelope>) {
    const envelope = this.createEnvelope(partial)
    this.sendEnvelopeInternal(envelope)
    return envelope.message_id
  }

  private createEnvelope(partial: Partial<ZmpEnvelope>): ZmpEnvelope {
    return {
      protocol: 'zmp',
      version: '2.0',
      trace_id: partial.trace_id ?? createId(),
      message_id: partial.message_id ?? createId(),
      project_id: partial.project_id ?? this.options.projectId ?? '',
      timestamp: partial.timestamp ?? Date.now(),
      type: partial.type ?? 'unknown',
      direction: partial.direction ?? 'request',
      context: partial.context,
      payload: partial.payload ?? {}
    }
  }

  private sendEnvelopeInternal(envelope: ZmpEnvelope) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(envelope))
      return
    }
    this.pendingMessages.push(envelope)
  }

  private flushPendingMessages() {
    while (this.pendingMessages.length > 0) {
      const msg = this.pendingMessages.shift()
      if (!msg) break
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(msg))
      } else {
        this.pendingMessages.unshift(msg)
        break
      }
    }
  }

  private sendHandshake() {
    this.sendEnvelopeInternal(
      this.createEnvelope({
        type: 'handshake',
        payload: {
          client_version: '2.0.0',
          capabilities: this.options.capabilities ?? ['agent_v2', 'streaming']
        }
      })
    )
  }

  private startHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
    }
    if (!this.options.heartbeatInterval) return
    this.heartbeatTimer = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendEnvelopeInternal(
          this.createEnvelope({
            type: 'heartbeat',
            payload: { ping_time: Date.now() }
          })
        )
      }
    }, this.options.heartbeatInterval)
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private handleMessage(message: ZmpEnvelope) {
    if (message.type === 'handshake' && message.direction === 'response') {
      const payload = message.payload as { session_id?: string; server_version?: string; supported_features?: string[] }
      this.sessionId = payload.session_id ?? null
      this.serverVersion = payload.server_version ?? null
      this.supportedFeatures = payload.supported_features ?? []
      this.emit('handshake', this.sessionInfo)
      return
    }
    if (message.type === 'heartbeat' && message.direction === 'request') {
      this.sendEnvelopeInternal(
        this.createEnvelope({
          type: 'heartbeat',
          payload: { ping_time: message.payload.ping_time }
        })
      )
      return
    }
    this.messageHandlers.forEach(handler => handler(message))
  }

  private updateState(next: ConnectionState) {
    this.state = next
    this.emit('state', next)
  }

  private emit(event: string, payload?: unknown) {
    const set = this.handlers.get(event)
    if (set) {
      set.forEach(handler => handler(payload))
    }
  }

  private shouldReconnect() {
    const config = this.options.reconnect
    if (!config?.enabled) return false
    if (this.reconnectAttempts >= (config.maxAttempts ?? 0)) return false
    return true
  }

  private scheduleReconnect() {
    const config = this.options.reconnect
    if (!config?.enabled) return
    const delay = (config.baseDelay ?? 1000) * Math.pow(2, this.reconnectAttempts)
    this.reconnectAttempts += 1
    this.updateState('reconnecting')
    window.setTimeout(() => {
      this.connect()
    }, delay)
  }
}
