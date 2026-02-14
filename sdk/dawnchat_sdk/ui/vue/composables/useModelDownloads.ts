import { computed, onBeforeUnmount, ref } from 'vue'

import type {
  ModelDescriptor,
  ModelDownloadTask,
  ModelDownloadsApi,
  StartModelDownloadRequest
} from '../types/model-management'

export interface UseModelDownloadsOptions {
  api: ModelDownloadsApi
  pollIntervalMs?: number
}

export function useModelDownloads(options: UseModelDownloadsOptions) {
  const api = options.api
  const pollIntervalMs = options.pollIntervalMs ?? 1200

  const models = ref<ModelDescriptor[]>([])
  const tasks = ref<Map<string, ModelDownloadTask>>(new Map())
  const loading = ref(false)
  const error = ref('')

  let timer: ReturnType<typeof setInterval> | null = null

  const taskList = computed(() => Array.from(tasks.value.values()))
  const activeTasks = computed(() =>
    taskList.value.filter((task) => ['pending', 'downloading'].includes(task.status))
  )

  async function loadModels(): Promise<void> {
    loading.value = true
    error.value = ''
    try {
      models.value = await api.listModels()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load models'
    } finally {
      loading.value = false
    }
  }

  async function loadPendingTasks(): Promise<void> {
    try {
      const pending = await api.listPendingTasks()
      const next = new Map(tasks.value)
      for (const task of pending) {
        next.set(task.taskId, task)
      }
      tasks.value = next
      ensurePolling()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load pending tasks'
    }
  }

  async function startModelDownload(request: StartModelDownloadRequest): Promise<ModelDownloadTask | null> {
    error.value = ''
    try {
      const task = await api.startDownload(request)
      tasks.value.set(task.taskId, task)
      ensurePolling()
      return task
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to start model download'
      return null
    }
  }

  async function pauseTask(taskId: string): Promise<void> {
    await api.pauseDownload(taskId)
    const task = tasks.value.get(taskId)
    if (task) {
      tasks.value.set(taskId, { ...task, status: 'paused' })
    }
  }

  async function cancelTask(taskId: string): Promise<void> {
    await api.cancelDownload(taskId)
    const task = tasks.value.get(taskId)
    if (task) {
      tasks.value.set(taskId, { ...task, status: 'cancelled' })
    }
  }

  async function syncTasks(): Promise<void> {
    const current = Array.from(tasks.value.values())
    if (current.length === 0) {
      stopPolling()
      return
    }

    const next = new Map<string, ModelDownloadTask>()
    for (const task of current) {
      try {
        const refreshed = await api.getDownloadTask(task.taskId)
        next.set(task.taskId, refreshed)
      } catch {
        next.set(task.taskId, task)
      }
    }
    tasks.value = next

    if (Array.from(next.values()).every((task) => !['pending', 'downloading'].includes(task.status))) {
      stopPolling()
    }
  }

  function ensurePolling(): void {
    if (timer) {
      return
    }
    timer = setInterval(() => {
      void syncTasks()
    }, pollIntervalMs)
  }

  function stopPolling(): void {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  async function initialize(): Promise<void> {
    await Promise.all([loadModels(), loadPendingTasks()])
  }

  onBeforeUnmount(() => {
    stopPolling()
  })

  return {
    models,
    tasks: taskList,
    activeTasks,
    loading,
    error,
    initialize,
    loadModels,
    loadPendingTasks,
    startModelDownload,
    pauseTask,
    cancelTask,
    syncTasks,
    stopPolling
  }
}
