<template>
  <div class="tool-call-message" :class="[status, { 'expanded': isExpanded }]">
    <div class="tool-header" @click="toggleExpand">
      <div class="header-left">
        <component 
          :is="statusIcon" 
          :size="16" 
          class="tool-icon" 
          :class="{ 'animate-spin': isRunning }" 
        />
        <span class="tool-name">{{ toolName }}</span>
        <span class="status-badge" :class="status">{{ statusText }}</span>
      </div>
      <button class="expand-btn" :class="{ 'rotated': isExpanded }">
        <ChevronDown :size="16" />
      </button>
    </div>
    <div v-if="isComplete && !isExpanded && resultDescription" class="tool-summary">
      {{ resultDescription }}
    </div>
    
    <div v-show="isExpanded" class="tool-body">
      <div v-if="hasArguments" class="section arguments-section">
        <div class="section-title">{{ labels.parameters }}</div>
        <pre class="code-block">{{ formattedArguments }}</pre>
      </div>
      
      <div v-if="hasResult" class="section result-section">
        <div class="section-title">{{ success ? labels.result : labels.error }}</div>
        <div v-if="success" class="result-content">
          <pre v-if="isJsonResult" class="code-block">{{ formattedResult }}</pre>
          <div v-else class="text-result">{{ result }}</div>
        </div>
        <div v-else class="error-content">
          {{ error }}
        </div>
      </div>
      
      <div v-if="isRunning" class="section running-section">
        <div class="running-indicator">
          <Loader2 :size="16" class="animate-spin" />
          <span>{{ labels.executing }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { 
  ChevronDown, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Wrench 
} from 'lucide-vue-next'

interface ToolCallLabels {
  calling: string
  completed: string
  failed: string
  unknown: string
  parameters: string
  result: string
  error: string
  executing: string
}

interface Props {
  toolName: string
  toolCallId?: string
  arguments?: Record<string, unknown>
  success?: boolean
  result?: string
  resultDescription?: string
  error?: string
  isComplete?: boolean
  defaultExpanded?: boolean
  labels: ToolCallLabels
}

const props = withDefaults(defineProps<Props>(), {
  success: true,
  isComplete: false,
  defaultExpanded: false
})

const isExpanded = ref(props.defaultExpanded)

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}

const status = computed(() => {
  if (!props.isComplete) return 'running'
  return props.success ? 'success' : 'failed'
})

const statusIcon = computed(() => {
  switch (status.value) {
    case 'running': return Loader2
    case 'success': return CheckCircle2
    case 'failed': return XCircle
    default: return Wrench
  }
})

const statusText = computed(() => {
  switch (status.value) {
    case 'running': return props.labels.calling
    case 'success': return props.labels.completed
    case 'failed': return props.labels.failed
    default: return props.labels.unknown
  }
})

const isRunning = computed(() => status.value === 'running')

const hasArguments = computed(() => {
  return props.arguments && Object.keys(props.arguments).length > 0
})

const formattedArguments = computed(() => {
  if (!props.arguments) return ''
  try {
    return JSON.stringify(props.arguments, null, 2)
  } catch {
    return String(props.arguments)
  }
})

const hasResult = computed(() => {
  return props.isComplete && (props.result || props.error)
})

const isJsonResult = computed(() => {
  if (!props.result) return false
  try {
    JSON.parse(props.result)
    return true
  } catch {
    return props.result.startsWith('{') || props.result.startsWith('[')
  }
})

const formattedResult = computed(() => {
  if (!props.result) return ''
  try {
    const parsed = JSON.parse(props.result)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return props.result
  }
})
</script>

<style scoped>
.tool-call-message {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg-secondary);
  overflow: hidden;
  margin: 8px 0;
  transition: all 0.2s;
}

.tool-call-message.running {
  border-color: var(--color-primary);
  border-style: dashed;
}

.tool-call-message.success {
  border-left: 3px solid #52c41a;
}

.tool-call-message.failed {
  border-left: 3px solid #ff4d4f;
}

.tool-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.02);
  transition: background 0.2s;
}

.tool-header:hover {
  background: rgba(0, 0, 0, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  overflow: hidden;
}

.tool-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.tool-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tool-call-id {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  background: rgba(0, 0, 0, 0.04);
  padding: 2px 6px;
  border-radius: 6px;
  flex-shrink: 0;
}

.status-badge {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
  flex-shrink: 0;
}

.status-badge.running {
  background: rgba(var(--color-primary-rgb, 99, 102, 241), 0.15);
  color: var(--color-primary);
}

.status-badge.success {
  background: rgba(82, 196, 26, 0.15);
  color: #52c41a;
}

.status-badge.failed {
  background: rgba(255, 77, 79, 0.15);
  color: #ff4d4f;
}

.expand-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
  flex-shrink: 0;
}

.expand-btn.rotated {
  transform: rotate(180deg);
}

.tool-body {
  border-top: 1px solid var(--color-border);
  background: var(--color-bg);
}

.tool-summary {
  padding: 0 14px 10px;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  white-space: pre-wrap;
  word-break: break-word;
}

.section {
  padding: 12px 14px;
}

.section + .section {
  border-top: 1px solid var(--color-border);
}

.section-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.code-block {
  background: rgba(0, 0, 0, 0.04);
  border-radius: 6px;
  padding: 10px 12px;
  font-family: 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace;
  font-size: 0.8rem;
  line-height: 1.5;
  overflow-x: auto;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
}

.text-result {
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--color-text);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
}

.error-content {
  color: #ff4d4f;
  font-size: 0.9rem;
  padding: 10px 12px;
  background: rgba(255, 77, 79, 0.08);
  border-radius: 6px;
  max-height: 200px;
  overflow-y: auto;
}

.running-section {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.running-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}
</style>
