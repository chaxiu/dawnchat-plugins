import type { AssistantCardPayload } from "../cards/types";

export interface UiCapabilityDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export type UiCapabilityHandler = (
  payload: Record<string, unknown>,
  options: Record<string, unknown>
) => Promise<Record<string, unknown>> | Record<string, unknown>;

export interface UiCapabilityRegistration {
  definition: UiCapabilityDefinition;
  handler: UiCapabilityHandler;
}

declare global {
  interface Window {
    __DAWNCHAT_UI_REGISTER_CAPABILITY__?: (
      definition: UiCapabilityDefinition,
      handler: UiCapabilityHandler
    ) => boolean;
    __DAWNCHAT_UI_UNREGISTER_CAPABILITY__?: (name: string) => boolean;
  }
}

function toRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  return raw as Record<string, unknown>;
}

export function toAssistantCardPayload(raw: unknown): AssistantCardPayload {
  const payload = toRecord(raw);
  const cardType = String(payload.card_type || "").trim();
  const data = toRecord(payload.data);
  return {
    card_type: (cardType || "word") as AssistantCardPayload["card_type"],
    title: typeof payload.title === "string" ? payload.title : undefined,
    data,
  };
}

export function registerCapability(
  definition: UiCapabilityDefinition,
  handler: UiCapabilityHandler
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

export function registerCapabilities(registrations: UiCapabilityRegistration[]): {
  registered: string[];
  failed: string[];
} {
  return registrations.reduce(
    (result, registration) => {
      if (registerCapability(registration.definition, registration.handler)) {
        result.registered.push(registration.definition.name);
      } else {
        result.failed.push(registration.definition.name);
      }
      return result;
    },
    { registered: [] as string[], failed: [] as string[] }
  );
}

export function unregisterCapabilities(names: string[]): {
  unregistered: string[];
  failed: string[];
} {
  return names.reduce(
    (result, name) => {
      if (unregisterCapability(name)) {
        result.unregistered.push(name);
      } else {
        result.failed.push(name);
      }
      return result;
    },
    { unregistered: [] as string[], failed: [] as string[] }
  );
}
