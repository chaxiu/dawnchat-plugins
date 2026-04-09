import { getAssistantHostAdapter } from "./hostAdapter";

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

function isOkResult(result: HostBridgeResult): boolean {
  return Boolean(result && result.ok === true);
}

function getRequiredHostVoiceProvider() {
  const voice = getAssistantHostAdapter()?.voice;
  if (voice?.speak || voice?.stop || voice?.status) {
    return voice;
  }
  throw new Error("assistant host adapter with voice bridge is required");
}

export async function hostVoiceSpeak(payload: HostVoiceInvokePayload): Promise<HostBridgeResult> {
  const voiceProvider = getRequiredHostVoiceProvider();
  if (typeof voiceProvider.speak !== "function") {
    throw new Error("assistant host adapter voice.speak is required");
  }
  const result = await voiceProvider.speak({
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
  const voiceProvider = getRequiredHostVoiceProvider();
  if (typeof voiceProvider.stop !== "function") {
    throw new Error("assistant host adapter voice.stop is required");
  }
  const result = await voiceProvider.stop({
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
  const voiceProvider = getRequiredHostVoiceProvider();
  if (typeof voiceProvider.status !== "function") {
    throw new Error("assistant host adapter voice.status is required");
  }
  const result = await voiceProvider.status({
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
