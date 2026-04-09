import type { HostProtocolResult } from "../protocol";

export interface CapabilityInvokeRequest {
  functionName: string;
  payload: Record<string, unknown>;
  options: Record<string, unknown>;
}

export interface CapabilityInvokeExecutionContext {
  requestId: string;
  pluginId: string;
  invoke: CapabilityInvokeRequest;
  executePluginCapability: (invoke: CapabilityInvokeRequest) => Promise<HostProtocolResult>;
}

export interface HostInvokeRequest {
  functionName: string;
  payload: Record<string, unknown>;
  options: Record<string, unknown>;
}

export interface HostInvokeExecutionContext {
  requestId: string;
  pluginId: string;
  invoke: HostInvokeRequest;
}
