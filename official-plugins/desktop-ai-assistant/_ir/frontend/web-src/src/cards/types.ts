export type AssistantCardType = "word" | "quiz" | "media";

export interface AssistantCardPayload {
  card_type: AssistantCardType;
  title?: string;
  data: Record<string, unknown>;
}
