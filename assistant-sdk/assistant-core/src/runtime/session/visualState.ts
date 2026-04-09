import { ref } from "vue";

export type SessionVisualStatus = "idle" | "running";

const sessionVisualStatus = ref<SessionVisualStatus>("idle");
const activeSessionId = ref<string>("");

export function useSessionVisualState() {
  const setSessionRunning = (sessionId: string) => {
    sessionVisualStatus.value = "running";
    activeSessionId.value = sessionId;
  };

  const setSessionIdle = () => {
    sessionVisualStatus.value = "idle";
    activeSessionId.value = "";
  };

  const setFromActiveSessions = (sessionIds: string[]) => {
    if (sessionIds.length === 0) {
      setSessionIdle();
      return;
    }
    setSessionRunning(sessionIds[0]);
  };

  return {
    sessionVisualStatus,
    activeSessionId,
    setSessionRunning,
    setSessionIdle,
    setFromActiveSessions,
  };
}
