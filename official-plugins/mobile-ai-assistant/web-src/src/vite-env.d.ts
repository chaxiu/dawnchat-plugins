/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_CAPACITOR_COMMUNITY_TTS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
