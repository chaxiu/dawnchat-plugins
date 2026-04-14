import { registerPlugin } from "@capacitor/core";

/**
 * DawnChat host Capacitor plugin: native POST dawn-tts (Supabase session), returns local MP3 path.
 *
 * Native implementations live in dawnchat-android / dawnchat-ios; this module is the WebView client.
 */
export interface DawnTtsSynthesizeOptions {
  text: string;
  voice?: string;
  rate?: string;
  volume?: string;
  pitch?: string;
}

export interface DawnTtsSynthesizeResult {
  path: string;
}

export interface DawnTtsPlugin {
  synthesizeToFile(options: DawnTtsSynthesizeOptions): Promise<DawnTtsSynthesizeResult>;
}

export const DawnTts = registerPlugin<DawnTtsPlugin>("DawnTts");
