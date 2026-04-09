import { getHostOrchestrationLogger } from "./env";

export const logger = {
  info(event: string, payload?: Record<string, unknown>) {
    getHostOrchestrationLogger().info(event, payload);
  },
  warn(event: string, payload?: Record<string, unknown>) {
    getHostOrchestrationLogger().warn(event, payload);
  },
  error(event: string, payload?: Record<string, unknown>) {
    getHostOrchestrationLogger().error(event, payload);
  },
};
