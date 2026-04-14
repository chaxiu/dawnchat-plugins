import { Capacitor } from "@capacitor/core";
import { DawnTts } from "@dawnchat/capacitor-dawn-tts";

import { CapacitorCommunityTtsEngine } from "./capacitorCommunityTtsEngine";
import { DawnTtsMobileEngine } from "./dawnTtsMobileEngine";
import { createCapgoNativeAudioSegmentPlayer } from "./segmentPlayer";
import { WebSpeechSynthesisTtsEngine } from "./webSpeechSynthesisTtsEngine";
import type { MobileTtsEngine } from "./types";

function useCapacitorCommunityTts(): boolean {
  return import.meta.env.VITE_USE_CAPACITOR_COMMUNITY_TTS === "1";
}

export function createDefaultMobileTtsEngine(): MobileTtsEngine {
  if (Capacitor.getPlatform() === "web") {
    return new WebSpeechSynthesisTtsEngine();
  }
  if (useCapacitorCommunityTts()) {
    return new CapacitorCommunityTtsEngine();
  }
  return new DawnTtsMobileEngine({
    dawn: DawnTts,
    segmentPlayer: createCapgoNativeAudioSegmentPlayer(),
  });
}
