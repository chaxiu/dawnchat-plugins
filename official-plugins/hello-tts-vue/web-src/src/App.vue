<template>
  <div class="app">
    <header class="header">
      <h1>Hello TTS (Vue)</h1>
      <p class="subtitle">测试 VibeVoice / CosyVoice 的模型与说话人联动，并展示合成进度</p>
    </header>

    <section class="card grid-two">
      <div class="field">
        <label>引擎</label>
        <select v-model="form.engine" @change="onEngineChanged">
          <option value="vibevoice">VibeVoice</option>
          <option value="cosyvoice">CosyVoice</option>
        </select>
      </div>

      <div class="field" v-if="isVibeVoice">
        <label>质量</label>
        <select v-model="form.quality" @change="refreshSpeakers">
          <option value="fast">fast</option>
          <option value="standard">standard</option>
          <option value="high">high</option>
        </select>
      </div>

      <div class="field" v-if="isCosyVoice">
        <label>模式</label>
        <select v-model="form.mode">
          <option value="sft">sft</option>
          <option value="zero_shot">zero_shot</option>
          <option value="instruct2">instruct2</option>
        </select>
      </div>

      <div class="field" v-if="isCosyVoice">
        <label>模型</label>
        <select v-model="form.modelId" @change="refreshSpeakers" :disabled="loading.models">
          <option v-if="!modelOptions.length" value="">暂无可选模型</option>
          <option v-for="item in modelOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>
      </div>

      <div class="field">
        <label>{{ isCosyVoice ? 'Speaker' : 'Voice' }}</label>
        <select v-model="form.speaker" :disabled="loading.speakers">
          <option v-if="!speakerOptions.length" value="">暂无可选项</option>
          <option v-for="speaker in speakerOptions" :key="speaker" :value="speaker">
            {{ speaker }}
          </option>
        </select>
      </div>
    </section>

    <section class="card">
      <div class="field">
        <label>文本</label>
        <textarea
          v-model="form.text"
          placeholder="输入要合成的文本"
          rows="6"
        />
      </div>
      <div class="actions">
        <button class="button" @click="submitSynthesis" :disabled="isSubmitting">
          {{ isSubmitting ? '合成中...' : '开始合成' }}
        </button>
      </div>
      <p v-if="errorText" class="error">{{ errorText }}</p>
    </section>

    <section class="card" v-if="currentJob">
      <div class="progress-head">
        <div>
          <div class="job-title">任务 {{ currentJob.job_id }}</div>
          <div class="job-status">{{ currentJob.status }} · {{ currentJob.message || '-' }}</div>
        </div>
        <div class="job-percent">{{ Math.round((currentJob.progress || 0) * 100) }}%</div>
      </div>
      <progress class="progress" max="1" :value="currentJob.progress || 0"></progress>

      <audio
        v-if="audioUrl"
        :key="audioUrl"
        class="audio"
        controls
        :src="audioUrl"
      ></audio>

      <pre v-if="currentJob.result" class="result">{{ JSON.stringify(currentJob.result, null, 2) }}</pre>
      <p v-if="currentJob.error" class="error">{{ currentJob.error }}</p>
    </section>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

const form = reactive({
  text: '',
  engine: 'vibevoice',
  quality: 'fast',
  mode: 'instruct2',
  modelId: '',
  speaker: ''
})

const modelOptions = ref([])
const speakerOptions = ref([])
const currentJob = ref(null)
const audioUrl = ref('')
const errorText = ref('')
const loading = reactive({
  models: false,
  speakers: false
})

let pollTimer = null

const isCosyVoice = computed(() => form.engine === 'cosyvoice')
const isVibeVoice = computed(() => form.engine === 'vibevoice')
const isSubmitting = computed(() => {
  if (!currentJob.value) {
    return false
  }
  return currentJob.value.status === 'pending' || currentJob.value.status === 'running'
})

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(body.detail || body.message || `Request failed: ${response.status}`)
  }
  return body
}

const normalizeModels = (models) => {
  if (!Array.isArray(models)) {
    return []
  }
  return models
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const value = String(item.model_id || item.id || item.size || '').trim()
      if (!value) {
        return null
      }
      const name = String(item.name || value)
      const suffix = item.installed ? '✅' : '⏳'
      return { value, label: `${name} ${suffix}` }
    })
    .filter(Boolean)
}

const refreshModels = async () => {
  if (!isCosyVoice.value) {
    form.modelId = ''
    modelOptions.value = []
    return
  }
  loading.models = true
  try {
    const data = await fetchJson(`/api/tts/models?engine=${encodeURIComponent(form.engine)}`)
    modelOptions.value = normalizeModels(data.models)
    if (!modelOptions.value.some((item) => item.value === form.modelId)) {
      form.modelId = modelOptions.value[0]?.value || ''
    }
  } finally {
    loading.models = false
  }
}

const refreshSpeakers = async () => {
  loading.speakers = true
  try {
    const params = new URLSearchParams({
      engine: form.engine,
      quality: form.quality
    })
    if (form.modelId) {
      params.set('model_id', form.modelId)
    }
    const data = await fetchJson(`/api/tts/speakers?${params.toString()}`)
    speakerOptions.value = Array.isArray(data.speakers) ? data.speakers : []
    if (!speakerOptions.value.includes(form.speaker)) {
      form.speaker = speakerOptions.value[0] || ''
    }
  } finally {
    loading.speakers = false
  }
}

const onEngineChanged = async () => {
  errorText.value = ''
  await refreshModels()
  await refreshSpeakers()
}

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

const pollJob = (jobId) => {
  stopPolling()
  pollTimer = setInterval(async () => {
    try {
      const data = await fetchJson(`/api/tts/jobs/${jobId}`)
      currentJob.value = data.job
      if (data.job?.status === 'completed') {
        stopPolling()
        audioUrl.value = `/api/tts/audio/${jobId}?ts=${Date.now()}`
        return
      }
      if (data.job?.status === 'failed') {
        stopPolling()
      }
    } catch (error) {
      stopPolling()
      errorText.value = error.message || '任务查询失败'
    }
  }, 1000)
}

const submitSynthesis = async () => {
  const text = form.text.trim()
  if (!text) {
    errorText.value = '请输入要合成的文本'
    return
  }
  if (isCosyVoice.value && !form.modelId) {
    errorText.value = 'CosyVoice 需要先选择模型'
    return
  }

  errorText.value = ''
  audioUrl.value = ''

  const payload = {
    text,
    engine: form.engine,
    quality: form.quality,
    mode: form.mode,
    speaker: form.speaker || null,
    model_id: form.modelId || null
  }

  try {
    const data = await fetchJson('/api/tts/synthesize', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    currentJob.value = {
      job_id: data.job_id,
      status: 'pending',
      progress: 0,
      message: 'queued'
    }
    pollJob(data.job_id)
  } catch (error) {
    errorText.value = error.message || '提交合成失败'
  }
}

onMounted(async () => {
  try {
    await onEngineChanged()
  } catch (error) {
    errorText.value = error.message || '初始化失败'
  }
})

onBeforeUnmount(() => {
  stopPolling()
})
</script>
