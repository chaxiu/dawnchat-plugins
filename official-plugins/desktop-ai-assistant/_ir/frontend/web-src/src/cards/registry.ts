import type { Component } from "vue";

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
