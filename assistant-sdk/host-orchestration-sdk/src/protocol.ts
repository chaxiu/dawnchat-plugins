export type HostProtocolPayload = Record<string, unknown>;

export type AgentExecutionMode = "local_loop" | "external_loop";

export type ToolExecutionMode = "local_route" | "remote_route" | "mcp_bridge";

export interface HostProtocolError extends HostProtocolPayload {
  ok: false;
  error_code: string;
  message: string;
  data?: HostProtocolPayload;
}

export type HostProtocolResult = HostProtocolPayload | HostProtocolError;

export function createHostProtocolError(
  errorCode: string,
  message: string,
  data?: HostProtocolPayload
): HostProtocolError {
  return {
    ok: false,
    error_code: errorCode,
    message,
    data,
  };
}

export function isHostProtocolError(value: HostProtocolResult): value is HostProtocolError {
  return Boolean(
    value
    && typeof value === "object"
    && !Array.isArray(value)
    && (value as HostProtocolPayload).ok === false
    && typeof (value as HostProtocolPayload).error_code === "string"
  );
}

