import {
  createHostToolRouter,
  DAWNCHAT_UI_ALIAS_TARGET_FUNCTION_NAMES,
  DIRECT_ASSISTANT_ORCHESTRATION_TOOL_NAMES,
  normalizeDawnchatUiAliasPayload,
  parseDawnchatUiCapabilityInvokePayload,
  resolveDawnchatUiAliasTargetFunctionName,
  type HostToolInvokeRequest,
} from "@dawnchat/host-orchestration-sdk/tool-router";

import {
  getExposedRuntimeCapabilityRegistrations,
  listWebAssistantToolDefinitions,
} from "./webAssistantHostToolDefinitions";
import {
  ensureRuntimeEventForwardingInstalled,
  invokeLocalWebAssistantFunction,
  toRecord,
} from "./webAssistantHostToolInvocation";

export { listWebAssistantToolDefinitions } from "./webAssistantHostToolDefinitions";

export function createWebAssistantHostToolRouter() {
  ensureRuntimeEventForwardingInstalled();

  const invokeMathAdd = async (request: { payload: Record<string, unknown> }) => {
    const left = Number(request.payload.a || 0);
    const right = Number(request.payload.b || 0);

    return {
      ok: true,
      result: left + right,
    };
  };

  const invokeDirectLocalTool = async (request: {
    functionName: string;
    payload: Record<string, unknown>;
    options?: Record<string, unknown>;
  }) =>
    invokeLocalWebAssistantFunction(request.functionName, request.payload, request.options || {});

  const invokeDawnchatUiCapability = async (request: {
    payload: Record<string, unknown>;
    options?: Record<string, unknown>;
  }) => {
    const parsed = parseDawnchatUiCapabilityInvokePayload(
      request.payload,
      request.options || {}
    );
    if (!parsed.ok) {
      return parsed.error;
    }
    return await invokeLocalWebAssistantFunction(parsed.functionName, parsed.payload, parsed.options);
  };

  const invokeDawnchatUiAlias = async (
    aliasToolName: string,
    request: { payload: Record<string, unknown>; options?: Record<string, unknown> }
  ) => {
    const functionName = resolveDawnchatUiAliasTargetFunctionName(aliasToolName);
    if (!functionName) {
      return {
        ok: false,
        error_code: "invalid_arguments",
        message: `Unsupported alias tool: ${aliasToolName}`,
      };
    }
    const rawPayload = normalizeDawnchatUiAliasPayload(toRecord(request.payload));
    const options = toRecord(rawPayload.options || request.options);
    return await invokeLocalWebAssistantFunction(functionName, rawPayload, options);
  };

  let router = createHostToolRouter({}).registerFunction("math.add", invokeMathAdd);

  for (const functionName of DIRECT_ASSISTANT_ORCHESTRATION_TOOL_NAMES) {
    router = router.registerFunction(functionName, invokeDirectLocalTool);
  }

  router = router.registerFunction("dawnchat.ui.capability.invoke", invokeDawnchatUiCapability);
  for (const aliasToolName of Object.keys(DAWNCHAT_UI_ALIAS_TARGET_FUNCTION_NAMES)) {
    router = router.registerFunction(aliasToolName, (request: HostToolInvokeRequest) =>
      invokeDawnchatUiAlias(aliasToolName, request));
  }

  for (const registration of getExposedRuntimeCapabilityRegistrations()) {
    router = router.registerFunction(
      registration.definition.name,
      async (request: { payload: Record<string, unknown> }) =>
        registration.handler(request.payload, {})
    );
  }

  return router;
}
