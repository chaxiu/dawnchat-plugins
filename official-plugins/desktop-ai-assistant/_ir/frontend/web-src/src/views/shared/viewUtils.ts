import type { ViewOperationFailure, ViewStateBinding } from "../../runtime/view";

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

export function cloneStateBinding(state_binding: ViewStateBinding): ViewStateBinding {
  return {
    binding_type: state_binding.binding_type,
    binding_label: state_binding.binding_label,
    title: state_binding.title,
    data: JSON.parse(JSON.stringify(state_binding.data)) as Record<string, unknown>,
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
  value: ViewStateBinding | ViewOperationFailure
): value is ViewOperationFailure {
  return "ok" in value && value.ok === false;
}
