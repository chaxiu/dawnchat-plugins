import type { ViewOperationFailure, ViewResourceBinding } from "../../runtime/view";

export function toRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  return raw as Record<string, unknown>;
}

export function toStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((item) => String(item || "").trim())
    .filter((item) => item.length > 0);
}

export function cloneViewResource(resource: ViewResourceBinding): ViewResourceBinding {
  return {
    resource_type: resource.resource_type,
    resource_id: resource.resource_id,
    title: resource.title,
    data: JSON.parse(JSON.stringify(resource.data)) as Record<string, unknown>,
  };
}

export function buildOperationError(
  errorCode: string,
  message: string,
  data?: Record<string, unknown>
): ViewOperationFailure {
  return {
    ok: false,
    error_code: errorCode,
    message,
    data,
  };
}

export function isViewOperationFailure(
  value: ViewResourceBinding | ViewOperationFailure
): value is ViewOperationFailure {
  return "ok" in value && value.ok === false;
}
