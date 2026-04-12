import { Capacitor } from "@capacitor/core";

import { CapacitorCommunityTtsEngine } from "./capacitorCommunityTtsEngine";
import { WebSpeechSynthesisTtsEngine } from "./webSpeechSynthesisTtsEngine";
import type { MobileTtsEngine } from "./types";

export function createDefaultMobileTtsEngine(): MobileTtsEngine {
  if (Capacitor.getPlatform() === "web") {
    return new WebSpeechSynthesisTtsEngine();
  }
  return new CapacitorCommunityTtsEngine();
}
