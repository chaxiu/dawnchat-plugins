<script setup lang="ts">
import { computed, onMounted } from "vue";

import { useMusicScene } from "./composables/useMusicScene";

const {
  capabilityError,
  isAudioUnlocking,
  isMusicActive,
  isMutating,
  keyboardLayout,
  musicData,
  playNoteFromUser,
  refreshTransportState,
  requiresAudioUnlock,
  stopAll,
  unlockAudioByGesture,
  visualActiveNotes,
} = useMusicScene();

const hudTitle = computed(() => {
  if (!musicData.value) {
    return "Concert Piano";
  }
  const active = visualActiveNotes.value.join(", ");
  return active ? `Now Playing: ${active}` : "Concert Piano";
});

const lessonTargetNote = computed(() => musicData.value?.lesson.highlighted_note || "");
const lessonPromptText = computed(() => musicData.value?.lesson.prompt_text || "");
const lessonTargetMarker = computed(() => {
  const note = lessonTargetNote.value;
  const layout = keyboardLayout.value;
  if (!note || layout.white_key_count <= 0) {
    return null;
  }
  const blackKey = layout.black_keys.find((key) => key.note === note);
  if (blackKey) {
    return {
      note,
      leftPercent: blackKey.left_percent,
      top: "58%",
      isBlack: true,
    };
  }
  const whiteKey = layout.white_keys.find((key) => key.note === note);
  if (!whiteKey) {
    return null;
  }
  return {
    note,
    leftPercent: ((whiteKey.white_index + 0.5) / layout.white_key_count) * 100,
    top: "66%",
    isBlack: false,
  };
});

function isKeyActive(note: string): boolean {
  return visualActiveNotes.value.includes(note);
}

onMounted(() => {
  void refreshTransportState();
});
</script>

<template>
  <section class="piano-scene" data-view-id="music.main">
    <div v-if="isMusicActive && musicData" class="stage-root">
      <div class="stage-backdrop" />

      <header class="floating-hud">
        <div class="hud-main">
          <p class="hud-title">{{ hudTitle }}</p>
          <p class="hud-sub">
            Range {{ musicData.keyboard.min_note }} ~ {{ musicData.keyboard.max_note }} ·
            Played {{ musicData.playback.played_notes_count }} notes
          </p>
          <p v-if="lessonPromptText || lessonTargetNote" class="hud-lesson">
            Lesson {{ lessonPromptText || `Press ${lessonTargetNote}` }}
          </p>
        </div>
        <div class="hud-actions">
          <span class="hud-pill">State {{ musicData.audio.audio_context_state }}</span>
          <button type="button" :disabled="isMutating" @click="stopAll">Stop</button>
        </div>
      </header>

      <main class="piano-deck">
        <div class="piano-shell">
          <div v-if="lessonTargetMarker" class="lesson-overlay" aria-hidden="true">
            <div
              class="lesson-halo-marker"
              :class="lessonTargetMarker.isBlack ? 'is-black-target' : 'is-white-target'"
              :data-note="lessonTargetMarker.note"
              :style="{ left: `${lessonTargetMarker.leftPercent}%`, top: lessonTargetMarker.top }"
            />
          </div>
          <div class="white-keys" :style="{ '--white-count': String(Math.max(1, keyboardLayout.white_key_count)) }">
            <button
              v-for="key in keyboardLayout.white_keys"
              :key="`white-${key.note}`"
              type="button"
              class="piano-key white-key"
              :class="{ 'is-active': isKeyActive(key.note) }"
              :data-note="key.note"
              @click="playNoteFromUser(key.note)"
            >
              <span>{{ key.note }}</span>
            </button>
          </div>
          <div class="black-keys">
            <button
              v-for="key in keyboardLayout.black_keys"
              :key="`black-${key.note}`"
              type="button"
              class="piano-key black-key"
              :class="{ 'is-active': isKeyActive(key.note) }"
              :style="{ left: `calc(${key.left_percent}% - var(--black-key-width) / 2)` }"
              :data-note="key.note"
              @click="playNoteFromUser(key.note)"
            >
              <span>{{ key.note }}</span>
            </button>
          </div>
        </div>
        <p v-if="capabilityError" class="error">{{ capabilityError }}</p>
      </main>

      <div v-if="requiresAudioUnlock" class="unlock-overlay">
        <div class="unlock-card">
          <h3>Tap to enable piano audio</h3>
          <p>AudioContext is locked. One click will silently resume playback support.</p>
          <button type="button" :disabled="isAudioUnlocking" @click="unlockAudioByGesture">
            {{ isAudioUnlocking ? "Enabling..." : "Enable Audio" }}
          </button>
        </div>
      </div>
    </div>

    <div v-else class="idle">
      <p>Music Piano Scene</p>
      <p>Waiting for <code>view.open</code> with <code>music.piano</code>.</p>
    </div>
  </section>
</template>

<style scoped>
.piano-scene {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.stage-root {
  position: relative;
  flex: 1 1 100%;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 0;
  overflow: hidden;
  border-radius: 0;
  display: flex;
  flex-direction: column;
}

.stage-backdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(130% 80% at 50% 100%, rgba(58, 44, 33, 0.9) 0%, rgba(22, 19, 16, 0.96) 58%, rgba(11, 10, 9, 1) 100%),
    linear-gradient(180deg, rgba(201, 168, 106, 0.08), transparent 24%);
}

.floating-hud {
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0;
  padding: 12px 14px;
  width: min(1080px, calc(100% - 24px));
  border: 1px solid rgba(201, 168, 106, 0.42);
  border-radius: 14px;
  background: rgba(22, 19, 16, 0.74);
  backdrop-filter: blur(5px);
}

.hud-title {
  margin: 0;
  color: #f5ead5;
  font-weight: 700;
}

.hud-sub {
  margin: 3px 0 0;
  color: #d7c3a0;
  font-size: 0.86rem;
}

.hud-lesson {
  margin: 6px 0 0;
  color: #f0d27f;
  font-size: 0.83rem;
  font-weight: 600;
}

.hud-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hud-pill {
  border: 1px solid rgba(201, 168, 106, 0.35);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.78rem;
  color: #e3c992;
}

.hud-actions button,
.unlock-card button {
  border: 1px solid rgba(201, 168, 106, 0.58);
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(58, 44, 33, 0.95), rgba(43, 33, 24, 0.95));
  color: #f5ead5;
  padding: 8px 14px;
  font-weight: 700;
  cursor: pointer;
}

.piano-deck {
  position: relative;
  z-index: 1;
  flex: 1 1 auto;
  width: 100%;
  margin: 0;
  padding: 92px 20px 20px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.piano-shell {
  position: relative;
  width: min(1320px, 100%);
  margin: 0 auto;
  --white-key-height: clamp(170px, 30vh, 290px);
  --black-key-height: calc(var(--white-key-height) * 0.62);
  --black-key-width: clamp(16px, 1.9vw, 26px);
  overflow: visible;
}

.white-keys {
  display: grid;
  grid-template-columns: repeat(var(--white-count), minmax(0, 1fr));
  gap: 1px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 0 0 12px 12px;
  overflow: hidden;
}

.black-keys {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: var(--black-key-height);
  pointer-events: none;
  z-index: 2;
}

.lesson-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 3;
  overflow: visible;
}

.piano-key {
  position: relative;
  border: 0;
  cursor: pointer;
  font-weight: 700;
  transition: transform 90ms ease, box-shadow 120ms ease, background-color 120ms ease;
}

.piano-key span {
  position: relative;
  z-index: 2;
  pointer-events: none;
  font-size: 0.68rem;
}

.lesson-halo-marker {
  position: absolute;
  pointer-events: none;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  border: 2px solid rgba(255, 221, 120, 0.96);
  background:
    radial-gradient(circle, rgba(255, 255, 255, 1) 0%, rgba(255, 250, 232, 0.98) 42%, rgba(255, 235, 163, 0.92) 68%, rgba(255, 227, 128, 0.72) 82%, rgba(255, 227, 128, 0.18) 100%);
  box-shadow:
    0 0 0 3px rgba(255, 255, 255, 0.58),
    0 0 20px rgba(255, 250, 220, 0.98),
    0 0 36px rgba(255, 232, 148, 0.82),
    0 0 56px rgba(255, 218, 118, 0.5);
  animation: lesson-halo-pulse 1.4s ease-in-out infinite;
  opacity: 1;
}

.lesson-halo-marker.is-white-target {
  width: clamp(42px, 4.2vw, 58px);
  height: clamp(42px, 4.2vw, 58px);
}

.lesson-halo-marker.is-black-target {
  width: clamp(28px, 2.8vw, 38px);
  height: clamp(28px, 2.8vw, 38px);
}

.white-key {
  height: var(--white-key-height);
  background: linear-gradient(180deg, #f7f3ea 0%, #efe5d7 78%, #ddcdb3 100%);
  color: #2d2418;
  border-bottom: 3px solid rgba(43, 33, 24, 0.38);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0 2px 10px;
}

.white-key.is-active {
  transform: translateY(2px);
  background: linear-gradient(180deg, #f0e8da 0%, #e9ddc8 80%, #d6c19f 100%);
  box-shadow: inset 0 0 0 2px rgba(201, 168, 106, 0.42);
}

.black-key {
  position: absolute;
  pointer-events: auto;
  width: var(--black-key-width);
  height: var(--black-key-height);
  border-radius: 0 0 8px 8px;
  background: linear-gradient(180deg, #202020 0%, #151515 58%, #0e0e0e 100%);
  color: #d8c6a7;
  border: 1px solid rgba(227, 201, 146, 0.22);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 6px;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.5);
}

.black-key span {
  font-size: 0.58rem;
}

.black-key.is-active {
  transform: translateY(2px) scale(0.99);
  background: linear-gradient(180deg, #2c261e 0%, #201b15 60%, #15120f 100%);
  box-shadow:
    0 4px 10px rgba(0, 0, 0, 0.45),
    0 0 0 1px rgba(227, 201, 146, 0.35);
}

@keyframes lesson-halo-pulse {
  0%,
  100% {
    opacity: 0.96;
    transform: translate(-50%, -50%) scale(0.92);
  }

  50% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.12);
  }
}

.error {
  margin: 14px auto 0;
  width: min(1320px, 100%);
  color: #c65a46;
  font-weight: 600;
}

.unlock-overlay {
  position: absolute;
  inset: 0;
  z-index: 4;
  background: rgba(7, 7, 6, 0.66);
  display: grid;
  place-items: center;
}

.unlock-card {
  width: min(460px, 88vw);
  border: 1px solid rgba(201, 168, 106, 0.45);
  border-radius: 14px;
  background: rgba(22, 19, 16, 0.96);
  padding: 16px;
  color: #f1e3c8;
}

.unlock-card h3 {
  margin: 0 0 8px;
}

.unlock-card p {
  margin: 0 0 12px;
  color: #d4c1a1;
}

.idle {
  min-height: min(420px, 70vh);
  display: grid;
  place-content: center;
  text-align: center;
  color: #d4c1a1;
}

.idle code {
  background: rgba(22, 19, 16, 0.8);
  padding: 0.1em 0.35em;
  border-radius: 6px;
}

@media (max-width: 820px) {
  .floating-hud {
    top: 10px;
  }

  .floating-hud {
    flex-direction: column;
    align-items: stretch;
  }

  .piano-deck {
    padding: 116px 12px 12px;
  }

  .hud-actions {
    justify-content: space-between;
  }

  .white-key span {
    font-size: 0.58rem;
  }

  .black-key span {
    display: none;
  }
}
</style>
