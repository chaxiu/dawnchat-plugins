<template>
  <div class="app">
    <header class="header">
      <img :src="logoUrl" alt="Hello" class="logo" />
      <div class="title-block">
        <h1>{{ t('title') }}</h1>
        <p class="subtitle">{{ t('subtitle') }}</p>
      </div>
      <div class="meta">
        <span class="chip">{{ currentThemeLabel }}</span>
        <span class="chip">{{ currentLangLabel }}</span>
      </div>
    </header>

    <section class="card">
      <label class="label">{{ t('label') }}</label>
      <input v-model="name" class="input" :placeholder="t('placeholder')" />
      <button class="button" @click="sayHello">{{ t('button') }}</button>
      <p v-if="message" class="message">{{ message }}</p>
    </section>

    <section class="card">
      <h2 class="section-title">{{ t('sdkTitle') }}</h2>
      <div class="sdk-grid">
        <div class="sdk-card">
          <h3>{{ t('aiTitle') }}</h3>
          <textarea v-model="aiPrompt" class="textarea" :placeholder="t('aiPlaceholder')"></textarea>
          <button class="button" @click="callAi" :disabled="aiLoading">
            {{ aiLoading ? t('loading') : t('aiCall') }}
          </button>
          <p v-if="aiError" class="error">{{ aiError }}</p>
          <pre v-if="aiResult" class="result">{{ aiResult }}</pre>
        </div>

        <div class="sdk-card">
          <h3>{{ t('toolsTitle') }}</h3>
          <button class="button" @click="loadTools" :disabled="toolsLoading">
            {{ toolsLoading ? t('loading') : t('toolsCall') }}
          </button>
          <p v-if="toolsError" class="error">{{ toolsError }}</p>
          <div v-if="tools.length" class="tool-list">
            <div v-for="tool in tools" :key="tool.name" class="tool-item">
              <div class="tool-name">{{ tool.name }}</div>
              <div class="tool-desc">{{ tool.description }}</div>
            </div>
          </div>
        </div>

        <div class="sdk-card">
          <h3>{{ t('kvTitle') }}</h3>
          <input v-model="kvKey" class="input" :placeholder="t('kvKey')"/>
          <input v-model="kvValue" class="input" :placeholder="t('kvValue')"/>
          <div class="button-row">
            <button class="button" @click="saveKv" :disabled="kvLoading">{{ t('kvSave') }}</button>
            <button class="button ghost" @click="loadKv" :disabled="kvLoading">{{ t('kvLoad') }}</button>
          </div>
          <p v-if="kvError" class="error">{{ kvError }}</p>
          <p v-if="kvResult" class="message">{{ kvResult }}</p>
        </div>
      </div>
    </section>

    <section class="card info">
      <div class="row">
        <span class="key">{{ t('pluginId') }}</span>
        <span class="value">{{ info.plugin_id || '-' }}</span>
      </div>
      <div class="row">
        <span class="key">{{ t('hostPort') }}</span>
        <span class="value">{{ info.host_port || '-' }}</span>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import logoUrl from './assets/hello-world.svg'
import zh from './locales/zh.json'
import en from './locales/en.json'

const params = new URLSearchParams(window.location.search)
const lang = params.get('lang') || 'zh'
const theme = params.get('theme') || 'dark'

const messages = { zh, en }
const name = ref('')
const message = ref('')
const info = ref({ plugin_id: '', host_port: '' })
const aiPrompt = ref('')
const aiResult = ref('')
const aiLoading = ref(false)
const aiError = ref('')
const tools = ref([])
const toolsLoading = ref(false)
const toolsError = ref('')
const kvKey = ref('hello')
const kvValue = ref('')
const kvLoading = ref(false)
const kvResult = ref('')
const kvError = ref('')

const t = (key) => {
  const table = messages[lang] || messages.zh
  return table[key] || key
}

const currentThemeLabel = computed(() => (theme === 'light' ? t('themeLight') : t('themeDark')))
const currentLangLabel = computed(() => (lang === 'en' ? t('langEn') : t('langZh')))

const themeTokens = {
  dark: {
    bgPrimary: '#373736',
    bgSecondary: '#3F3E3C',
    textPrimary: '#F9FAFB',
    textSecondary: '#A8A6A3',
    border: '#454341',
    primary: '#3B82F6'
  },
  light: {
    bgPrimary: '#F4F4F3',
    bgSecondary: '#FFFFFF',
    textPrimary: '#1A1918',
    textSecondary: '#6B6965',
    border: '#D1D1D0',
    primary: '#3B82F6'
  }
}

const applyTheme = (mode) => {
  const tokens = themeTokens[mode] || themeTokens.dark
  const root = document.documentElement
  root.style.setProperty('--bg-primary', tokens.bgPrimary)
  root.style.setProperty('--bg-secondary', tokens.bgSecondary)
  root.style.setProperty('--text-primary', tokens.textPrimary)
  root.style.setProperty('--text-secondary', tokens.textSecondary)
  root.style.setProperty('--border', tokens.border)
  root.style.setProperty('--primary', tokens.primary)
  document.body.dataset.theme = mode
}

const sayHello = () => {
  const displayName = name.value.trim() || t('guest')
  message.value = t('notify').replace('{name}', displayName)
}

const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  return await res.json()
}

const callAi = async () => {
  aiLoading.value = true
  aiError.value = ''
  aiResult.value = ''
  try {
    const payload = {
      prompt: aiPrompt.value.trim() || t('aiDefaultPrompt'),
      temperature: 0.7
    }
    const data = await fetchJson('api/sdk/ai', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    if (data.status === 'ok') {
      aiResult.value = data.content || ''
    } else {
      aiError.value = data.message || t('requestFailed')
    }
  } catch (e) {
    aiError.value = e?.message || t('requestFailed')
  } finally {
    aiLoading.value = false
  }
}

const loadTools = async () => {
  toolsLoading.value = true
  toolsError.value = ''
  tools.value = []
  try {
    const data = await fetchJson('api/sdk/tools?limit=8')
    if (data.status === 'ok') {
      tools.value = data.tools || []
    } else {
      toolsError.value = data.message || t('requestFailed')
    }
  } catch (e) {
    toolsError.value = e?.message || t('requestFailed')
  } finally {
    toolsLoading.value = false
  }
}

const saveKv = async () => {
  kvLoading.value = true
  kvError.value = ''
  kvResult.value = ''
  try {
    const payload = { key: kvKey.value, value: kvValue.value }
    const data = await fetchJson('api/sdk/kv', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    if (data.status === 'ok') {
      kvResult.value = t('kvSaved')
    } else {
      kvError.value = data.message || t('requestFailed')
    }
  } catch (e) {
    kvError.value = e?.message || t('requestFailed')
  } finally {
    kvLoading.value = false
  }
}

const loadKv = async () => {
  kvLoading.value = true
  kvError.value = ''
  kvResult.value = ''
  try {
    const data = await fetchJson(`api/sdk/kv?key=${encodeURIComponent(kvKey.value)}`)
    if (data.status === 'ok') {
      kvResult.value = `${t('kvLoaded')}: ${JSON.stringify(data.value)}`
    } else {
      kvError.value = data.message || t('requestFailed')
    }
  } catch (e) {
    kvError.value = e?.message || t('requestFailed')
  } finally {
    kvLoading.value = false
  }
}

onMounted(async () => {
  applyTheme(theme)
  try {
    const res = await fetch('api/info')
    const data = await res.json()
    if (data && data.status === 'ok') {
      info.value = data
    }
  } catch (e) {
    info.value = { plugin_id: '', host_port: '' }
  }
})
</script>

<style scoped>
.app {
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding: 32px;
  box-sizing: border-box;
}
.header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 16px;
  align-items: center;
  margin-bottom: 24px;
}
.logo {
  width: 64px;
  height: 64px;
}
.title-block h1 {
  margin: 0;
  font-size: 28px;
}
.subtitle {
  margin: 4px 0 0 0;
  color: var(--text-secondary);
}
.meta {
  display: flex;
  gap: 8px;
}
.chip {
  border: 1px solid var(--border);
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-secondary);
}
.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
}
.section-title {
  margin: 0 0 16px 0;
  font-size: 18px;
}
.sdk-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}
.sdk-card {
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 16px;
  background: var(--bg-primary);
}
.sdk-card h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
}
.label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-secondary);
}
.textarea {
  width: 100%;
  min-height: 90px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text-primary);
  margin-bottom: 12px;
  box-sizing: border-box;
  resize: vertical;
}
.input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg-primary);
  color: var(--text-primary);
  margin-bottom: 12px;
  box-sizing: border-box;
}
.button {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: none;
  background: var(--primary);
  color: white;
  font-weight: 600;
  cursor: pointer;
}
.button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.button-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 8px;
}
.button.ghost {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border);
}
.message {
  margin-top: 12px;
  color: var(--text-secondary);
}
.error {
  margin-top: 8px;
  color: #ef4444;
}
.result {
  margin-top: 12px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 10px;
  border: 1px solid var(--border);
  white-space: pre-wrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
    'Courier New', monospace;
  color: var(--text-primary);
}
.tool-list {
  margin-top: 12px;
  display: grid;
  gap: 8px;
}
.tool-item {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 10px;
  background: var(--bg-secondary);
}
.tool-name {
  font-size: 12px;
  font-weight: 600;
}
.tool-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}
.info .row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
}
.info .key {
  color: var(--text-secondary);
}
.info .value {
  color: var(--text-primary);
}
</style>
