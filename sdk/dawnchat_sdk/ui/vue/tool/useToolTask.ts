import { computed, ref } from 'vue'

import { TaskClient } from './task-client'
import { ToolClient } from './client'
import { normalizeError } from './errors'
import type {
  ToolCallMode,
  ToolCallRequest,
  ToolErrorCode,
  ToolErrorDetails,
  ToolLogEvent,
  ToolTaskState
} from './types'

export interface UseToolTaskOptions {
  toolClient?: ToolClient
  taskClient?: TaskClient
  logger?: (event: ToolLogEvent) => void
}

export function useToolTask(options: UseToolTaskOptions = {}) {
  const toolClient = options.toolClient ?? new ToolClient()
  const taskClient = options.taskClient ?? new TaskClient()

  const taskId = ref('')
  const state = ref<ToolTaskState>('idle')
  const progress = ref(0)
  const message = ref('')
  const result = ref<unknown>(null)
  const error = ref('')
  const errorCode = ref<ToolErrorCode>('UNKNOWN')
  const errorDetails = ref<ToolErrorDetails | null>(null)

  const isRunning = computed(() => state.value === 'pending' || state.value === 'running')

  async function run(request: ToolCallRequest): Promise<unknown> {
    reset({ keepTaskId: false })
    state.value = 'pending'
    log('info', 'TOOL_RUN_STARTED', 'Tool execution started', {
      tool_name: request.tool_name,
      mode: request.mode ?? 'auto'
    })

    const mode: ToolCallMode = request.mode ?? 'auto'
    let response
    try {
      response = await toolClient.call({ ...request, mode })
    } catch (err) {
      const normalized = normalizeError(err, 'TOOL_SUBMIT_FAILED')
      applyError(normalized, 'TOOL_RUN_SUBMIT_FAILED', { tool_name: request.tool_name, mode })
      throw toError(normalized)
    }

    if (response.mode === 'async' && response.task_id) {
      taskId.value = response.task_id
      state.value = 'running'
      log('info', 'TOOL_TASK_ACCEPTED', 'Async tool task accepted', {
        tool_name: request.tool_name,
        task_id: response.task_id
      })
      let finalTask
      try {
        finalTask = await taskClient.waitForCompletion(response.task_id, {
          onProgress: (p, m) => {
            progress.value = normalizeProgress(p, progress.value)
            message.value = m || message.value
          }
        })
      } catch (err) {
        const normalized = normalizeError(err, 'TASK_FAILED')
        applyError(normalized, 'TOOL_TASK_WAIT_FAILED', {
          tool_name: request.tool_name,
          task_id: response.task_id
        })
        throw toError(normalized)
      }
      progress.value = normalizeProgress(finalTask.progress, progress.value)
      message.value = String(finalTask.progress_message ?? finalTask.message ?? '')
      if (finalTask.status === 'completed') {
        state.value = 'completed'
        result.value = finalTask.result
        log('info', 'TOOL_TASK_COMPLETED', 'Async tool task completed', {
          tool_name: request.tool_name,
          task_id: response.task_id
        })
        return finalTask.result
      }
      if (finalTask.status === 'cancelled') {
        state.value = 'cancelled'
        const normalized: ToolErrorDetails = {
          code: 'TASK_CANCELLED',
          message: String(finalTask.error ?? 'Task cancelled'),
          retriable: false,
          raw: finalTask
        }
        applyError(normalized, 'TOOL_TASK_CANCELLED', {
          tool_name: request.tool_name,
          task_id: response.task_id
        })
        throw toError(normalized)
      }
      const normalized: ToolErrorDetails = {
        code: 'TASK_FAILED',
        message: String(finalTask.error ?? 'Task failed'),
        retriable: false,
        raw: finalTask
      }
      applyError(normalized, 'TOOL_TASK_FAILED', {
        tool_name: request.tool_name,
        task_id: response.task_id
      })
      throw toError(normalized)
    }

    state.value = 'completed'
    progress.value = 1
    result.value = response.result
    log('info', 'TOOL_RUN_SYNC_COMPLETED', 'Sync tool call completed', {
      tool_name: request.tool_name
    })
    return response.result
  }

  async function cancel(): Promise<boolean> {
    if (!taskId.value || !isRunning.value) {
      return false
    }
    const currentTaskId = taskId.value
    let ok = false
    try {
      ok = await taskClient.cancel(currentTaskId)
    } catch (err) {
      const normalized = normalizeError(err, 'TASK_FAILED')
      applyError(normalized, 'TOOL_TASK_CANCEL_FAILED', { task_id: currentTaskId })
      throw toError(normalized)
    }
    if (ok) {
      state.value = 'cancelled'
      message.value = 'task cancelled'
      log('warn', 'TOOL_TASK_CANCELLED', 'Task cancelled by user', { task_id: currentTaskId })
    }
    return ok
  }

  function reset(options: { keepTaskId?: boolean } = {}): void {
    if (!options.keepTaskId) {
      taskId.value = ''
    }
    state.value = 'idle'
    progress.value = 0
    message.value = ''
    result.value = null
    error.value = ''
    errorCode.value = 'UNKNOWN'
    errorDetails.value = null
  }

  function applyError(details: ToolErrorDetails, code: string, context?: Record<string, unknown>): void {
    error.value = details.message
    errorCode.value = details.code
    errorDetails.value = details
    if (state.value !== 'cancelled') {
      state.value = details.code === 'TASK_CANCELLED' ? 'cancelled' : 'failed'
    }
    log('error', code, details.message, {
      error_code: details.code,
      retriable: details.retriable,
      ...context
    })
  }

  function log(
    level: ToolLogEvent['level'],
    code: string,
    logMessage: string,
    context?: Record<string, unknown>
  ): void {
    const event: ToolLogEvent = {
      level,
      code,
      message: logMessage,
      context,
      ts: Date.now()
    }
    if (options.logger) {
      options.logger(event)
      return
    }
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('dawnchat:tool-sdk-log', { detail: event }))
    }
  }

  return {
    taskId,
    state,
    progress,
    message,
    result,
    error,
    errorCode,
    errorDetails,
    isRunning,
    run,
    cancel,
    reset
  }
}

function toError(details: ToolErrorDetails): Error {
  return new Error(`[${details.code}] ${details.message}`)
}

function normalizeProgress(raw: unknown, floor = 0): number {
  const maybeNumber = typeof raw === 'number' ? raw : Number(raw)
  const numeric = Number.isFinite(maybeNumber) ? maybeNumber : 0
  const ratio = numeric > 1 ? numeric / 100 : numeric
  const clamped = Math.max(0, Math.min(1, ratio))
  return Math.max(floor, clamped)
}
