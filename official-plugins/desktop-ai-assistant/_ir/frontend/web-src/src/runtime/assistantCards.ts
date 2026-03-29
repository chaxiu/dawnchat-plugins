import { ref } from "vue";

import type { AssistantCardPayload } from "../cards/types";

const cards = ref<AssistantCardPayload[]>([
  {
    card_type: "word",
    title: "欢迎",
    data: {
      word: "Assistant",
      meaning: "你的自进化智能助理",
      etymology: ["支持富媒体呈现", "支持代码级进化"],
    },
  },
]);

export function useAssistantCards() {
  const appendCard = (card: AssistantCardPayload) => {
    cards.value = [...cards.value, card];
    return cards.value.length;
  };

  const clearCards = () => {
    cards.value = [];
  };

  return {
    cards,
    appendCard,
    clearCards,
  };
}
