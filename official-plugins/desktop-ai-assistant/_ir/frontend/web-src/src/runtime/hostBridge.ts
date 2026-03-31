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

export async function hostVoiceSpeak(payload: HostVoiceInvokePayload): Promise<HostBridgeResult> {
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

export async function hostVoiceStop(payload: HostVoiceStopPayload): Promise<HostBridgeResult> {
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

export async function hostVoiceStatus(payload: HostVoiceStatusPayload): Promise<HostBridgeResult> {
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

export async function hostVoiceSpeakOrThrow(payload: HostVoiceInvokePayload): Promise<void> {
  const result = await hostVoiceSpeak(payload);
  if (isOkResult(result)) {
    return;
  }
  throw new Error(String(result.message || result.error_code || "host voice speak failed"));
}
