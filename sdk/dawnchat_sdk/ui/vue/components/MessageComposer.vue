<template>
  <div class="dc-message-composer">
    <textarea
      v-model="inputValue"
      class="dc-message-composer__input"
      :placeholder="placeholder"
      :disabled="disabled"
      rows="1"
      @keydown="handleKeydown"
    ></textarea>
    <button
      class="dc-message-composer__send"
      type="button"
      :disabled="disabled || !canSend"
      @click="handleSend"
    >
      {{ sendLabel }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
  sendLabel?: string
  disabled?: boolean
  sendOnEnter?: boolean
}>(), {
  modelValue: '',
  placeholder: '输入消息',
  sendLabel: '发送',
  disabled: false,
  sendOnEnter: true
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  send: [value: string]
}>()

const inputValue = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value)
})

const canSend = computed(() => inputValue.value.trim().length > 0)

const handleSend = () => {
  if (props.disabled || !canSend.value) return
  const text = inputValue.value.trim()
  emit('send', text)
  emit('update:modelValue', '')
}

const handleKeydown = (event: KeyboardEvent) => {
  if (!props.sendOnEnter) return
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSend()
  }
}
</script>
