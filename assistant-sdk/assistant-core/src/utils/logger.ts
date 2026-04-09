type LogLevel = "debug" | "info" | "warn" | "error";

function isDebugEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const url = new URL(window.location.href);
    const queryFlag = String(url.searchParams.get("board_debug") || "").toLowerCase();
    if (queryFlag === "1" || queryFlag === "true" || queryFlag === "yes") {
      return true;
    }
    const storageFlag = String(window.localStorage.getItem("dawnchat.board.debug") || "").toLowerCase();
    return storageFlag === "1" || storageFlag === "true" || storageFlag === "yes";
  } catch {
    return false;
  }
}

function write(level: LogLevel, message: string, payload?: Record<string, unknown>) {
  if (!isDebugEnabled()) {
    return;
  }
  const prefix = `[board-debug] ${message}`;
  if (typeof console === "undefined") {
    return;
  }
  if (payload && Object.keys(payload).length > 0) {
    console[level](prefix, payload);
    return;
  }
  console[level](prefix);
}

export const logger = {
  debug(message: string, payload?: Record<string, unknown>) {
    write("debug", message, payload);
  },
  info(message: string, payload?: Record<string, unknown>) {
    write("info", message, payload);
  },
  warn(message: string, payload?: Record<string, unknown>) {
    write("warn", message, payload);
  },
  error(message: string, payload?: Record<string, unknown>) {
    write("error", message, payload);
  },
};
