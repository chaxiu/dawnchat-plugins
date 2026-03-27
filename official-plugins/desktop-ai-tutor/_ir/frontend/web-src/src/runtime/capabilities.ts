import type { TutorCardPayload } from "../cards/types";

export interface UiCapabilityDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

type CapabilityHandler = (
  payload: Record<string, unknown>,
  options: Record<string, unknown>
) => Promise<Record<string, unknown>> | Record<string, unknown>;

declare global {
  interface Window {
    __DAWNCHAT_UI_REGISTER_CAPABILITY__?: (
      definition: UiCapabilityDefinition,
      handler: CapabilityHandler
    ) => boolean;
    __DAWNCHAT_UI_UNREGISTER_CAPABILITY__?: (name: string) => boolean;
  }
}

export function toTutorCardPayload(raw: Record<string, unknown>): TutorCardPayload {
  const cardType = String(raw.card_type || "").trim();
  return {
    card_type: (cardType || "word") as TutorCardPayload["card_type"],
    title: typeof raw.title === "string" ? raw.title : undefined,
    data: (raw.data as Record<string, unknown>) || {},
  };
}

export function registerCapability(
  definition: UiCapabilityDefinition,
  handler: CapabilityHandler
): boolean {
  if (typeof window.__DAWNCHAT_UI_REGISTER_CAPABILITY__ !== "function") {
    return false;
  }
  return window.__DAWNCHAT_UI_REGISTER_CAPABILITY__(definition, handler);
}

export function unregisterCapability(name: string): boolean {
  if (typeof window.__DAWNCHAT_UI_UNREGISTER_CAPABILITY__ !== "function") {
    return false;
  }
  return window.__DAWNCHAT_UI_UNREGISTER_CAPABILITY__(name);
}
