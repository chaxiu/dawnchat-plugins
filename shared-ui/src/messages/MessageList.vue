<template>
  <template v-for="(msg, index) in messages" :key="msg.id">
    <UserMessage
      v-if="msg.type === 'user'"
      :content="msg.content"
      :time="formatTime(msg.createdAt)"
    />
    <AckMessage
      v-else-if="msg.type === 'ack'"
      :content="msg.content"
      :is-latest="index === messages.length - 1"
      :received-text="labels.received"
    />
    <ThoughtMessage
      v-else-if="msg.type === 'thought'"
      :title="msg.stage ? `${stageLabelResolver(msg.stage)}...` : labels.thinking"
      :content="msg.content"
      :icon="thoughtIcon"
      :expand-text="labels.expand"
      :collapse-text="labels.collapse"
    />
    <PlanMessage
      v-else-if="msg.type === 'plan'"
      :title="resolvePlanTitle(msg)"
      :icon="planIcon"
      :expand-text="labels.expand"
      :collapse-text="labels.collapse"
      :todos="msg.todos || []"
      :reasoning="msg.reasoning"
      :todo-icon-resolver="todoIconResolver"
    />
    <TodoUpdateMessage
      v-else-if="msg.type === 'todo_update'"
      :status="msg.status"
      :todo-id="msg.todoId"
      :error="msg.error"
      :step-label="labels.step"
      :failed-label="labels.failed"
    />
    <MessageItem v-else-if="msg.type === 'tool_call'" role="system" variant="tool-call-wrapper">
      <ToolCallMessage
        :tool-name="resolveToolName(msg)"
        :tool-call-id="resolveToolCallId(msg)"
        :arguments="resolveToolArguments(msg)"
        :is-complete="false"
        :labels="toolCallLabels"
      />
    </MessageItem>
    <MessageItem v-else-if="msg.type === 'tool_result'" role="system" variant="tool-result-wrapper">
      <ToolCallMessage
        :tool-name="resolveToolName(msg)"
        :tool-call-id="resolveToolCallId(msg)"
        :arguments="resolveToolArguments(msg)"
        :success="resolveToolSuccess(msg)"
        :result="resolveToolResult(msg)"
        :result-description="resolveToolResultDescription(msg)"
        :error="resolveToolError(msg)"
        :is-complete="true"
        :default-expanded="false"
        :labels="toolCallLabels"
      />
    </MessageItem>
    <HilMessage
      v-else-if="msg.type === 'hil_request'"
      :risk-level="msg.hilRiskLevel || 'medium'"
      :status="msg.hilStatus || 'pending'"
      :description="msg.hilDescription || ''"
      :tool-name="msg.toolName"
      :response-text="msg.hilResponseText"
      :request-id="msg.hilRequestId"
      :labels="hilLabels"
      @view-details="handleViewDetails"
    />
    <StreamMessage
      v-else-if="msg.type === 'stream'"
      :content="msg.content"
      :is-final="msg.isFinal"
    />
    <ResponseMessage
      v-else-if="msg.type === 'response'"
      :html="renderMarkdown(msg.content)"
      :time="formatTime(msg.createdAt)"
    />
    <ErrorMessage
      v-else-if="msg.type === 'error'"
      :error-message="msg.errorMessage || labels.error"
      :error-code="msg.errorCode"
      :suggestion="msg.suggestion"
      :time="formatTime(msg.createdAt)"
      :labels="{ errorCode: labels.errorCode }"
    />
    <UnknownMessage
      v-else
      :content="resolveUnknownContent(msg)"
    />
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Component } from 'vue'
import { BrainCircuit, ClipboardList } from 'lucide-vue-next'
import type { UIMessage } from '@dawnchat/shared-protocol'
import AckMessage from './AckMessage.vue'
import ErrorMessage from './ErrorMessage.vue'
import HilMessage from './HilMessage.vue'
import MessageItem from './MessageItem.vue'
import PlanMessage from './PlanMessage.vue'
import ResponseMessage from './ResponseMessage.vue'
import StreamMessage from './StreamMessage.vue'
import ThoughtMessage from './ThoughtMessage.vue'
import TodoUpdateMessage from './TodoUpdateMessage.vue'
import ToolCallMessage from './ToolCallMessage.vue'
import UnknownMessage from './UnknownMessage.vue'
import UserMessage from './UserMessage.vue'

const props = defineProps<{
  messages: UIMessage[]
  formatTime: (time: string) => string
  renderMarkdown: (content: string) => string
  stageLabelResolver: (stage: string) => string
  todoIconResolver: (status: string) => Component
  toolCallLabels: {
    calling: string
    completed: string
    failed: string
    unknown: string
    parameters: string
    result: string
    error: string
    executing: string
  }
  hilLabels: {
    title: string
    pending: string
    viewDetails: string
    risk: Record<'low' | 'medium' | 'high', string>
  }
  labels: {
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
}>()

const emit = defineEmits<{
  'view-details': [requestId?: string]
}>()

const thoughtIcon = computed(() => props.icons?.thought ?? BrainCircuit)
const planIcon = computed(() => props.icons?.plan ?? ClipboardList)

const resolvePlanTitle = (msg: UIMessage) => {
  if (msg.todos) {
    return `${props.labels.taskPlan}: ${msg.todos.length} ${props.labels.step}`
  }
  return `${props.labels.taskPlan}: ${props.labels.completed}`
}

const resolveToolName = (msg: UIMessage) =>
  msg.toolName ?? (msg.payload?.tool_name as string) ?? props.toolCallLabels.unknown

const resolveToolCallId = (msg: UIMessage) => (msg.payload?.tool_call_id as string) || ''

const resolveToolArguments = (msg: UIMessage) =>
  (msg.payload?.arguments as Record<string, unknown>) || {}

const resolveToolSuccess = (msg: UIMessage) =>
  msg.success ?? (msg.payload?.success as boolean) ?? true

const resolveToolResult = (msg: UIMessage) => msg.result || (msg.payload?.result as string)

const resolveToolResultDescription = (msg: UIMessage) =>
  (msg.payload?.result_description as string)

const resolveToolError = (msg: UIMessage) => msg.error || (msg.payload?.error as string)

const resolveUnknownContent = (msg: UIMessage) =>
  msg.content || (msg.payload ? JSON.stringify(msg.payload) : '')

const handleViewDetails = (requestId?: string) => {
  emit('view-details', requestId)
}
</script>
