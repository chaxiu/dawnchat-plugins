export interface HostToolInvokeRequest {
  functionName: string;
  payload: Record<string, unknown>;
  options?: Record<string, unknown>;
}

export type HostToolInvokeHandler = (
  request: HostToolInvokeRequest
) => Promise<Record<string, unknown>> | Record<string, unknown>;

export function createHostToolRouter(handler: HostToolInvokeHandler) {
  return {
    invoke(request: HostToolInvokeRequest) {
      return handler(request);
    },
  };
}
