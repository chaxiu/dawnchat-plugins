export type StepActionResult = {
  ok: boolean;
  data?: Record<string, unknown>;
  error_code?: string;
  message?: string;
} | Promise<{
  ok: boolean;
  data?: Record<string, unknown>;
  error_code?: string;
  message?: string;
}>;

export type SessionStepCancelHandler = () => void | Promise<void>;

export interface SessionStepRuntimeContext {
  sessionId: string;
  stepId?: string;
  stepIndex?: number;
  totalSteps?: number;
  timeoutMs?: number;
  isCancelled: () => boolean;
  onCancel: (handler: SessionStepCancelHandler) => void;
}
