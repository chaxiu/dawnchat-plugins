<template>
  <div class="dc-chat-root">
    <div class="dc-chat-root__messages">
      <ExtensibleMessageList
        v-if="renderers || transform"
        :messages="messages"
        :format-time="formatTime"
        :render-markdown="renderMarkdown"
        :stage-label-resolver="stageLabelResolver"
        :todo-icon-resolver="todoIconResolver"
        :tool-call-labels="toolCallLabels"
        :hil-labels="hilLabels"
        :labels="labels"
        :icons="icons"
        :renderers="renderers"
        :transform="transform"
        @view-details="handleViewDetails"
      />
      <MessageList
        v-else
        :messages="messages"
        :format-time="formatTime"
        :render-markdown="renderMarkdown"
        :stage-label-resolver="stageLabelResolver"
        :todo-icon-resolver="todoIconResolver"
        :tool-call-labels="toolCallLabels"
        :hil-labels="hilLabels"
        :labels="labels"
        :icons="icons"
        @view-details="handleViewDetails"
      />
    </div>
    <div class="dc-chat-root__composer">
      <slot name="composer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import type { UIMessage } from '@dawnchat/shared-protocol'
import { MessageList } from '@dawnchat/shared-ui'
import ExtensibleMessageList from './ExtensibleMessageList.vue'
import {
  defaultFormatTime,
  defaultHilLabels,
  defaultMessageLabels,
  defaultRenderMarkdown,
  defaultStageLabelResolver,
  defaultTodoIconResolver,
  defaultToolCallLabels
} from '../defaults'

withDefaults(defineProps<{
  messages: UIMessage[]
  formatTime?: (time: string) => string
  renderMarkdown?: (content: string) => string
  stageLabelResolver?: (stage: string) => string
  todoIconResolver?: (status: string) => Component
  toolCallLabels?: {
    calling: string
    completed: string
    failed: string
    unknown: string
    parameters: string
    result: string
    error: string
    executing: string
  }
  hilLabels?: {
    title: string
    pending: string
    viewDetails: string
    risk: Record<'low' | 'medium' | 'high', string>
  }
  labels?: {
    received: string
    taskPlan: string
    step: string
    completed: string
    failed: string
    error: string
    expand: string
    collapse: string
    thinking: string
    errorCode: string
  }
  icons?: {
    thought?: Component
    plan?: Component
  }
  renderers?: Partial<Record<string, Component>>
  transform?: (messages: UIMessage[]) => UIMessage[]
}>(), {
  formatTime: defaultFormatTime,
  renderMarkdown: defaultRenderMarkdown,
  stageLabelResolver: defaultStageLabelResolver,
  todoIconResolver: defaultTodoIconResolver,
  toolCallLabels: () => defaultToolCallLabels,
  hilLabels: () => defaultHilLabels,
  labels: () => defaultMessageLabels
})

const emit = defineEmits<{
  'view-details': [requestId?: string]
}>()

const handleViewDetails = (requestId?: string) => {
  emit('view-details', requestId)
}
</script>
