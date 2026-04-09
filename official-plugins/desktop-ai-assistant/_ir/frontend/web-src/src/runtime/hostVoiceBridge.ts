import type { AssistantHostAdapter } from "@dawnchat/assistant-core";

type HostBridgeResult = Record<string, unknown>;

interface HostVoiceInvokePayload {
  text: string;
  voice?: string;
  sid?: number;
  interrupt?: boolean;
}

interface HostVoiceStopPayload {
  taskId?: string;
}

interface HostVoiceStatusPayload {
  taskId?: string;
}

declare global {
  interface Window {
    __DAWNCHAT_HOST_VOICE__?: {
      speak?: (payload: Record<string, unknown>) => Promise<HostBridgeResult> | HostBridgeResult;
      stop?: (payload: Record<string, unknown>) => Promise<HostBridgeResult> | HostBridgeResult;
      status?: (payload: Record<string, unknown>) => Promise<HostBridgeResult> | HostBridgeResult;
    };
  }
}

function isOkResult(result: HostBridgeResult): boolean {
  return Boolean(result && result.ok === true);
}

export async function desktopHostVoiceSpeak(
  payload: HostVoiceInvokePayload
): Promise<HostBridgeResult> {
  const bridge = window.__DAWNCHAT_HOST_VOICE__;
  if (!bridge || typeof bridge.speak !== "function") {
    return {
      ok: false,
      error_code: "host_voice_unavailable",
      message: "host voice bridge unavailable",
    };
  }
  const result = await bridge.speak({
    text: payload.text,
    voice: payload.voice,
    sid: payload.sid,
    interrupt: payload.interrupt,
  });
  if (!result || typeof result !== "object") {
    return {
      ok: false,
      error_code: "invalid_host_voice_result",
      message: "invalid host voice result",
    };
  }
  return result;
}

export async function desktopHostVoiceStop(
  payload: HostVoiceStopPayload
): Promise<HostBridgeResult> {
  const bridge = window.__DAWNCHAT_HOST_VOICE__;
  if (!bridge || typeof bridge.stop !== "function") {
    return {
      ok: false,
      error_code: "host_voice_unavailable",
      message: "host voice bridge unavailable",
    };
  }
  const result = await bridge.stop({
    task_id: payload.taskId,
  });
  if (!result || typeof result !== "object") {
    return {
      ok: false,
      error_code: "invalid_host_voice_result",
      message: "invalid host voice result",
    };
  }
  return result;
}

export async function desktopHostVoiceStatus(
  payload: HostVoiceStatusPayload
): Promise<HostBridgeResult> {
  const bridge = window.__DAWNCHAT_HOST_VOICE__;
  if (!bridge || typeof bridge.status !== "function") {
    return {
      ok: false,
      error_code: "host_voice_unavailable",
      message: "host voice bridge unavailable",
    };
  }
  const result = await bridge.status({
    task_id: payload.taskId,
  });
  if (!result || typeof result !== "object") {
    return {
      ok: false,
      error_code: "invalid_host_voice_result",
      message: "invalid host voice result",
    };
  }
  return result;
}

export async function desktopHostVoiceSpeakOrThrow(
  payload: HostVoiceInvokePayload
): Promise<void> {
  const result = await desktopHostVoiceSpeak(payload);
  if (isOkResult(result)) {
    return;
  }
  throw new Error(String(result.message || result.error_code || "host voice speak failed"));
}

export function createDesktopHostVoiceAdapter(): NonNullable<AssistantHostAdapter["voice"]> {
  return {
    speak: (payload) =>
      desktopHostVoiceSpeak({
        text: String(payload.text || ""),
        voice: typeof payload.voice === "string" ? payload.voice : undefined,
        sid: typeof payload.sid === "number" ? payload.sid : undefined,
        interrupt: payload.interrupt === undefined ? undefined : Boolean(payload.interrupt),
      }),
    stop: (payload) =>
      desktopHostVoiceStop({
        taskId: typeof payload.task_id === "string" ? payload.task_id : undefined,
      }),
    status: (payload) =>
      desktopHostVoiceStatus({
        taskId: typeof payload.task_id === "string" ? payload.task_id : undefined,
      }),
  };
}
