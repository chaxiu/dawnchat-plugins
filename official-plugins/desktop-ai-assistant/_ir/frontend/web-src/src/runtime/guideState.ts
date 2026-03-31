import { ref } from "vue";

import type { AssistantCardPayload } from "../cards/types";

export interface GuideTipPayload {
  message: string;
  title?: string;
  level?: string;
}

export interface GuideNarrationState {
  status: "idle" | "playing" | "cancelling" | "cancelled" | "completed" | "failed";
  text: string;
  updatedAtMs: number;
  errorMessage?: string;
}

export interface GuideStateSnapshot {
  current_card: AssistantCardPayload | null;
  active_tip: GuideTipPayload | null;
  narration_state: GuideNarrationState;
}

const currentCard = ref<AssistantCardPayload | null>(null);

const activeTip = ref<GuideTipPayload | null>(null);
const narrationState = ref<GuideNarrationState>({
  status: "idle",
  text: "",
  updatedAtMs: Date.now(),
});

function cloneJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function cloneCard(card: AssistantCardPayload): AssistantCardPayload {
  return {
    card_type: card.card_type,
    title: card.title,
    data: cloneJsonValue(card.data),
  };
}

function cloneTip(tip: GuideTipPayload): GuideTipPayload {
  return {
    message: tip.message,
    title: tip.title,
    level: tip.level,
  };
}

function cloneNarrationState(state: GuideNarrationState): GuideNarrationState {
  return {
    status: state.status,
    text: state.text,
    updatedAtMs: state.updatedAtMs,
    errorMessage: state.errorMessage,
  };
}

export function useGuideState() {
  const setCurrentCard = (card: AssistantCardPayload) => {
    currentCard.value = cloneCard(card);
    return 1;
  };

  const clearCurrentCard = () => {
    currentCard.value = null;
  };

  const setActiveTip = (tip: GuideTipPayload | null) => {
    activeTip.value = tip ? cloneTip(tip) : null;
  };

  const setNarrationState = (nextState: GuideNarrationState) => {
    narrationState.value = cloneNarrationState(nextState);
  };

  const getGuideStateSnapshot = (): GuideStateSnapshot => {
    return {
      current_card: currentCard.value ? cloneCard(currentCard.value) : null,
      active_tip: activeTip.value ? cloneTip(activeTip.value) : null,
      narration_state: cloneNarrationState(narrationState.value),
    };
  };

  return {
    currentCard,
    activeTip,
    narrationState,
    setCurrentCard,
    clearCurrentCard,
    setActiveTip,
    setNarrationState,
    getGuideStateSnapshot,
  };
}
