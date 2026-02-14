<template>
  <main class="page">
    <h1>{{ title }}</h1>

    <section class="panel">
      <div class="panel-head">
        <h2>Models</h2>
        <button @click="reload" :disabled="loading">Refresh</button>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
      <ModelCardList :models="models">
        <template #actions="{ model }">
          <ModelActionButtons
            :status="resolveModelStatus(model.id)"
            @download="start(model.id, false)"
            @resume="start(model.id, true)"
            @pause="pauseByModel(model.id)"
            @cancel="cancelByModel(model.id)"
          />
        </template>
      </ModelCardList>
    </section>

    <section class="panel">
      <div class="panel-head">
        <h2>Tasks</h2>
        <span>{{ tasks.length }}</span>
      </div>
      <ModelDownloadTaskList :tasks="tasks">
        <template #actions="{ task }">
          <ModelActionButtons
            :status="task.status"
            @download="start(task.modelId, false)"
            @resume="start(task.modelId, true)"
            @pause="pause(task.taskId)"
            @cancel="cancel(task.taskId)"
          />
        </template>
      </ModelDownloadTaskList>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import {
  ModelActionButtons,
  ModelCardList,
  ModelDownloadTaskList,
  useModelDownloads
} from '@sdk-ui'

const title = 'CosyVoice Model Manager'
const taskModelIndex = new Map()

function resolveTaskId(raw) {
  return String(raw?.task_id || raw?.taskId || '')
}

function resolveModelId(raw) {
  return String(raw?.model_id || raw?.model_size || raw?.modelId || raw?.id || '')
}

function toDescriptor(m) {
  return {
    id: String(m.model_id),
    name: String(m.model_id),
    description: String(m.description || ''),
    installed: Boolean(m.installed),
    progress: Number(m.progress || 0)
  }
}

function mapTask(raw, modelMap) {
  const taskId = resolveTaskId(raw)
  const modelId = resolveModelId(raw)
  const model = modelMap.get(modelId)
  if (taskId && modelId) {
    taskModelIndex.set(taskId, modelId)
  }
  return {
    taskId,
    modelId,
    modelName: model?.name || modelId,
    status: raw.status || 'pending',
    progress: Number(raw.progress || 0),
    downloadedBytes: Number(raw.downloaded_bytes || 0),
    totalBytes: Number(raw.total_bytes || 0),
    speed: raw.speed || '',
    errorMessage: raw.error_message || ''
  }
}

const api = {
  async listModels() {
    const res = await fetch('/api/models')
    const payload = await res.json()
    const list = payload?.data?.models || []
    return list.map(toDescriptor)
  },
  async startDownload(request) {
    const res = await fetch(`/api/models/${encodeURIComponent(request.modelId)}/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume: request.resume === true })
    })
    const payload = await res.json()
    const taskId = payload?.data?.task_id
    if (!taskId) {
      return {
        taskId: `local-${request.modelId}`,
        modelId: request.modelId,
        modelName: request.modelId,
        status: 'pending',
        progress: 0,
        downloadedBytes: 0,
        totalBytes: 0
      }
    }
    const task = await this.getDownloadTask(taskId)
    if (!task.modelId) {
      task.modelId = request.modelId
      task.modelName = request.modelId
      if (task.status === 'not_found') task.status = 'pending'
      taskModelIndex.set(task.taskId, request.modelId)
    }
    return task
  },
  async getDownloadTask(taskId) {
    const modelRes = await fetch('/api/models')
    const modelPayload = await modelRes.json()
    const models = (modelPayload?.data?.models || []).map(toDescriptor)
    const modelMap = new Map(models.map((m) => [m.id, m]))

    const pendingRes = await fetch('/api/models/download/pending')
    const pendingPayload = await pendingRes.json()
    const tasks = pendingPayload?.data?.tasks || []
    const found = tasks.find((t) => resolveTaskId(t) === String(taskId))
    if (found) {
      return mapTask(found, modelMap)
    }

    return {
      taskId,
      modelId: '',
      modelName: taskId,
      status: 'not_found',
      progress: 0,
      downloadedBytes: 0,
      totalBytes: 0
    }
  },
  async pauseDownload(taskId) {
    const pending = await this.listPendingTasks()
    const task = pending.find((t) => t.taskId === taskId)
    const modelId = task?.modelId || taskModelIndex.get(taskId)
    if (!modelId) return
    await fetch(`/api/models/${encodeURIComponent(modelId)}/download/pause`, { method: 'POST' })
  },
  async cancelDownload(taskId) {
    const pending = await this.listPendingTasks()
    const task = pending.find((t) => t.taskId === taskId)
    const modelId = task?.modelId || taskModelIndex.get(taskId)
    if (!modelId) return
    await fetch(`/api/models/${encodeURIComponent(modelId)}/download/cancel`, { method: 'POST' })
  },
  async listPendingTasks() {
    const modelRes = await fetch('/api/models')
    const modelPayload = await modelRes.json()
    const models = (modelPayload?.data?.models || []).map(toDescriptor)
    const modelMap = new Map(models.map((m) => [m.id, m]))

    const pendingRes = await fetch('/api/models/download/pending')
    const pendingPayload = await pendingRes.json()
    const tasks = pendingPayload?.data?.tasks || []
    return tasks.map((t) => mapTask(t, modelMap))
  }
}

const {
  models,
  tasks,
  loading,
  error,
  initialize,
  loadModels,
  loadPendingTasks,
  startModelDownload,
  pauseTask,
  cancelTask
} = useModelDownloads({ api, pollIntervalMs: 1500 })

const latestTaskByModel = computed(() => {
  const m = new Map()
  for (const task of tasks.value) {
    if (task.modelId) m.set(task.modelId, task)
  }
  return m
})

function resolveModelStatus(modelId) {
  const t = latestTaskByModel.value.get(modelId)
  return t?.status || 'idle'
}

async function start(modelId, resume) {
  await startModelDownload({ modelId, resume })
  await reload()
}

async function pause(taskId) {
  await pauseTask(taskId)
  await reload()
}

async function cancel(taskId) {
  await cancelTask(taskId)
  await reload()
}

async function pauseByModel(modelId) {
  const t = latestTaskByModel.value.get(modelId)
  if (t) await pause(t.taskId)
}

async function cancelByModel(modelId) {
  const t = latestTaskByModel.value.get(modelId)
  if (t) await cancel(t.taskId)
}

async function reload() {
  await Promise.all([loadModels(), loadPendingTasks()])
}

onMounted(async () => {
  await initialize()
})
</script>

<style scoped>
.page { max-width: 980px; margin: 0 auto; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a; }
h1 { margin: 0 0 12px; font-size: 22px; }
.panel { border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; padding: 12px; margin-bottom: 12px; }
.panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
h2 { margin: 0; font-size: 16px; }
button { border: 1px solid #cbd5e1; background: #fff; border-radius: 8px; padding: 6px 10px; cursor: pointer; }
button:disabled { opacity: 0.6; cursor: default; }
.error { color: #b91c1c; font-size: 12px; margin-bottom: 10px; }
</style>
