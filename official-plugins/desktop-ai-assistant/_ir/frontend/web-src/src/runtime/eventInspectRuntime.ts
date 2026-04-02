import type { UiCapabilityHandler, UiCapabilityRegistration } from "./capabilities";
import type { AssistantEventBus, AssistantRuntimeEventType } from "./events";
import { toRecord } from "./view/runtime.shared";

interface EventInspectRuntimeDeps {
  eventBus: AssistantEventBus;
}

function toStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}

function buildEventPeekSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      since_seq: { type: "number", minimum: 0 },
      limit: { type: "number", minimum: 1, maximum: 200 },
      event_types: {
        type: "array",
        items: { type: "string" },
      },
      session_id: { type: "string" },
      step_id: { type: "string" },
      match: { type: "object" },
    },
  };
}

export function createEventPeekCapabilityRegistration(
  deps: EventInspectRuntimeDeps
): UiCapabilityRegistration {
  const handler: UiCapabilityHandler = async (rawPayload) => {
    const payload = toRecord(rawPayload);
    const sinceSeq = typeof payload.since_seq === "number" && Number.isFinite(payload.since_seq)
      ? payload.since_seq
      : undefined;
    const limit = typeof payload.limit === "number" && Number.isFinite(payload.limit)
      ? payload.limit
      : undefined;
    const eventTypes = toStringArray(payload.event_types);
    const events = deps.eventBus.getRecentEvents({
      since_seq: sinceSeq,
      limit,
      event_types: eventTypes.length > 0 ? eventTypes as AssistantRuntimeEventType[] : undefined,
      session_id: typeof payload.session_id === "string" ? payload.session_id.trim() : undefined,
      step_id: typeof payload.step_id === "string" ? payload.step_id.trim() : undefined,
      payload_match: toRecord(payload.match),
    });
    return {
      ok: true,
      data: {
        events,
        latest_seq: deps.eventBus.getLatestSeq(),
      },
    };
  };

  return {
    definition: {
      name: "assistant.runtime.event.peek",
      description: "Read recent runtime events for debugging, inspection, and flow.wait diagnostics",
      input_schema: buildEventPeekSchema(),
    },
    handler,
  };
}
