import type { Component } from "vue";

import MediaCard from "./MediaCard.vue";
import QuizCard from "./QuizCard.vue";
import WordCard from "./WordCard.vue";
import type { TutorCardType } from "./types";

const cardRegistry: Record<TutorCardType, Component> = {
  word: WordCard,
  quiz: QuizCard,
  media: MediaCard,
};

export function resolveCardComponent(cardType: string): Component | null {
  return cardRegistry[cardType as TutorCardType] || null;
}

export function listCardFunctions(): Array<{
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}> {
  return [
    {
      name: "tutor.render_card",
      description: "Render a tutor card with card_type/title/data payload",
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
      name: "tutor.clear_cards",
      description: "Clear all rendered cards in the tutor canvas",
      input_schema: {
        type: "object",
        properties: {},
      },
    },
  ];
}
