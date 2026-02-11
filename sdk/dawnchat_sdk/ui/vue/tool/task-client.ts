import type { ToolTaskPayload, ToolTaskResponse } from './types'
import { ToolSdkError, codeFromHttpStatus } from './errors'

export interface TaskClientOptions {
  basePath?: string
  fetchImpl?: typeof fetch
}

export interface WaitTaskOptions {
  timeoutMs?: number
  pollIntervalMs?: number
  onProgress?: (progress: number, message: string) => void
}

export class TaskClient {
  private readonly basePath: string
  private readonly fetchImpl: typeof fetch

  constructor(options: TaskClientOptions = {}) {
    this.basePath = options.basePath ?? '/api/sdk'
    this.fetchImpl = resolveFetchImpl(options.fetchImpl)
  }

  async get(taskId: string): Promise<ToolTaskPayload> {
    const response = await this.request<ToolTaskResponse>(`/tasks/${encodeURIComponent(taskId)}`, {
      method: 'GET'
    })
    return response.task
  }

  async cancel(taskId: string): Promise<boolean> {
    const response = await this.request<{ status?: string }>(
      `/tasks/${encodeURIComponent(taskId)}`,
      { method: 'DELETE' }
    )
    return String(response.status ?? '').toLowerCase() === 'success'
  }

  async waitForCompletion(taskId: string, options: WaitTaskOptions = {}): Promise<ToolTaskPayload> {
    const timeoutMs = options.timeoutMs ?? 3600_000
    const pollIntervalMs = options.pollIntervalMs ?? 500
    const start = Date.now()
    let lastProgress = -1
    let lastMessage = ''

    while (true) {
      if (Date.now() - start > timeoutMs) {
        throw new ToolSdkError({
          code: 'TASK_TIMEOUT',
          message: `Task ${taskId} timed out after ${timeoutMs}ms`,
          retriable: true
        })
      }

      const task = await this.get(taskId)
      const progress = normalizeProgress(task.progress)
      const message = String(task.progress_message ?? task.message ?? '')
      if (options.onProgress && (progress !== lastProgress || message !== lastMessage)) {
        options.onProgress(progress, message)
        lastProgress = progress
        lastMessage = message
      }

      const status = String(task.status ?? 'pending')
      if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        return { ...task, progress }
      }

      await sleep(pollIntervalMs)
    }
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    let response: Response
    try {
      response = await this.fetchImpl(`${this.basePath}${path}`, init)
    } catch (error) {
      throw new ToolSdkError({
        code: 'NETWORK',
        message: error instanceof Error ? error.message : 'Network request failed',
        retriable: true,
        raw: error
      })
    }
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>
    if (!response.ok) {
      const detail = String(body.detail ?? body.message ?? `Request failed: ${response.status}`)
      throw new ToolSdkError({
        code: codeFromHttpStatus(response.status),
        message: detail,
        retriable: response.status >= 500,
        status: response.status,
        detail,
        raw: body
      })
    }
    return body as T
  }
}

function resolveFetchImpl(fetchImpl?: typeof fetch): typeof fetch {
  if (fetchImpl) {
    return fetchImpl
  }
  if (typeof globalThis.fetch !== 'function') {
    throw new Error('fetch is not available in current runtime')
  }
  // Bind to globalThis to avoid "Illegal invocation" in embedded WebView/iframe runtimes.
  return globalThis.fetch.bind(globalThis)
}

function normalizeProgress(raw: unknown): number {
  const maybeNumber = typeof raw === 'number' ? raw : Number(raw)
  const numeric = Number.isFinite(maybeNumber) ? maybeNumber : 0
  const ratio = numeric > 1 ? numeric / 100 : numeric
  return Math.max(0, Math.min(1, ratio))
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
