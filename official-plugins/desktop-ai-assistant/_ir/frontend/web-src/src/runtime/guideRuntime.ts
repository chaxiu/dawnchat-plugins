import { toAssistantCardPayload } from "./capabilities";
import { GUIDE_ACTIONS, type GuideActionName } from "./guideActions";
import { hostVoiceSpeak, hostVoiceStatus, hostVoiceStop } from "./hostBridge";
import type { SessionStepRuntimeContext } from "./sessionStepExecutor";
import type { AssistantCardPayload } from "../cards/types";
import type { GuideNarrationState, GuideTipPayload } from "./guideState";

type StepActionResult = {
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
type GuideActionHandler = (
  payload: Record<string, unknown>,
  context: SessionStepRuntimeContext
) => StepActionResult;

export interface GuideRuntimeDeps {
  setCurrentCard: (card: AssistantCardPayload) => number;
  setActiveTip: (tip: GuideTipPayload | null) => void;
  setNarrationState: (state: GuideNarrationState) => void;
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

export function createGuideRuntime(deps: GuideRuntimeDeps): GuideRuntimeHandlers {
  return {
    [GUIDE_ACTIONS.CARD_SHOW]: (payload) => {
      const normalized = toAssistantCardPayload(payload);
      deps.setCurrentCard(normalized);
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
        return {
          ok: false,
          error_code: String(result?.error_code || "guide_narrate_failed"),
          message: errorMessage,
        };
      }
      deps.setNarrationState(buildNarrationState("completed", text));
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
