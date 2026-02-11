export type ToolCallMode = 'auto' | 'sync' | 'async'

export type ToolTaskState =
  | 'idle'
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface ToolCallRequest {
  tool_name: string
  arguments?: Record<string, unknown>
  timeout?: number
  mode?: ToolCallMode
}

export interface ToolCallResponse {
  status: string
  mode?: 'sync' | 'async'
  task_id?: string
  result?: unknown
}

export type ToolErrorCode =
  | 'UNKNOWN'
  | 'NETWORK'
  | 'HTTP_4XX'
  | 'HTTP_5XX'
  | 'TOOL_SUBMIT_FAILED'
  | 'TASK_TIMEOUT'
  | 'TASK_CANCELLED'
  | 'TASK_FAILED'
  | 'INVALID_RESPONSE'

export interface ToolErrorDetails {
  code: ToolErrorCode
  message: string
  retriable: boolean
  status?: number
  detail?: string
  raw?: unknown
}

export interface ToolTaskPayload {
  task_id?: string
  status?: string
  progress?: number
  progress_message?: string
  message?: string
  result?: unknown
  error?: string
}

export interface ToolTaskResponse {
  status: string
  task: ToolTaskPayload
}

export interface UseToolTaskState {
  taskId: string
  state: ToolTaskState
  progress: number
  message: string
  result: unknown
  error: string
  errorDetails?: ToolErrorDetails
}

export type ToolLogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface ToolLogEvent {
  level: ToolLogLevel
  code: string
  message: string
  context?: Record<string, unknown>
  ts: number
}
