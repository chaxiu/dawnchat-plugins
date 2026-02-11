import type { ToolErrorCode, ToolErrorDetails } from './types'

export class ToolSdkError extends Error {
  code: ToolErrorCode
  retriable: boolean
  status?: number
  detail?: string
  raw?: unknown

  constructor(details: ToolErrorDetails) {
    super(details.message)
    this.name = 'ToolSdkError'
    this.code = details.code
    this.retriable = details.retriable
    this.status = details.status
    this.detail = details.detail
    this.raw = details.raw
  }
}

export function normalizeError(input: unknown, fallback: ToolErrorCode = 'UNKNOWN'): ToolErrorDetails {
  if (input instanceof ToolSdkError) {
    return {
      code: input.code,
      message: input.message,
      retriable: input.retriable,
      status: input.status,
      detail: input.detail,
      raw: input.raw
    }
  }

  if (input instanceof Error) {
    return {
      code: fallback,
      message: input.message || 'Unknown error',
      retriable: fallback === 'NETWORK' || fallback === 'TASK_TIMEOUT',
      raw: input
    }
  }

  return {
    code: fallback,
    message: String(input ?? 'Unknown error'),
    retriable: false,
    raw: input
  }
}

export function codeFromHttpStatus(status: number): ToolErrorCode {
  if (status >= 500) {
    return 'HTTP_5XX'
  }
  if (status >= 400) {
    return 'HTTP_4XX'
  }
  return 'UNKNOWN'
}
