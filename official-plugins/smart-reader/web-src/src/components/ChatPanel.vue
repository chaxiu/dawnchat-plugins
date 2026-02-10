<template>
  <div class="chat-panel">
    <div v-if="!messages.length" class="empty-state">AI 已就绪，请开始提问</div>
    <ChatRoot :messages="messages">
      <template #composer>
        <MessageComposer
          v-model="input"
          :disabled="isDisabled"
          send-label="发送"
          placeholder="输入问题并回车"
          @send="handleSend"
        />
      </template>
    </ChatRoot>
    <div class="disclaimer">AI 解说基于内容生成，可能存在误差，请以原文为准。</div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ChatRoot, MessageComposer, useChatSession } from '@dawnchat/sdk/ui/vue'

const props = defineProps({
  file: {
    type: Object,
    default: null
  }
})

const hostConfig = window.__SMART_READER_HOST__ || null
const wsUrl = hostConfig?.ws_url || ''
const pluginId = 'com.dawnchat.smart-reader'

const input = ref('')

const { store, messages, sendMessage } = useChatSession({
  wsUrl,
  projectId: pluginId,
  sessionId: props.file?.id || pluginId,
  namespace: pluginId,
  mode: 'smart_reader',
  autoConnect: Boolean(wsUrl)
})

const isDisabled = computed(() => !props.file || props.file.status !== 'ready' || !wsUrl)

const handleSend = (text) => {
  if (!text || isDisabled.value) return
  sendMessage(text, {
    pluginContext: {
      file_id: props.file?.id || null
    }
  })
}

const appendContext = (text) => {
  if (!text) return
  input.value = input.value ? `${input.value}\n\n${text}` : text
}

defineExpose({
  appendContext
})

watch(
  () => props.file?.id,
  async (fileId) => {
    if (!fileId) return
    store.setSession(fileId)
    await store.loadSession(fileId)
  },
  { immediate: true }
)
</script>
