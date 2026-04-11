import { getHostOrchestrationTimer } from "../env";
import {
  createHostProtocolError,
  type HostProtocolPayload,
  type HostProtocolResult,
  type ToolExecutionMode,
} from "../protocol";

export interface HostToolInvokeRequest {
  functionName: string
  payload: HostProtocolPayload
  options?: HostProtocolPayload
  timeoutMs?: number
  signal?: AbortSignal
}

export interface HostToolInvokeContext {
  functionName: string
  namespace: string
  executionMode: ToolExecutionMode
  timeoutMs?: number
  signal?: AbortSignal
}

export type HostToolInvokeHandler = (
  request: HostToolInvokeRequest,
  context: HostToolInvokeContext
) => Promise<HostProtocolResult> | HostProtocolResult

export type HostToolInvokeMiddleware = (
  request: HostToolInvokeRequest,
  context: HostToolInvokeContext,
  next: () => Promise<HostProtocolResult>
) => Promise<HostProtocolResult>

export interface HostToolInvokeBackend {
  mode: ToolExecutionMode
  invoke: (
    request: HostToolInvokeRequest,
    context: HostToolInvokeContext
  ) => Promise<HostProtocolResult> | HostProtocolResult
}

export interface HostToolRouteDefinition {
  functionName?: string
  namespace?: string
  executionMode?: ToolExecutionMode
  handler?: HostToolInvokeHandler
  backend?: HostToolInvokeBackend
}

export interface CreateHostToolRouterOptions {
  fallbackHandler?: HostToolInvokeHandler
  fallbackBackend?: HostToolInvokeBackend
  middleware?: HostToolInvokeMiddleware[]
}

interface ResolvedToolExecution {
  executionMode: ToolExecutionMode
  invoke: (
    request: HostToolInvokeRequest,
    context: HostToolInvokeContext
  ) => Promise<HostProtocolResult>
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function normalizeToolRouterError(error: unknown): HostProtocolResult {
  if (
    error
    && typeof error === "object"
    && !Array.isArray(error)
    && typeof (error as Record<string, unknown>).error_code === "string"
  ) {
    return {
      ok: false,
      ...(error as Record<string, unknown>),
    }
  }
  return createHostProtocolError("host_tool_failed", toErrorMessage(error))
}

function withOptionalTimeout(
  request: HostToolInvokeRequest,
  execute: () => Promise<HostProtocolResult>
): Promise<HostProtocolResult> {
  if (!request.timeoutMs || request.timeoutMs <= 0) {
    return execute()
  }
  const timeoutMs = request.timeoutMs
  const timer = getHostOrchestrationTimer()
  return new Promise<HostProtocolResult>((resolve, reject) => {
    const handle = timer.setTimeout(() => {
      reject(new Error("host_tool_timeout"))
    }, timeoutMs)
    execute()
      .then((result) => {
        timer.clearTimeout(handle)
        resolve(result)
      })
      .catch((error) => {
        timer.clearTimeout(handle)
        reject(error)
      })
  })
}

function createLocalBackend(handler: HostToolInvokeHandler): HostToolInvokeBackend {
  return {
    mode: "local_route",
    invoke(request, context) {
      return handler(request, context)
    },
  }
}

function toResolvedToolExecution(
  definition: HostToolRouteDefinition | null | undefined
): ResolvedToolExecution | null {
  if (!definition) {
    return null
  }
  if (definition.backend) {
    return {
      executionMode: definition.executionMode || definition.backend.mode,
      invoke: (request, context) => Promise.resolve(definition.backend!.invoke(request, context)),
    }
  }
  if (!definition.handler) {
    return null
  }
  const backend = createLocalBackend(definition.handler)
  return {
    executionMode: definition.executionMode || backend.mode,
    invoke: (request, context) => Promise.resolve(backend.invoke(request, context)),
  }
}

export function createHostToolRouter(
  handlerOrOptions: HostToolInvokeHandler | CreateHostToolRouterOptions
) {
  const directHandlers = new Map<string, ResolvedToolExecution>()
  const namespaceHandlers = new Map<string, ResolvedToolExecution>()
  const middleware = new Array<HostToolInvokeMiddleware>()
  const fallbackExecution = typeof handlerOrOptions === "function"
    ? toResolvedToolExecution({
      handler: handlerOrOptions,
      executionMode: "local_route",
    })
    : toResolvedToolExecution({
      handler: handlerOrOptions.fallbackHandler,
      backend: handlerOrOptions.fallbackBackend,
      executionMode: handlerOrOptions.fallbackBackend?.mode,
    })

  if (typeof handlerOrOptions !== "function") {
    middleware.push(...(handlerOrOptions.middleware || []))
  }

  const resolveHandler = (request: HostToolInvokeRequest): ResolvedToolExecution | null => {
    const directHandler = directHandlers.get(request.functionName)
    if (directHandler) {
      return directHandler
    }
    const namespace = request.functionName.split(".")[0] || ""
    return namespaceHandlers.get(namespace) || fallbackExecution || null
  }

  return {
    register(definition: HostToolRouteDefinition) {
      const resolved = toResolvedToolExecution(definition)
      if (!resolved) {
        throw new Error("host tool route requires handler or backend")
      }
      if (definition.functionName) {
        directHandlers.set(definition.functionName, resolved)
      }
      if (definition.namespace) {
        namespaceHandlers.set(definition.namespace, resolved)
      }
      return this
    },
    registerNamespace(namespace: string, handler: HostToolInvokeHandler) {
      namespaceHandlers.set(namespace.trim(), {
        executionMode: "local_route",
        invoke: (request, context) => Promise.resolve(handler(request, context)),
      })
      return this
    },
    registerFunction(functionName: string, handler: HostToolInvokeHandler) {
      directHandlers.set(functionName.trim(), {
        executionMode: "local_route",
        invoke: (request, context) => Promise.resolve(handler(request, context)),
      })
      return this
    },
    use(entry: HostToolInvokeMiddleware) {
      middleware.push(entry)
      return this
    },
    async invoke(request: HostToolInvokeRequest): Promise<HostProtocolResult> {
      const handler = resolveHandler(request)
      if (!handler) {
        return createHostProtocolError(
          "host_tool_not_found",
          `No host tool route registered for ${request.functionName}`
        )
      }

      const context: HostToolInvokeContext = {
        functionName: request.functionName,
        namespace: request.functionName.split(".")[0] || "",
        executionMode: handler.executionMode,
        timeoutMs: request.timeoutMs,
        signal: request.signal,
      }

      const chain = middleware.reduceRight<() => Promise<HostProtocolResult>>(
        (next, entry) => {
          return () => entry(request, context, next)
        },
        () => withOptionalTimeout(request, () => handler.invoke(request, context))
      )

      try {
        return await chain()
      } catch (error) {
        return normalizeToolRouterError(error)
      }
    },
  }
}

export * from "./toolDefinitions";
