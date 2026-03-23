<script setup lang="ts">
import { computed, ref } from "vue";
import type { Component } from "vue";
import { defaultHomeScene } from "./models/home_scene";
import HolographicCommandOrbScene from "./views/pages/home/HolographicCommandOrbScene.vue";

type SceneKey = "holographic-command-orb";

type SceneItem = {
  key: SceneKey;
  label: string;
  component: Component;
};

const scenes: SceneItem[] = [
  {
    key: "holographic-command-orb",
    label: "Holographic Orb",
    component: HolographicCommandOrbScene,
  },
];

const activeScene = ref<SceneKey>(defaultHomeScene.sceneId);

const activeSceneComponent = computed(() => {
  const hit = scenes.find((item) => item.key === activeScene.value);
  return hit?.component ?? HolographicCommandOrbScene;
});
</script>

<template>
  <main class="starter-shell">
    <div class="scene-stage">
      <component :is="activeSceneComponent" :key="activeScene" />
    </div>
  </main>
</template>

<style scoped>
.starter-shell {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.scene-stage {
  position: absolute;
  inset: 0;
}

.scene-switcher {
  position: absolute;
  left: 18px;
  top: 18px;
  z-index: 40;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  max-width: min(76vw, 820px);
  padding: 8px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.26);
  background: rgba(2, 8, 23, 0.55);
  backdrop-filter: blur(8px);
  box-shadow: 0 0 20px rgba(15, 23, 42, 0.45);
}

.switcher-btn {
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: rgba(15, 23, 42, 0.42);
  color: rgba(226, 232, 240, 0.9);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 7px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
}

.switcher-btn:hover {
  border-color: rgba(125, 211, 252, 0.46);
  color: #e0f2fe;
  transform: translateY(-1px);
}

.switcher-btn.active {
  border-color: rgba(34, 211, 238, 0.56);
  background: rgba(8, 47, 73, 0.58);
  color: #cffafe;
  box-shadow: 0 0 18px rgba(34, 211, 238, 0.28);
}

@media (max-width: 860px) {
  .scene-switcher {
    left: 10px;
    top: 10px;
    right: 10px;
    max-width: none;
  }
}
</style>
