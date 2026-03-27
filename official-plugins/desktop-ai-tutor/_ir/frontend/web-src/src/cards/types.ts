export type TutorCardType = "word" | "quiz" | "media";

export interface TutorCardPayload {
  card_type: TutorCardType;
  title?: string;
  data: Record<string, unknown>;
}
