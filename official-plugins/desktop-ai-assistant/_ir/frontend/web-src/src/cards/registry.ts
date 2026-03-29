import type { Component } from "vue";

import type {
  UiCapabilityDefinition,
  UiCapabilityRegistration,
} from "../runtime/capabilities";
import MediaCard from "./MediaCard.vue";
import QuizCard from "./QuizCard.vue";
import WordCard from "./WordCard.vue";
import type { AssistantCardType } from "./types";

const cardRegistry: Record<AssistantCardType, Component> = {
  word: WordCard,
  quiz: QuizCard,
  media: MediaCard,
};

export function resolveCardComponent(cardType: string): Component | null {
  return cardRegistry[cardType as AssistantCardType] || null;
}

const CARD_FUNCTION_DEFINITIONS: UiCapabilityDefinition[] = [
  {
    name: "assistant.render_card",
    description: "Render an assistant card with card_type/title/data payload",
    input_schema: {
      type: "object",
      properties: {
        card_type: { type: "string", enum: ["word", "quiz", "media"] },
        title: { type: "string" },
        data: { type: "object" },
      },
      required: ["card_type", "data"],
    },
  },
  {
    name: "assistant.clear_cards",
    description: "Clear all rendered cards in the assistant canvas",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
];

export interface CardCapabilityHandlers {
  onRenderCard: (payload: Record<string, unknown>) => Promise<Record<string, unknown>> | Record<string, unknown>;
  onClearCards: (payload: Record<string, unknown>) => Promise<Record<string, unknown>> | Record<string, unknown>;
}

export function listCardFunctions(): UiCapabilityDefinition[] {
  return CARD_FUNCTION_DEFINITIONS;
}

export function createCardCapabilityRegistrations(
  handlers: CardCapabilityHandlers
): UiCapabilityRegistration[] {
  const [renderCard, clearCards] = CARD_FUNCTION_DEFINITIONS;
  return [
    {
      definition: renderCard,
      handler: handlers.onRenderCard,
    },
    {
      definition: clearCards,
      handler: handlers.onClearCards,
    },
  ];
}
