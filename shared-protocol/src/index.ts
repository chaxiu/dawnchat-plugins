export type RawProtocolMessage = {
  id: string
  trace_id?: string
  message_type: string
  project_id?: string
  payload: Record<string, unknown>
  timestamp: number
  sender_id?: string
  status?: string
}

export type UIMessageType =
  | 'user'
  | 'response'
  | 'error'
  | 'ack'
  | 'thought'
  | 'plan'
  | 'todo_update'
  | 'tool_call'
  | 'tool_result'
  | 'stream'
  | 'hil_request'
  | 'unknown'

export interface ActionRequired {
  type: string
  title: string
  message: string
  actions: Array<{ id: string; label: string; style: string }>
  context?: Record<string, unknown>
}

export interface UIMessage {
  id: string
  type: UIMessageType
  content: string
  createdAt: string
  stage?: string
  todos?: Array<{ id: string; description: string; status: string }>
  reasoning?: string
  todoId?: string
  status?: string
  result?: string
  error?: string
  toolName?: string
  success?: boolean
  actionRequired?: ActionRequired
  isFinal?: boolean
  errorCode?: string
  errorMessage?: string
  suggestion?: string
  payload?: Record<string, unknown>
  hilRequestId?: string
  hilStatus?: 'pending' | 'accepted' | 'rejected' | 'edited'
  hilDescription?: string
  hilRiskLevel?: 'low' | 'medium' | 'high'
  hilResponseText?: string
}

export interface MessageMapperStrings {
  processing: string
  unknownError: string
  hil: {
    title: string
    responded: string
    confirmed: string
    rejected: string
    userCancelled: string
    edited: string
  }
}

export interface MessageMapperOptions {
  strings: MessageMapperStrings
  sanitizeAssistantText?: (text: string, shouldTrim?: boolean) => string
}

const MESSAGE_TYPES = {
  USER_COMMAND: 'user_command',
  AGENT_ACK: 'agent_ack',
  AGENT_THOUGHT: 'agent_thought',
  AGENT_PLAN: 'agent_plan',
  TODO_UPDATE: 'todo_update',
  TOOL_CALL: 'tool_call',
  TOOL_RESULT: 'tool_result',
  AGENT_STREAM: 'agent_stream',
  AGENT_RESPONSE: 'agent_response',
  AGENT_ERROR: 'agent_error',
  HUMAN_INTERVENTION_REQUEST: 'human_intervention_request',
  HUMAN_INTERVENTION_RESPONSE: 'human_intervention_response'
} as const

export const createMessageMapper = (options: MessageMapperOptions) => {
  const sanitize = options.sanitizeAssistantText ?? ((text: string, shouldTrim = true) => (shouldTrim ? text.trim() : text))

  const toUIMessage = (zmpMsg: RawProtocolMessage): UIMessage => {
    const payload = zmpMsg.payload as Record<string, unknown>
    const msgType = zmpMsg.message_type

    const base: UIMessage = {
      id: zmpMsg.id,
      type: 'unknown',
      content: '',
      createdAt: new Date(zmpMsg.timestamp).toISOString(),
      payload
    }

    switch (msgType) {
      case MESSAGE_TYPES.USER_COMMAND:
        return {
          ...base,
          type: 'user',
          content: (payload.text as string) || ''
        }

      case MESSAGE_TYPES.AGENT_ACK:
        return {
          ...base,
          type: 'ack',
          content: (payload.message as string) || options.strings.processing
        }

      case MESSAGE_TYPES.AGENT_THOUGHT:
        return {
          ...base,
          type: 'thought',
          content: (payload.content as string) || '',
          stage: (payload.stage as string) || 'thinking'
        }

      case MESSAGE_TYPES.AGENT_PLAN:
        return {
          ...base,
          type: 'plan',
          content: '',
          todos: (payload.todos as Array<{ id: string; description: string; status: string }>) || [],
          reasoning: (payload.reasoning as string) || ''
        }

      case MESSAGE_TYPES.TODO_UPDATE:
        return {
          ...base,
          type: 'todo_update',
          content: '',
          todoId: (payload.todo_id as string) || '',
          status: (payload.status as string) || 'pending',
          result: payload.result as string | undefined,
          error: payload.error as string | undefined
        }

      case MESSAGE_TYPES.TOOL_CALL:
        return {
          ...base,
          type: 'tool_call',
          content: '',
          toolName: (payload.tool_name as string) || 'unknown'
        }

      case MESSAGE_TYPES.TOOL_RESULT:
        return {
          ...base,
          type: 'tool_result',
          content: '',
          toolName: (payload.tool_name as string) || 'unknown',
          success: (payload.success as boolean) ?? true,
          result: typeof payload.result === 'string' ? payload.result : JSON.stringify(payload.result),
          actionRequired: payload.action_required as ActionRequired
        }

      case MESSAGE_TYPES.AGENT_STREAM:
        return {
          ...base,
          type: 'stream',
          content: sanitize((payload.content as string) || (payload.chunk as string) || '', false),
          isFinal: (payload.is_final as boolean) || false
        }

      case MESSAGE_TYPES.AGENT_RESPONSE:
        return {
          ...base,
          type: 'response',
          content: sanitize((payload.content as string) || '')
        }

      case MESSAGE_TYPES.AGENT_ERROR:
        return {
          ...base,
          type: 'error',
          content: '',
          errorCode: (payload.code as string) || 'UNKNOWN',
          errorMessage: (payload.message as string) || options.strings.unknownError,
          suggestion: payload.suggestion as string | undefined
        }

      case MESSAGE_TYPES.HUMAN_INTERVENTION_REQUEST:
        return {
          ...base,
          type: 'hil_request',
          content: (payload.description as string) || options.strings.hil.title,
          hilRequestId: (payload.request_id as string) || '',
          hilStatus: 'pending',
          hilDescription: (payload.description as string) || '',
          hilRiskLevel: (payload.risk_level as 'low' | 'medium' | 'high') || 'medium',
          toolName: (payload.tool_name as string) || ''
        }

      case MESSAGE_TYPES.HUMAN_INTERVENTION_RESPONSE:
        return {
          ...base,
          type: 'unknown',
          content: '',
          hilResponseText: (payload.response_text as string) || options.strings.hil.responded
        }

      default:
        return {
          ...base,
          type: 'unknown',
          content: JSON.stringify(payload)
        }
    }
  }

  const mergeMessages = (rawMessages: RawProtocolMessage[]): UIMessage[] => {
    const uiMessages: UIMessage[] = []
    const toolCallMap = new Map<string, UIMessage>()
    const hilRequestMap = new Map<string, UIMessage>()

    for (const zmpMsg of rawMessages) {
      const uiMsg = toUIMessage(zmpMsg)

      if (uiMsg.type === 'tool_call') {
        uiMessages.push(uiMsg)
        if (uiMsg.payload?.tool_call_id) {
          toolCallMap.set(uiMsg.payload.tool_call_id as string, uiMsg)
        }
      } else if (uiMsg.type === 'tool_result') {
        const toolCallId = uiMsg.payload?.tool_call_id as string
        if (toolCallId && toolCallMap.has(toolCallId)) {
          const callMsg = toolCallMap.get(toolCallId)!
          callMsg.type = 'tool_result'
          callMsg.success = uiMsg.success
          callMsg.result = uiMsg.result
          callMsg.error = uiMsg.error
          callMsg.payload = {
            ...callMsg.payload,
            ...uiMsg.payload,
            arguments: callMsg.payload?.arguments
          }
        } else {
          uiMessages.push(uiMsg)
        }
      } else if (uiMsg.type === 'hil_request') {
        uiMessages.push(uiMsg)
        if (uiMsg.hilRequestId) {
          hilRequestMap.set(uiMsg.hilRequestId, uiMsg)
        }
      } else if (uiMsg.type === 'unknown' && uiMsg.hilResponseText) {
        const requestId = uiMsg.payload?.request_id as string
        if (requestId && hilRequestMap.has(requestId)) {
          const requestMsg = hilRequestMap.get(requestId)!
          const action = uiMsg.payload?.action as string
          if (action === 'accept') {
            requestMsg.hilStatus = 'accepted'
            requestMsg.hilResponseText = options.strings.hil.confirmed
          } else if (action === 'reject') {
            requestMsg.hilStatus = 'rejected'
            requestMsg.hilResponseText = options.strings.hil.rejected.replace('{reason}', (uiMsg.payload?.reason as string) || options.strings.hil.userCancelled)
          } else if (action === 'edit') {
            requestMsg.hilStatus = 'edited'
            requestMsg.hilResponseText = options.strings.hil.edited
          }
        }
      } else {
        uiMessages.push(uiMsg)
      }
    }

    return uiMessages
  }

  return {
    toUIMessage,
    mergeMessages
  }
}
