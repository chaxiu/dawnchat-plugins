export interface AgentLoopTurnInput {
  messages: Array<Record<string, unknown>>;
  tools?: Array<Record<string, unknown>>;
}

export interface AgentLoopRunner {
  run(input: AgentLoopTurnInput): Promise<Record<string, unknown>>;
}
