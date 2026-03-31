export const GUIDE_ACTIONS = {
  CARD_SHOW: "card.show",
  NARRATE: "narrate",
  TIP_SHOW: "tip.show",
} as const;

export type GuideActionName = (typeof GUIDE_ACTIONS)[keyof typeof GUIDE_ACTIONS];
