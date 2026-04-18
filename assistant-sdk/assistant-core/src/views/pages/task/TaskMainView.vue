<template>
  <section class="task-main-page">
    <header class="task-main-page__header">
      <p class="task-main-page__eyebrow">Current Task</p>
      <h1 class="task-main-page__title">
        {{ currentTask?.title || "No active task" }}
      </h1>
      <p class="task-main-page__summary">
        {{ currentTask?.summary || "Open a task from the launcher to continue working." }}
      </p>
    </header>

    <div
      v-if="currentTask"
      class="task-main-page__grid"
    >
      <section class="task-main-page__panel">
        <h2>Task</h2>
        <dl class="task-main-page__meta">
          <div>
            <dt>Task ID</dt>
            <dd>{{ currentTask.task_id }}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{{ currentTask.status }}</dd>
          </div>
          <div>
            <dt>Template</dt>
            <dd>{{ currentTask.template_id }}</dd>
          </div>
          <div>
            <dt>Last Active Surface</dt>
            <dd>{{ currentTask.last_active_surface_id || "None" }}</dd>
          </div>
        </dl>
      </section>

      <section class="task-main-page__panel">
        <div class="task-main-page__panel-header">
          <h2>Bound Workspaces</h2>
          <button
            type="button"
            class="task-main-page__refresh"
            @click="refreshCurrentTask"
          >
            Refresh
          </button>
        </div>
        <p
          v-if="workspaceEntries.length === 0"
          class="task-main-page__empty"
        >
          No workspaces are bound to this task yet.
        </p>
        <ul
          v-else
          class="task-main-page__workspace-list"
        >
          <li
            v-for="[surfaceId, workspaceId] in workspaceEntries"
            :key="`${surfaceId}:${workspaceId}`"
            class="task-main-page__workspace-item"
          >
            <div>
              <strong>{{ surfaceId }}</strong>
              <div class="task-main-page__workspace-id">{{ workspaceId }}</div>
            </div>
            <button
              type="button"
              class="task-main-page__resume"
              :disabled="restoringWorkspaceKey === `${surfaceId}:${workspaceId}`"
              @click="resumeWorkspace(surfaceId, workspaceId)"
            >
              {{ restoringWorkspaceKey === `${surfaceId}:${workspaceId}` ? "Restoring..." : "Resume" }}
            </button>
          </li>
        </ul>
      </section>
    </div>

    <section
      v-else
      class="task-main-page__panel"
    >
      <h2>No active task</h2>
      <p class="task-main-page__empty">
        Use the launcher to create a new task or reopen an existing one.
      </p>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { getTaskRuntimeHandle } from "../../../runtime/bootstrap/runtimeHandles";
import { useTaskRuntimeState } from "../../../runtime/task";

const { currentTaskDetail } = useTaskRuntimeState();
const restoringWorkspaceKey = ref("");

const currentTask = computed(() => currentTaskDetail.value);
const workspaceEntries = computed(() => {
  const refs = currentTask.value?.surface_workspace_refs || {};
  return Object.entries(refs);
});

async function refreshCurrentTask() {
  const handle = getTaskRuntimeHandle();
  await handle?.getCurrentTask();
}

async function resumeWorkspace(surfaceId: string, workspaceId: string) {
  const handle = getTaskRuntimeHandle();
  if (!handle) {
    return;
  }
  const key = `${surfaceId}:${workspaceId}`;
  restoringWorkspaceKey.value = key;
  try {
    await handle.openWorkspaceForTask(surfaceId, workspaceId);
  } finally {
    restoringWorkspaceKey.value = "";
  }
}

onMounted(() => {
  void refreshCurrentTask();
});
</script>

<style scoped>
.task-main-page {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: #e5e7eb;
}

.task-main-page__header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-main-page__eyebrow {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
}

.task-main-page__title {
  margin: 0;
  font-size: 28px;
  line-height: 1.2;
}

.task-main-page__summary {
  margin: 0;
  color: #cbd5e1;
}

.task-main-page__grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.task-main-page__panel {
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.6);
  padding: 16px;
}

.task-main-page__panel h2 {
  margin: 0 0 12px;
  font-size: 18px;
}

.task-main-page__panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.task-main-page__meta {
  display: grid;
  gap: 12px;
  margin: 0;
}

.task-main-page__meta div {
  display: grid;
  gap: 4px;
}

.task-main-page__meta dt {
  font-size: 12px;
  color: #94a3b8;
}

.task-main-page__meta dd {
  margin: 0;
  font-size: 14px;
}

.task-main-page__empty {
  margin: 0;
  color: #94a3b8;
}

.task-main-page__workspace-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-main-page__workspace-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(30, 41, 59, 0.7);
}

.task-main-page__workspace-id {
  margin-top: 4px;
  color: #94a3b8;
  font-size: 12px;
  word-break: break-all;
}

.task-main-page__refresh,
.task-main-page__resume {
  border: 0;
  border-radius: 10px;
  background: #2563eb;
  color: #fff;
  padding: 8px 12px;
  cursor: pointer;
}

.task-main-page__refresh:disabled,
.task-main-page__resume:disabled {
  cursor: default;
  opacity: 0.6;
}
</style>
