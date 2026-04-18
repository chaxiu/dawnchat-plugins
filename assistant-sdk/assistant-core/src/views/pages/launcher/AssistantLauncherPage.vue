<script setup lang="ts">
import { ChevronLeft, LayoutGrid } from "lucide-vue-next";
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { GENERAL_TASK_TEMPLATE_ID, getTaskRuntimeHandle, type TaskSummary, type TaskTemplateSummary } from "../../../runtime";
import {
  goBackFromAssistantLauncher,
  hasLauncherBackTarget,
  launcherContentExitFullPath,
} from "../../../runtime/view/launcherNavigation";
import { filterRegistrationsForLauncher, resolveLauncherIconComponent } from "../../../runtime/view/launcherResolve";
import { listViewRegistrations } from "../../../runtime/view/registry";
import { openAssistantViewFromShell } from "../../../runtime/view/runtime.open";

const router = useRouter();
const route = useRoute();

const toolItems = computed(() => filterRegistrationsForLauncher(listViewRegistrations()));

const openingId = ref<string | null>(null);
const creatingTask = ref(false);
const recentTasks = ref<TaskSummary[]>([]);
const taskTemplates = ref<TaskTemplateSummary[]>([]);

/** Reacts to route + tracked exit path so Back hides on cold start (no prior content). */
const showBack = computed(() => {
  void route.fullPath;
  void launcherContentExitFullPath.value;
  return hasLauncherBackTarget(router);
});

function goBack() {
  void goBackFromAssistantLauncher(router);
}

async function refreshTaskLauncherData() {
  const taskRuntime = getTaskRuntimeHandle();
  if (!taskRuntime) {
    recentTasks.value = [];
    taskTemplates.value = [];
    return;
  }
  const [tasks, templates] = await Promise.all([
    taskRuntime.listTasks({ limit: 12 }),
    taskRuntime.listTaskTemplates(),
  ]);
  recentTasks.value = tasks;
  taskTemplates.value = templates;
}

async function openView(viewId: string) {
  if (openingId.value) {
    return;
  }
  openingId.value = viewId;
  try {
    await openAssistantViewFromShell(viewId);
  } finally {
    openingId.value = null;
  }
}

async function openTask(taskId: string) {
  const taskRuntime = getTaskRuntimeHandle();
  if (!taskRuntime || openingId.value) {
    return;
  }
  openingId.value = `task:${taskId}`;
  try {
    await taskRuntime.openTask(taskId);
    await refreshTaskLauncherData();
  } finally {
    openingId.value = null;
  }
}

async function createTask(templateId: string) {
  const taskRuntime = getTaskRuntimeHandle();
  if (!taskRuntime || creatingTask.value) {
    return;
  }
  creatingTask.value = true;
  try {
    const task = await taskRuntime.createTask({
      template_id: templateId || GENERAL_TASK_TEMPLATE_ID,
      title: "New Task",
    });
    await taskRuntime.openTask(task.task_id);
    await refreshTaskLauncherData();
  } finally {
    creatingTask.value = false;
  }
}

onMounted(() => {
  void refreshTaskLauncherData();
});
</script>

<template>
  <div class="assistant-launcher">
    <header
      class="assistant-launcher__header"
      :class="{ 'assistant-launcher__header--no-back': !showBack }"
    >
      <button
        v-if="showBack"
        type="button"
        class="assistant-launcher__back"
        :aria-label="'Back'"
        @click="goBack"
      >
        <ChevronLeft :size="22" aria-hidden="true" />
        <span>Back</span>
      </button>
      <h1 class="assistant-launcher__title">Tasks</h1>
    </header>

    <div class="assistant-launcher__scroll">
      <section class="assistant-launcher__section">
        <div class="assistant-launcher__section-header">
          <h2>Continue Tasks</h2>
        </div>
        <div
          v-if="recentTasks.length === 0"
          class="assistant-launcher__empty"
        >
          No recent tasks yet.
        </div>
        <div
          v-else
          class="assistant-launcher__task-list"
          role="list"
        >
          <button
            v-for="task in recentTasks"
            :key="task.task_id"
            type="button"
            class="assistant-launcher__task-card"
            role="listitem"
            :disabled="openingId === `task:${task.task_id}`"
            @click="openTask(task.task_id)"
          >
            <span class="assistant-launcher__task-title">{{ task.title }}</span>
            <span class="assistant-launcher__task-meta">
              {{ task.summary || task.template_id }}
            </span>
          </button>
        </div>
      </section>

      <section class="assistant-launcher__section">
        <div class="assistant-launcher__section-header">
          <h2>New Task</h2>
        </div>
        <div
          v-if="taskTemplates.length === 0"
          class="assistant-launcher__empty"
        >
          No task templates available.
        </div>
        <div
          v-else
          class="assistant-launcher__grid"
          role="list"
        >
          <button
            v-for="template in taskTemplates"
            :key="template.template_id"
            type="button"
            class="assistant-launcher__tile"
            role="listitem"
            :disabled="creatingTask"
            @click="createTask(template.template_id)"
          >
            <span class="assistant-launcher__icon-wrap">
              <LayoutGrid :size="28" aria-hidden="true" />
            </span>
            <span class="assistant-launcher__label">{{ template.title }}</span>
          </button>
        </div>
      </section>

      <section class="assistant-launcher__section">
        <div class="assistant-launcher__section-header">
          <h2>Tools &amp; Views</h2>
        </div>
        <div
          v-if="toolItems.length === 0"
          class="assistant-launcher__empty"
        >
          No views available.
        </div>
        <div
          v-else
          class="assistant-launcher__grid"
          role="list"
        >
          <button
            v-for="reg in toolItems"
            :key="reg.view_id"
            type="button"
            class="assistant-launcher__tile"
            role="listitem"
            :disabled="openingId === reg.view_id"
            :aria-label="`Open ${reg.title}`"
            @click="openView(reg.view_id)"
          >
            <span class="assistant-launcher__icon-wrap">
              <component
                :is="resolveLauncherIconComponent(reg.view_id)"
                :size="28"
                aria-hidden="true"
              />
            </span>
            <span class="assistant-launcher__label">{{ reg.title }}</span>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
/**
 * Launcher uses a fixed light "sheet" palette so it stays readable on:
 * - Desktop: dark shell defines --text-primary (light) but not --bg-primary → old combo was pale text on white.
 * - Web/Mobile: light workspace; same tokens remain consistent.
 */
.assistant-launcher {
  --launcher-fg: #0f172a;
  --launcher-fg-muted: #475569;
  --launcher-bg: #ffffff;
  --launcher-bg-subtle: #f1f5f9;
  --launcher-border: #e2e8f0;
  --launcher-icon-surface: #ffffff;
  --launcher-icon-fg: #334155;
  --launcher-hover: rgba(15, 23, 42, 0.08);
  --launcher-tile-hover-border: #93c5fd;

  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 12px;
  gap: 12px;
  color-scheme: light;
  background: var(--launcher-bg);
  color: var(--launcher-fg);
}

.assistant-launcher__header {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.assistant-launcher__back {
  grid-column: 1;
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 10px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.assistant-launcher__back:hover {
  background: var(--launcher-hover);
}

.assistant-launcher__header--no-back {
  grid-template-columns: 1fr;
}

.assistant-launcher__header--no-back .assistant-launcher__title {
  grid-column: 1;
}

.assistant-launcher__title {
  grid-column: 2;
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  text-align: center;
}

.assistant-launcher__scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.assistant-launcher__empty {
  padding: 12px 0;
  color: var(--launcher-fg-muted);
  font-size: 0.95rem;
}

.assistant-launcher__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.assistant-launcher__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.assistant-launcher__section-header h2 {
  margin: 0;
  font-size: 0.95rem;
}

.assistant-launcher__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(5.5rem, 1fr));
  gap: 12px 10px;
  padding-bottom: 8px;
}

.assistant-launcher__tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 8px;
  border: 1px solid var(--launcher-border);
  border-radius: 14px;
  background: var(--launcher-bg-subtle);
  color: var(--launcher-fg);
  font: inherit;
  cursor: pointer;
  text-align: center;
  min-height: 96px;
}

.assistant-launcher__tile:disabled {
  opacity: 0.55;
  cursor: wait;
}

.assistant-launcher__tile:hover:not(:disabled) {
  border-color: var(--launcher-tile-hover-border);
  background: var(--launcher-icon-surface);
}

.assistant-launcher__icon-wrap {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--launcher-icon-surface);
  color: var(--launcher-icon-fg);
  border: 1px solid var(--launcher-border);
}

.assistant-launcher__label {
  font-size: 0.78rem;
  line-height: 1.25;
  max-width: 100%;
  overflow: hidden;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.assistant-launcher__task-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.assistant-launcher__task-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  width: 100%;
  border: 1px solid var(--launcher-border);
  border-radius: 14px;
  background: var(--launcher-bg-subtle);
  color: var(--launcher-fg);
  font: inherit;
  padding: 12px 14px;
  cursor: pointer;
  text-align: left;
}

.assistant-launcher__task-card:hover:not(:disabled) {
  border-color: var(--launcher-tile-hover-border);
  background: var(--launcher-icon-surface);
}

.assistant-launcher__task-card:disabled {
  opacity: 0.55;
  cursor: wait;
}

.assistant-launcher__task-title {
  font-weight: 600;
}

.assistant-launcher__task-meta {
  font-size: 0.85rem;
  color: var(--launcher-fg-muted);
}
</style>
