import { ref } from "vue";

import type { AssistantCardPayload } from "../../cards/types";

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
  guide_state_version: number;
}

export interface GuideCardLifecycleOptions {
  dismissAfterMs?: number;
  dismissReason?: string;
}

export interface GuideCardDismissPayload {
  reason: string;
  card: AssistantCardPayload;
}

type CardDismissObserver = (payload: GuideCardDismissPayload) => void;

const currentCard = ref<AssistantCardPayload | null>(null);
const activeTip = ref<GuideTipPayload | null>(null);
const narrationState = ref<GuideNarrationState>({
  status: "idle",
  text: "",
  updatedAtMs: Date.now(),
});
const guideStateVersion = ref(0);
let cardDismissTimer: ReturnType<typeof setTimeout> | null = null;
let narrationResetTimer: ReturnType<typeof setTimeout> | null = null;
let cardDismissObserver: CardDismissObserver | null = null;

function buildIdleNarrationState(): GuideNarrationState {
  return {
    status: "idle",
    text: "",
    updatedAtMs: Date.now(),
  };
}

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
  const clearCardDismissTimer = () => {
    if (cardDismissTimer) {
      clearTimeout(cardDismissTimer);
      cardDismissTimer = null;
    }
  };

  const clearNarrationResetTimer = () => {
    if (narrationResetTimer) {
      clearTimeout(narrationResetTimer);
      narrationResetTimer = null;
    }
  };

  const dismissCurrentCard = (reason = "manual") => {
    clearCardDismissTimer();
    if (!currentCard.value) {
      return;
    }
    const dismissedCard = cloneCard(currentCard.value);
    currentCard.value = null;
    guideStateVersion.value += 1;
    cardDismissObserver?.({
      reason,
      card: dismissedCard,
    });
  };

  const scheduleDismissCurrentCard = (delayMs: number, reason = "auto") => {
    if (!currentCard.value) {
      return;
    }
    if (!Number.isFinite(delayMs) || delayMs < 0) {
      dismissCurrentCard(reason);
      return;
    }
    clearCardDismissTimer();
    cardDismissTimer = setTimeout(() => {
      dismissCurrentCard(reason);
    }, delayMs);
  };

  const setCurrentCard = (card: AssistantCardPayload, options?: GuideCardLifecycleOptions) => {
    clearCardDismissTimer();
    currentCard.value = cloneCard(card);
    guideStateVersion.value += 1;
    if (typeof options?.dismissAfterMs === "number") {
      scheduleDismissCurrentCard(options.dismissAfterMs, options.dismissReason || "configured_auto_dismiss");
    }
    return guideStateVersion.value;
  };

  const clearCurrentCard = () => {
    clearCardDismissTimer();
    currentCard.value = null;
    guideStateVersion.value += 1;
  };

  const setActiveTip = (tip: GuideTipPayload | null) => {
    activeTip.value = tip ? cloneTip(tip) : null;
    guideStateVersion.value += 1;
  };

  const setNarrationState = (nextState: GuideNarrationState) => {
    clearNarrationResetTimer();
    narrationState.value = cloneNarrationState(nextState);
    guideStateVersion.value += 1;
  };

  const scheduleResetNarrationState = (delayMs: number) => {
    if (!Number.isFinite(delayMs) || delayMs < 0) {
      setNarrationState(buildIdleNarrationState());
      return;
    }
    clearNarrationResetTimer();
    narrationResetTimer = setTimeout(() => {
      narrationState.value = buildIdleNarrationState();
      guideStateVersion.value += 1;
    }, delayMs);
  };

  const restoreGuideState = (snapshot: GuideStateSnapshot) => {
    clearCardDismissTimer();
    clearNarrationResetTimer();
    currentCard.value = snapshot.current_card ? cloneCard(snapshot.current_card) : null;
    activeTip.value = snapshot.active_tip ? cloneTip(snapshot.active_tip) : null;
    narrationState.value = cloneNarrationState(snapshot.narration_state);
    guideStateVersion.value += 1;
  };

  const resetGuideState = () => {
    clearCardDismissTimer();
    clearNarrationResetTimer();
    currentCard.value = null;
    activeTip.value = null;
    narrationState.value = buildIdleNarrationState();
    guideStateVersion.value += 1;
  };

  const setCardDismissObserver = (observer: CardDismissObserver | null) => {
    cardDismissObserver = observer;
  };

  const getGuideStateSnapshot = (): GuideStateSnapshot => {
    return {
      current_card: currentCard.value ? cloneCard(currentCard.value) : null,
      active_tip: activeTip.value ? cloneTip(activeTip.value) : null,
      narration_state: cloneNarrationState(narrationState.value),
      guide_state_version: guideStateVersion.value,
    };
  };

  return {
    currentCard,
    activeTip,
    narrationState,
    guideStateVersion,
    setCurrentCard,
    clearCurrentCard,
    dismissCurrentCard,
    scheduleDismissCurrentCard,
    scheduleResetNarrationState,
    setCardDismissObserver,
    setActiveTip,
    setNarrationState,
    restoreGuideState,
    resetGuideState,
    getGuideStateSnapshot,
  };
}
