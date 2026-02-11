import type { ToolCallRequest, ToolCallResponse } from './types'
import { ToolSdkError, codeFromHttpStatus } from './errors'

export interface ToolClientOptions {
  basePath?: string
  fetchImpl?: typeof fetch
}

export class ToolClient {
  private readonly basePath: string
  private readonly fetchImpl: typeof fetch

  constructor(options: ToolClientOptions = {}) {
    this.basePath = options.basePath ?? '/api/sdk'
    this.fetchImpl = resolveFetchImpl(options.fetchImpl)
  }

  async call(request: ToolCallRequest): Promise<ToolCallResponse> {
    return this.request<ToolCallResponse>('/tools/call', {
      method: 'POST',
      body: JSON.stringify({
        tool_name: request.tool_name,
        arguments: request.arguments ?? {},
        timeout: request.timeout,
        mode: request.mode ?? 'auto'
      })
    })
  }

  async submit(request: Omit<ToolCallRequest, 'mode'>): Promise<ToolCallResponse> {
    return this.request<ToolCallResponse>('/tools/submit', {
      method: 'POST',
      body: JSON.stringify({
        tool_name: request.tool_name,
        arguments: request.arguments ?? {},
        timeout: request.timeout
      })
    })
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    let response: Response
    try {
      response = await this.fetchImpl(`${this.basePath}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...init
      })
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
