<template>
  <div class="app">
    <header class="header">
      <h1>Hello TTS (Vue)</h1>
      <p class="subtitle">基于统一 SDK 测试 VibeVoice / CosyVoice 工具调用与进度链路</p>
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
        <textarea v-model="form.text" placeholder="输入要合成的文本" rows="6" />
      </div>
      <div class="actions">
        <button class="button" @click="submitSynthesis" :disabled="isRunning">
          {{ isRunning ? '合成中...' : '开始合成' }}
        </button>
        <button class="button danger" v-if="isRunning" @click="cancelTask">取消</button>
      </div>
      <p v-if="errorText" class="error">{{ errorText }}</p>
    </section>

    <section class="card" v-if="state !== 'idle'">
      <div class="progress-head">
        <div>
          <div class="job-title">任务 {{ taskId || '-' }}</div>
          <div class="job-status">{{ state }} · {{ message || '-' }}</div>
        </div>
        <div class="job-percent">{{ Math.round(progress * 100) }}%</div>
      </div>
      <progress class="progress" max="1" :value="progress"></progress>

      <audio v-if="audioUrl" :key="audioUrl" class="audio" controls :src="audioUrl"></audio>

      <pre v-if="resultPayload" class="result">{{ JSON.stringify(resultPayload, null, 2) }}</pre>
      <p v-if="error" class="error">{{ error }}</p>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { ToolClient, useToolTask } from '@dawnchat/vue-tool-sdk'

const toolClient = new ToolClient({ basePath: '/api/sdk' })
const {
  taskId,
  state,
  progress,
  message,
  result,
  error,
  errorCode,
  errorDetails,
  isRunning,
  run,
  cancel,
  reset
} = useToolTask({
  logger: (event) => {
    // Keep logs observable without depending on console in embedded plugin runtime.
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('hello-tts-vue:tool-log', { detail: event }))
    }
  }
})

const form = reactive({
  text: '',
  engine: 'vibevoice',
  quality: 'fast',
  mode: 'instruct2',
  modelId: '',
  speaker: ''
})

const loading = reactive({
  models: false,
  speakers: false
})

const modelOptions = ref([])
const speakerOptions = ref([])
const errorText = ref('')
const audioUrl = ref('')
const resultPayload = ref(null)

const isCosyVoice = computed(() => form.engine === 'cosyvoice')
const isVibeVoice = computed(() => form.engine === 'vibevoice')

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

const parseToolResult = (raw) => {
  if (raw && typeof raw === 'object' && 'code' in raw) {
    return raw
  }

  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0]
    if (first && typeof first === 'object' && typeof first.text === 'string') {
      try {
        return JSON.parse(first.text)
      } catch (e) {
        return { code: 500, message: first.text, data: null }
      }
    }
  }

  if (raw && typeof raw === 'object' && raw.content) {
    return parseToolResult(raw.content)
  }

  return { code: 200, message: 'success', data: raw }
}

const callToolSync = async (tool_name, args) => {
  const response = await toolClient.call({
    tool_name,
    arguments: args,
    mode: 'sync'
  })
  return parseToolResult(response.result)
}

const refreshModels = async () => {
  if (!isCosyVoice.value) {
    form.modelId = ''
    modelOptions.value = []
    return
  }

  loading.models = true
  try {
    const parsed = await callToolSync('dawnchat.tts.list_models', { engine: form.engine })
    const models = parsed?.data?.models || []
    modelOptions.value = normalizeModels(models)
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
    if (isCosyVoice.value) {
      if (!form.modelId) {
        speakerOptions.value = []
        form.speaker = ''
        return
      }
      const parsed = await callToolSync('dawnchat.tts.list_speakers', {
        engine: 'cosyvoice',
        model_id: form.modelId
      })
      speakerOptions.value = Array.isArray(parsed?.data?.speakers) ? parsed.data.speakers : []
    } else {
      const parsed = await callToolSync('dawnchat.tts.list_voices', { engine: 'vibevoice' })
      const byQuality = parsed?.data?.by_quality
      const qualityList = byQuality && Array.isArray(byQuality[form.quality]) ? byQuality[form.quality] : []
      const fallbackList = Array.isArray(parsed?.data?.voices) ? parsed.data.voices : []
      speakerOptions.value = qualityList.length > 0 ? qualityList : fallbackList
    }

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
  resultPayload.value = null
  reset({ keepTaskId: false })

  const argumentsPayload = {
    text,
    engine: form.engine,
    quality: form.quality,
    mode: form.mode,
    speaker: form.speaker || undefined,
    model_id: form.modelId || undefined
  }

  try {
    const raw = await run({
      tool_name: 'dawnchat.tts.synthesize',
      arguments: argumentsPayload,
      mode: 'async',
      timeout: 3600
    })
    const parsed = parseToolResult(raw)
    resultPayload.value = parsed
    if (taskId.value) {
      audioUrl.value = `/api/tts/audio/${taskId.value}?ts=${Date.now()}`
    }
  } catch (e) {
    errorText.value = e?.message || '合成失败'
  }
}

const cancelTask = async () => {
  try {
    await cancel()
  } catch (e) {
    errorText.value = e?.message || '取消失败'
  }
}

watch(error, (next) => {
  if (next) {
    const code = String(errorCode.value || 'UNKNOWN')
    errorText.value = `[${code}] ${String(next)}`
  }
})

const onToolSdkLog = (event) => {
  const detail = event?.detail
  if (!detail || typeof detail !== 'object') {
    return
  }
  // Reserved for future telemetry bridge; currently keeps event observable in page scope.
}

onMounted(() => {
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('dawnchat:tool-sdk-log', onToolSdkLog)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
    window.removeEventListener('dawnchat:tool-sdk-log', onToolSdkLog)
  }
})

onMounted(async () => {
  try {
    await onEngineChanged()
  } catch (e) {
    errorText.value = e?.message || '初始化失败'
  }
})
</script>
