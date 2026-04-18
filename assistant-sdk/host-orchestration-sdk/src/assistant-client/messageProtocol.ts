import { BRIDGE_MESSAGE_TYPE } from './constants'

export type BridgeRequestOp =
  | 'describe'
  | 'query'
  | 'act'
  | 'scroll'
  | 'browser_surface_open'
  | 'browser_surface_close'
  | 'browser_surface_navigate'
  | 'browser_surface_status'
  | 'browser_surface_back'
  | 'browser_surface_forward'
  | 'browser_surface_reload'
  | 'browser_surface_stop'
  | 'browser_surface_describe'
  | 'browser_surface_act'
  | 'browser_surface_scroll'
  | 'capabilities_list'
  | 'capability_invoke'
  | 'runtime_refresh'

export interface BridgeRequestMessage {
  type: typeof BRIDGE_MESSAGE_TYPE.REQUEST
  requestId: string
  pluginId: string
  op: BridgeRequestOp
  payload: Record<string, unknown>
}

export interface BridgeEventMessage {
  type: typeof BRIDGE_MESSAGE_TYPE.EVENT
  event: string
  pluginId: string
  payload: Record<string, unknown>
}

export interface AssistantRuntimeEventPayload {
  type: string
  ts_ms: number
  source: string
  session_id?: string
  step_id?: string
  payload: Record<string, unknown>
}

export interface BridgeResultOutbound {
  type: typeof BRIDGE_MESSAGE_TYPE.RESULT
  requestId: string
  result: Record<string, unknown>
}

export interface ContextPushItem {
  type: 'text' | 'image'
  text?: string
  uri?: string
  mime?: string
}

export interface ContextPushPayload {
  items: ContextPushItem[]
  mode?: string
  metadata?: Record<string, unknown>
}

export interface TtsSpeakAcceptedPayload {
  plugin_id: string
  task_id: string
  stream_url: string
  status_url: string
  mode?: string
  source?: string
}

export interface TtsStoppedPayload {
  plugin_id: string
  task_id?: string
  stopped: boolean
  source?: string
}
