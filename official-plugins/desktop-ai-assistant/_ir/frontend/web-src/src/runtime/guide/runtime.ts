import { toAssistantCardPayload } from "../capabilities";
import type { SessionStepRuntimeContext, StepActionResult } from "../contracts/sessionStep";
import { ASSISTANT_RUNTIME_EVENT_TYPES, type AssistantRuntimeEventInput } from "../events";
import { GUIDE_ACTIONS, type GuideActionName } from "./actions";
import { hostVoiceSpeak, hostVoiceStatus, hostVoiceStop } from "../hostBridge";
import type { AssistantCardPayload } from "../../cards/types";
import type { GuideNarrationState, GuideTipPayload } from "./state";
import { GUIDE_CARD_AUTO_DISMISS_DELAY_MS } from "../assistantUiLayout";
type GuideActionHandler = (
  payload: Record<string, unknown>,
  context: SessionStepRuntimeContext
) => StepActionResult;

export interface GuideRuntimeDeps {
  setCurrentCard: (
    card: AssistantCardPayload,
    options?: { dismissAfterMs?: number; dismissReason?: string }
  ) => number;
  scheduleDismissCurrentCard?: (delayMs: number, reason?: string) => void;
  scheduleResetNarrationState?: (delayMs: number) => void;
  setActiveTip: (tip: GuideTipPayload | null) => void;
  setNarrationState: (state: GuideNarrationState) => void;
  emitRuntimeEvent?: (input: AssistantRuntimeEventInput) => void;
}

type GuideRuntimeHandlers = Record<GuideActionName, GuideActionHandler>;

function toRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  return raw as Record<string, unknown>;
}

function buildNarrationState(
  status: GuideNarrationState["status"],
  text: string,
  errorMessage?: string
): GuideNarrationState {
  return {
    status,
    text,
    updatedAtMs: Date.now(),
    errorMessage,
  };
}

function toGuideTipPayload(payload: Record<string, unknown>): GuideTipPayload | null {
  const message = typeof payload.message === "string" ? payload.message.trim() : "";
  if (!message) {
    return null;
  }
  return {
    message,
    title: typeof payload.title === "string" ? payload.title : undefined,
    level: typeof payload.level === "string" ? payload.level : undefined,
  };
}

function isCancelledVoiceResult(result: Record<string, unknown>, cancelRequested: boolean): boolean {
  if (cancelRequested) {
    return true;
  }
  const data = toRecord(result.data);
  const status = String(data.status || "").trim();
  return status === "cancelled";
}

function resolveDismissAfterMs(payload: Record<string, unknown>): number | undefined {
  const value = payload.dismiss_after_ms;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined;
  }
  return value;
}

export function createGuideRuntime(deps: GuideRuntimeDeps): GuideRuntimeHandlers {
  const emitNarrateEvent = (
    type:
      | typeof ASSISTANT_RUNTIME_EVENT_TYPES.GUIDE_NARRATE_PLAYING
      | typeof ASSISTANT_RUNTIME_EVENT_TYPES.GUIDE_NARRATE_COMPLETED
      | typeof ASSISTANT_RUNTIME_EVENT_TYPES.GUIDE_NARRATE_CANCELLED
      | typeof ASSISTANT_RUNTIME_EVENT_TYPES.GUIDE_NARRATE_FAILED,
    context: SessionStepRuntimeContext,
    payload: Record<string, unknown>
  ) => {
    deps.emitRuntimeEvent?.({
      type,
      source: "guide",
      session_id: context.sessionId,
      step_id: context.stepId,
      payload,
    });
  };
  return {
    [GUIDE_ACTIONS.CARD_SHOW]: (payload, context) => {
      const normalized = toAssistantCardPayload(payload);
      const dismissAfterMs = resolveDismissAfterMs(payload);
      deps.setCurrentCard({
        ...normalized,
        data: {
          ...normalized.data,
          session_id: context.sessionId,
          step_id: context.stepId,
        },
      }, {
        dismissAfterMs,
        dismissReason: dismissAfterMs !== undefined ? "card_show_auto_dismiss" : undefined,
      });
      return {
        ok: true,
        data: {
          status: "applied",
          card_type: normalized.card_type,
          voice_applied: false,
        },
      };
    },
    [GUIDE_ACTIONS.NARRATE]: async (payload, context) => {
      const narration = toRecord(payload);
      const text = typeof narration.text === "string" ? narration.text.trim() : "";
      if (!text) {
        return {
          ok: false,
          error_code: "invalid_guide_payload",
          message: "guide.narrate requires payload.text",
        };
      }
      if (context.isCancelled()) {
        deps.setNarrationState(buildNarrationState("cancelled", text));
        deps.scheduleResetNarrationState?.(GUIDE_CARD_AUTO_DISMISS_DELAY_MS);
        emitNarrateEvent(ASSISTANT_RUNTIME_EVENT_TYPES.GUIDE_NARRATE_CANCELLED, context, {
          text,
          reason: "cancelled_before_start",
        });
        return {
          ok: false,
          error_code: "step_cancelled",
          message: "guide narration cancelled before start",
        };
      }
      let cancelRequested = false;
      context.onCancel(async () => {
        cancelRequested = true;
        deps.setNarrationState(buildNarrationState("cancelling", text));
        await hostVoiceStop({});
      });
      deps.setNarrationState(buildNarrationState("playing", text));
      emitNarrateEvent(ASSISTANT_RUNTIME_EVENT_TYPES.GUIDE_NARRATE_PLAYING, context, {
        text,
      });
      const result = await hostVoiceSpeak({
        text,
        voice: typeof narration.voice === "string" ? narration.voice : undefined,
        sid: typeof narration.sid === "number" ? narration.sid : undefined,
        interrupt: narration.interrupt !== false,
      });
      if (isCancelledVoiceResult(result, cancelRequested) || context.isCancelled()) {
        const data = toRecord(result.data);
        const taskId = typeof data.task_id === "string" ? data.task_id : "";
        if (taskId) {
          await hostVoiceStatus({ taskId });
        }
        deps.setNarrationState(buildNarrationState("cancelled", text));
        deps.scheduleResetNarrationState?.(GUIDE_CARD_AUTO_DISMISS_DELAY_MS);
        emitNarrateEvent(ASSISTANT_RUNTIME_EVENT_TYPES.GUIDE_NARRATE_CANCELLED, context, {
          text,
        });
        return {
          ok: false,
          error_code: "step_cancelled",
          message: "guide narration cancelled",
          data: {
            status: "cancelled",
            narration_text: text,
            task_id: taskId,
          },
        };
      }
      if (!result || result.ok !== true) {
        const errorMessage = String(result?.message || result?.error_code || "host voice speak failed");
        deps.setNarrationState(buildNarrationState("failed", text, errorMessage));
        deps.scheduleResetNarrationState?.(GUIDE_CARD_AUTO_DISMISS_DELAY_MS);
        emitNarrateEvent(ASSISTANT_RUNTIME_EVENT_TYPES.GUIDE_NARRATE_FAILED, context, {
          text,
          error_message: errorMessage,
          error_code: String(result?.error_code || "guide_narrate_failed"),
        });
        return {
          ok: false,
          error_code: String(result?.error_code || "guide_narrate_failed"),
          message: errorMessage,
        };
      }
      deps.setNarrationState(buildNarrationState("completed", text));
      deps.scheduleDismissCurrentCard?.(GUIDE_CARD_AUTO_DISMISS_DELAY_MS, "narration_completed");
      deps.scheduleResetNarrationState?.(GUIDE_CARD_AUTO_DISMISS_DELAY_MS);
      emitNarrateEvent(ASSISTANT_RUNTIME_EVENT_TYPES.GUIDE_NARRATE_COMPLETED, context, {
        text,
      });
      return {
        ok: true,
        data: {
          status: "completed",
          narration_text: text,
          voice_applied: true,
        },
      };
    },
    [GUIDE_ACTIONS.TIP_SHOW]: (payload) => {
      const tip = toGuideTipPayload(payload);
      if (!tip) {
        return {
          ok: false,
          error_code: "invalid_guide_payload",
          message: "guide.tip.show requires payload.message",
        };
      }
      deps.setActiveTip(tip);
      return {
        ok: true,
        data: {
          status: "applied",
          tip_message: tip.message,
          tip_level: tip.level || "info",
        },
      };
    },
  };
}
