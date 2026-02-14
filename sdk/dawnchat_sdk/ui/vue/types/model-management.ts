export type ModelDownloadStatus =
  | 'idle'
  | 'pending'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'not_found'

export interface ModelDownloadTask {
  taskId: string
  modelId: string
  modelName: string
  status: ModelDownloadStatus
  progress: number
  downloadedBytes: number
  totalBytes: number
  speed?: string
  message?: string
  errorMessage?: string
}

export interface ModelDescriptor {
  id: string
  name: string
  description?: string
  installed?: boolean
  downloading?: boolean
  progress?: number
  tags?: string[]
  sizeLabel?: string
}

export interface StartModelDownloadRequest {
  modelId: string
  useMirror?: boolean
  resume?: boolean
}

export interface ModelDownloadsApi {
  listModels: () => Promise<ModelDescriptor[]>
  startDownload: (request: StartModelDownloadRequest) => Promise<ModelDownloadTask>
  getDownloadTask: (taskId: string) => Promise<ModelDownloadTask>
  pauseDownload: (taskId: string) => Promise<void>
  cancelDownload: (taskId: string) => Promise<void>
  listPendingTasks: () => Promise<ModelDownloadTask[]>
}
