import { onMounted, onUnmounted, ref } from 'vue'
import { addFile, listLibrary, openSession, sessionStatus } from '../services/api'

export const useSmartReader = () => {
  const view = ref('lobby')
  const viewMode = ref('grid')
  const files = ref([])
  const loading = ref(false)
  const error = ref('')
  const currentFile = ref(null)

  const fetchFiles = async (silent = false) => {
    if (!silent) {
      loading.value = true
    }
    error.value = ''
    try {
      const data = await listLibrary()
      if (data.status === 'ok') {
        files.value = data.files || []
      } else {
        error.value = data.message || '加载失败'
      }
    } catch (err) {
      error.value = err?.message || '加载失败'
    } finally {
      if (!silent) {
        loading.value = false
      }
    }
  }

  const handleAddFiles = async (fileList) => {
    if (!fileList?.length) return
    loading.value = true
    error.value = ''
    try {
      for (const file of fileList) {
        const data = await addFile(file)
        if (data.status !== 'ok') {
          error.value = data.detail || data.message || '导入失败'
        }
      }
      await fetchFiles()
    } catch (err) {
      error.value = err?.message || '导入失败'
    } finally {
      loading.value = false
    }
  }

  const openFile = async (file) => {
    if (!file) return
    const data = await openSession(file.id)
    if (data.status === 'ok') {
      currentFile.value = file
      view.value = 'workbench'
    }
  }

  const backToLobby = async () => {
    view.value = 'lobby'
    currentFile.value = null
    await fetchFiles()
  }

  const refreshCurrentFile = async () => {
    const data = await sessionStatus()
    if (data.status === 'ok' && data.file) {
      currentFile.value = data.file
    }
  }

  let pollingId = null

  const hasProcessing = () => files.value.some((file) => file.status === 'processing')

  const startPolling = () => {
    if (pollingId) return
    pollingId = setInterval(async () => {
      if (view.value !== 'lobby') return
      if (!files.value.length) return
      if (!hasProcessing()) return
      await fetchFiles(true)
    }, 3000)
  }

  const stopPolling = () => {
    if (pollingId) {
      clearInterval(pollingId)
      pollingId = null
    }
  }

  onMounted(() => {
    fetchFiles()
    startPolling()
  })

  onUnmounted(() => {
    stopPolling()
  })

  return {
    view,
    viewMode,
    files,
    loading,
    error,
    currentFile,
    fetchFiles,
    handleAddFiles,
    openFile,
    backToLobby,
    refreshCurrentFile
  }
}
