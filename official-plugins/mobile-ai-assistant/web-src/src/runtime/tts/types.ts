export type MobileTtsTerminalStatus = "completed" | "cancelled" | "failed";

export interface SpeakOutcome {
  taskId: string;
  terminalStatus: MobileTtsTerminalStatus;
  errorMessage?: string;
}

export interface MobileTtsSpeakInput {
  text: string;
  voice?: string;
  interrupt?: boolean;
  sid?: number;
}

export interface MobileTtsStatusSnapshot {
  status: "idle" | "speaking" | "error";
  taskId?: string;
  error?: string;
}

export interface MobileTtsEngine {
  readonly engineId: string;
  speak(input: MobileTtsSpeakInput): Promise<SpeakOutcome>;
  stop(reason?: string): Promise<void>;
  getStatus(): Promise<MobileTtsStatusSnapshot>;
}
