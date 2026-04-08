export interface CapabilityInvokeRequest {
  functionName: string;
  payload: Record<string, unknown>;
  options: Record<string, unknown>;
}

export interface CapabilityInvokeExecutionContext {
  requestId: string;
  pluginId: string;
  invoke: CapabilityInvokeRequest;
  executePluginCapability: (invoke: CapabilityInvokeRequest) => Promise<Record<string, unknown>>;
}
