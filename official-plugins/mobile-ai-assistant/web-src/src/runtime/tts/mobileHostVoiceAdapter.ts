import type { AssistantHostAdapter } from "@dawnchat/assistant-core";

import type { MobileTtsEngine } from "./types";

type HostBridgeResult = Record<string, unknown>;

export function createMobileHostVoiceAdapter(engine: MobileTtsEngine): NonNullable<AssistantHostAdapter["voice"]> {
  return {
    speak: async (payload: Record<string, unknown>): Promise<HostBridgeResult> => {
      const text = String(payload.text || "").trim();
      if (!text) {
        return {
          ok: false,
          error_code: "invalid_arguments",
          message: "text is required",
        };
      }
      const outcome = await engine.speak({
        text,
        voice: typeof payload.voice === "string" ? payload.voice : undefined,
        sid: typeof payload.sid === "number" ? payload.sid : undefined,
        interrupt: payload.interrupt === undefined ? undefined : Boolean(payload.interrupt),
      });

      if (outcome.terminalStatus === "cancelled") {
        return {
          ok: false,
          error_code: "step_cancelled",
          message: "tts cancelled",
          data: {
            task_id: outcome.taskId,
            status: "cancelled",
            engine: engine.engineId,
          },
        };
      }
      if (outcome.terminalStatus === "failed") {
        return {
          ok: false,
          error_code: "tts_speak_failed",
          message: outcome.errorMessage || "tts speak failed",
          data: {
            task_id: outcome.taskId,
            status: "failed",
            engine: engine.engineId,
          },
        };
      }
      return {
        ok: true,
        data: {
          task_id: outcome.taskId,
          status: "completed",
          engine: engine.engineId,
        },
      };
    },
    stop: async (payload: Record<string, unknown>): Promise<HostBridgeResult> => {
      const taskId = typeof payload.task_id === "string" ? payload.task_id : undefined;
      await engine.stop(taskId ? `task:${taskId}` : undefined);
      const snap = await engine.getStatus();
      return {
        ok: true,
        data: {
          stopped: true,
          task_id: taskId || snap.taskId || "",
          engine: engine.engineId,
        },
      };
    },
    status: async (payload: Record<string, unknown>): Promise<HostBridgeResult> => {
      const snap = await engine.getStatus();
      const taskId = typeof payload.task_id === "string" ? payload.task_id : snap.taskId;
      return {
        ok: true,
        data: {
          engine: engine.engineId,
          status: snap.status,
          task_id: taskId || "",
          error: snap.error || "",
        },
      };
    },
  };
}
