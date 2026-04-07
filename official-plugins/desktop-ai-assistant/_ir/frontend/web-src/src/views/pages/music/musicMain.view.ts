import MusicMainView from "./MusicMainView.vue";
import { invokeMusicMainCapability } from "./capabilities";
import { MUSIC_NOTE_RANGE, MUSIC_SUPPORTED_NOTES } from "./model/notes";
import {
  cloneMusicResource,
  MUSIC_DEFAULT_RESOURCE,
  normalizeMusicResource,
  openMusicMainView,
  readMusicResourceData,
  validateMusicResource,
} from "./model/resource";
import { musicMainPersistence } from "./model/persistence";
import { buildMusicMainStateSummary } from "./model/summary";
import { defineView } from "../../../runtime/view/manifest";

export {
  cloneMusicResource,
  MUSIC_DEFAULT_RESOURCE,
  normalizeMusicResource,
  openMusicMainView,
  readMusicResourceData,
  validateMusicResource,
} from "./model/resource";
export { buildMusicMainStateSummary } from "./model/summary";
export { musicMainPersistence } from "./model/persistence";
export * from "./model/types";
export { MUSIC_NOTE_RANGE, MUSIC_SUPPORTED_NOTES } from "./model/notes";

export const musicMainView = defineView({
  view_id: "music.main",
  resource_type: "music.piano",
  title: "AI Piano Stage",
  component: MusicMainView,
  state_mode: "stateful",
  default_resource: MUSIC_DEFAULT_RESOURCE,
  anchors: [
    { id: "music.header", title: "Header", description: "Scene intro, transport info, and quick controls." },
    { id: "music.keyboard", title: "Keyboard", description: "Playable piano keys across four octaves (C3-B6)." },
    { id: "music.panel", title: "Panel", description: "Playback state, supported note range, and runtime feedback." },
  ],
  capabilities: [
    {
      id: "music.set_instrument",
      mode: "write",
      title: "Set Instrument",
      description: "Switch current instrument profile (currently only piano) and adjust output volume.",
      input_schema: {
        type: "object",
        properties: {
          instrument: {
            type: "string",
            enum: ["piano"],
          },
          volume: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },
        },
        required: ["instrument"],
      },
      affected_anchors: ["music.header", "music.panel"],
      error_codes: ["invalid_view_capability_input"],
    },
    {
      id: "music.highlight_key",
      mode: "write",
      title: "Highlight Key",
      description: "Highlight one lesson target key for guided practice and wait-aware teaching flows.",
      assistant_hint: "Use this before flow.wait or host event.wait when teaching a melody step-by-step. Replace the target note each step or clear it at lesson end.",
      input_schema: {
        type: "object",
        properties: {
          note: {
            type: "string",
            enum: [...MUSIC_SUPPORTED_NOTES],
          },
          prompt_text: {
            type: "string",
          },
          clear: {
            type: "boolean",
          },
        },
      },
      affected_anchors: ["music.header", "music.keyboard", "music.panel"],
      error_codes: ["note_out_of_range", "invalid_view_capability_input"],
    },
    {
      id: "music.play_note",
      mode: "write",
      title: "Play Note",
      description: "Play one note with explicit duration and gap; optimized for AI step-by-step melody orchestration.",
      assistant_hint: "Always keep note in C3~B6. A single invoke blocks until note playback and gap are finished.",
      input_schema: {
        type: "object",
        properties: {
          note: {
            type: "string",
            enum: [...MUSIC_SUPPORTED_NOTES],
          },
          duration_ms: {
            type: "number",
            minimum: 30,
            maximum: 4000,
          },
          gap_after_ms: {
            type: "number",
            minimum: 0,
            maximum: 3000,
          },
          velocity: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },
        },
        required: ["note", "duration_ms"],
      },
      affected_anchors: ["music.keyboard", "music.panel"],
      error_codes: ["note_out_of_range", "audio_context_not_running", "invalid_view_capability_input"],
    },
    {
      id: "music.play_phrase",
      mode: "write",
      title: "Play Phrase",
      description: "Play a sequence of note steps in order for promo demos or known melodies.",
      assistant_hint: "Use this for songs like 两只老虎. Keep every step note inside C3~B6.",
      input_schema: {
        type: "object",
        properties: {
          steps: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              properties: {
                note: {
                  type: "string",
                  enum: [...MUSIC_SUPPORTED_NOTES],
                },
                duration_ms: {
                  type: "number",
                  minimum: 30,
                  maximum: 4000,
                },
                gap_after_ms: {
                  type: "number",
                  minimum: 0,
                  maximum: 3000,
                },
                velocity: {
                  type: "number",
                  minimum: 0,
                  maximum: 1,
                },
              },
              required: ["note", "duration_ms"],
            },
          },
        },
        required: ["steps"],
      },
      affected_anchors: ["music.keyboard", "music.panel"],
      error_codes: ["note_out_of_range", "audio_context_not_running", "invalid_view_capability_input"],
    },
    {
      id: "music.stop_all",
      mode: "write",
      title: "Stop All",
      description: "Stop all active notes immediately and clear current playback activity.",
      input_schema: {
        type: "object",
        properties: {},
      },
      affected_anchors: ["music.panel"],
    },
    {
      id: "music.get_transport_state",
      mode: "read",
      title: "Get Transport State",
      description: "Read current audio context state, active notes, and whether user gesture is required.",
      input_schema: {
        type: "object",
        properties: {},
      },
      affected_anchors: ["music.header", "music.panel"],
    },
  ],
  interaction_hints: {
    interaction_intent: "Best for demo-ready, stepwise melody playback where AI controls note timing and users can directly press keys.",
    recommended_mode: "hybrid",
    decision_rule: "Transport reads may stay direct, while playback or teaching sequences should default to session.start plus event waiting.",
    examples: [
      {
        name: "open_then_describe",
        mode: "entry",
        call: {
          tool: "dawnchat.ui.capability.invoke",
          payload: {
            plugin_id: "<plugin_id>",
            function: "view.open",
            input: {
              view_id: "music.main",
              resource: {},
              initial_anchor: "music.header",
            },
          },
        },
        then: {
          tool: "dawnchat.ui.capability.invoke",
          payload: {
            plugin_id: "<plugin_id>",
            function: "assistant.view.describe",
            input: {
              view_id: "music.main",
            },
          },
        },
      },
      {
        name: "direct_get_transport_state",
        mode: "direct_capability",
        call: {
          tool: "dawnchat.ui.capability.invoke",
          payload: {
            plugin_id: "<plugin_id>",
            function: "view.capability.invoke",
            input: {
              view_id: "music.main",
              capability_id: "music.get_transport_state",
              input: {},
            },
          },
        },
      },
      {
        name: "session_play_phrase",
        mode: "session_start",
        call: {
          tool: "dawnchat.ui.session.start",
          payload: {
            plugin_id: "<plugin_id>",
            steps: [
              {
                id: "play-phrase",
                action: {
                  type: "view.capability.invoke",
                  payload: {
                    view_id: "music.main",
                    capability_id: "music.play_phrase",
                    input: {
                      steps: [
                        { note: "C4", duration_ms: 320, gap_after_ms: 80 },
                        { note: "D4", duration_ms: 320, gap_after_ms: 80 },
                        { note: "E4", duration_ms: 420, gap_after_ms: 120 },
                      ],
                    },
                  },
                },
              },
            ],
          },
        },
      },
      {
        name: "session_narrate_then_play",
        mode: "session_start",
        call: {
          tool: "dawnchat.ui.session.start",
          payload: {
            plugin_id: "<plugin_id>",
            steps: [
              {
                id: "intro",
                action: {
                  type: "guide.narrate",
                  payload: {
                    text: "下面开始演示一段简短旋律。",
                  },
                },
              },
              {
                id: "phrase",
                action: {
                  type: "view.capability.invoke",
                  payload: {
                    view_id: "music.main",
                    capability_id: "music.play_phrase",
                    input: {
                      steps: [
                        { note: "G4", duration_ms: 260, gap_after_ms: 60 },
                        { note: "A4", duration_ms: 260, gap_after_ms: 60 },
                        { note: "G4", duration_ms: 360, gap_after_ms: 120 },
                      ],
                    },
                  },
                },
              },
            ],
          },
        },
      },
      {
        name: "lesson_highlight_then_wait_for_match",
        mode: "session_start",
        call: {
          tool: "dawnchat.ui.session.start",
          payload: {
            plugin_id: "<plugin_id>",
            steps: [
              {
                id: "teach-c4",
                action: {
                  type: "view.capability.invoke",
                  payload: {
                    view_id: "music.main",
                    capability_id: "music.highlight_key",
                    input: {
                      note: "C4",
                      prompt_text: "请先弹 C4。",
                    },
                  },
                },
              },
              {
                id: "wait-c4-match",
                action: {
                  type: "flow.wait",
                  payload: {
                    event_types: ["assistant.music.lesson_note_matched"],
                    match: {
                      note: "C4",
                      expected_note: "C4",
                      source: "user",
                    },
                    timeout_ms: 20000,
                  },
                },
              },
            ],
          },
        },
      },
    ],
    key_events: [
      {
        type: "assistant.music.note_started",
        description: "Emitted when one note starts, including note and timing payload for wait matching.",
        match_fields: ["note", "duration_ms", "resource_id"],
      },
      {
        type: "assistant.music.note_ended",
        description: "Emitted after one note finishes playback.",
        match_fields: ["note", "duration_ms", "resource_id"],
      },
      {
        type: "assistant.music.key_pressed",
        description: "Emitted when user manually clicks a piano key in UI.",
        match_fields: ["note", "source", "resource_id"],
      },
      {
        type: "assistant.music.lesson_note_matched",
        description: "Emitted when the current highlighted lesson target is correctly pressed by the user. Use it with flow.wait inside teaching sessions.",
        match_fields: ["note", "expected_note", "source", "resource_id"],
      },
    ],
  },
  persistence: musicMainPersistence,
  open: openMusicMainView,
  normalizeResource: validateMusicResource,
  invokeCapability: invokeMusicMainCapability,
  getStateSummary: buildMusicMainStateSummary,
});

