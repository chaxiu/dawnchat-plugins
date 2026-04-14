export type { MobileTtsEngine, MobileTtsSpeakInput, MobileTtsStatusSnapshot, SpeakOutcome } from "./types";
export { CapacitorCommunityTtsEngine } from "./capacitorCommunityTtsEngine";
export { DawnTtsMobileEngine } from "./dawnTtsMobileEngine";
export type { DawnTtsMobileEngineOptions } from "./dawnTtsMobileEngine";
export {
  createCapgoNativeAudioSegmentPlayer,
  createDefaultSegmentPlayer,
  createHtmlAudioSegmentPlayer,
} from "./segmentPlayer";
export type { SegmentPlayer } from "./segmentPlayer";
export { MAX_SEGMENT_CHARS, splitTtsSegments } from "./splitTtsSegments";
export { WebSpeechSynthesisTtsEngine } from "./webSpeechSynthesisTtsEngine";
export { createMobileHostVoiceAdapter } from "./mobileHostVoiceAdapter";
export { createDefaultMobileTtsEngine } from "./createDefaultMobileTtsEngine";
export { voiceHintToBcp47Lang } from "./voiceLang";
