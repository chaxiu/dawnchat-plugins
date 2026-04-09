export interface HostOrchestrationLogger {
  info(event: string, payload?: Record<string, unknown>): void;
  warn(event: string, payload?: Record<string, unknown>): void;
  error(event: string, payload?: Record<string, unknown>): void;
}

export interface HostOrchestrationTimerHandle {
  readonly id: ReturnType<typeof setTimeout>;
}

export interface HostOrchestrationTimer {
  now(): number;
  setTimeout(callback: () => void, timeoutMs: number): HostOrchestrationTimerHandle;
  clearTimeout(handle: HostOrchestrationTimerHandle | null | undefined): void;
}

export interface HostOrchestrationBase64Codec {
  encode(input: string): string;
  decode(input: string): string;
}

export interface HostOrchestrationEnvironment {
  logger?: HostOrchestrationLogger;
  timer?: HostOrchestrationTimer;
  base64?: HostOrchestrationBase64Codec;
}

const noopLogger: HostOrchestrationLogger = {
  info() {
  },
  warn() {
  },
  error() {
  },
};

const defaultTimer: HostOrchestrationTimer = {
  now() {
    return Date.now();
  },
  setTimeout(callback, timeoutMs) {
    return {
      id: globalThis.setTimeout(callback, timeoutMs),
    };
  },
  clearTimeout(handle) {
    if (!handle) {
      return;
    }
    globalThis.clearTimeout(handle.id);
  },
};

function encodeUtf8ToBase64(input: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(input, "utf-8").toString("base64");
  }
  if (typeof btoa === "function") {
    return btoa(unescape(encodeURIComponent(input)));
  }
  throw new Error("no base64 encoder available in current host environment");
}

function decodeUtf8FromBase64(input: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(input, "base64").toString("utf-8");
  }
  if (typeof atob === "function") {
    return decodeURIComponent(escape(atob(input)));
  }
  throw new Error("no base64 decoder available in current host environment");
}

const defaultBase64Codec: HostOrchestrationBase64Codec = {
  encode(input) {
    return encodeUtf8ToBase64(String(input || ""));
  },
  decode(input) {
    try {
      return decodeUtf8FromBase64(String(input || ""));
    } catch {
      return "";
    }
  },
};

let installedEnvironment: HostOrchestrationEnvironment | null = null;

export function installHostOrchestrationEnvironment(
  environment?: HostOrchestrationEnvironment | null
) {
  installedEnvironment = environment || null;
}

export function uninstallHostOrchestrationEnvironment() {
  installedEnvironment = null;
}

export function getHostOrchestrationEnvironment(): Required<HostOrchestrationEnvironment> {
  return {
    logger: installedEnvironment?.logger || noopLogger,
    timer: installedEnvironment?.timer || defaultTimer,
    base64: installedEnvironment?.base64 || defaultBase64Codec,
  };
}

export function getHostOrchestrationLogger(): HostOrchestrationLogger {
  return getHostOrchestrationEnvironment().logger;
}

export function getHostOrchestrationTimer(): HostOrchestrationTimer {
  return getHostOrchestrationEnvironment().timer;
}

export function getHostOrchestrationBase64Codec(): HostOrchestrationBase64Codec {
  return getHostOrchestrationEnvironment().base64;
}
