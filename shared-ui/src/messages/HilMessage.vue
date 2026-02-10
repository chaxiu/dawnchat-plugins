<template>
  <MessageItem role="system" variant="hil-message-wrapper">
    <div class="hil-message" :class="[`risk-${riskLevel}`, status]">
      <div class="hil-message-header">
        <component :is="riskIcon" :size="16" class="hil-icon" />
        <span class="hil-title">{{ labels.title }}</span>
        <span class="hil-risk-badge" :class="`risk-${riskLevel}`">
          {{ labels.risk[riskLevel] }}
        </span>
      </div>
      <div class="hil-message-body">
        <p class="hil-description">{{ description }}</p>
        <div v-if="toolName" class="hil-tool-name">
          <Wrench :size="14" class="mr-1 inline-icon" /> {{ toolName }}
        </div>
      </div>
      <div class="hil-message-footer">
        <template v-if="status === 'pending'">
          <span class="hil-status pending">
            <Loader2 :size="14" class="mr-1 inline-icon spinning" /> {{ labels.pending }}
          </span>
          <button class="hil-action-btn" @click="handleViewDetails">
            {{ labels.viewDetails }}
          </button>
        </template>
        <template v-else>
          <span class="hil-status" :class="status">
            <component :is="statusIcon" :size="14" class="mr-1 inline-icon" />
            {{ responseText }}
          </span>
        </template>
      </div>
    </div>
  </MessageItem>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, Zap, Info, Wrench, Loader2, CheckCircle2, XCircle, Edit } from 'lucide-vue-next'
import MessageItem from './MessageItem.vue'

type RiskLevel = 'low' | 'medium' | 'high'
type HilStatus = 'pending' | 'accepted' | 'rejected' | 'edited'

const props = defineProps<{
  riskLevel: RiskLevel
  status: HilStatus
  description: string
  toolName?: string
  responseText?: string
  requestId?: string
  labels: {
    title: string
    pending: string
    viewDetails: string
    risk: Record<RiskLevel, string>
  }
}>()

const emit = defineEmits<{
  viewDetails: [requestId?: string]
}>()

const riskIcon = computed(() => {
  if (props.riskLevel === 'high') return AlertTriangle
  if (props.riskLevel === 'medium') return Zap
  return Info
})

const statusIcon = computed(() => {
  if (props.status === 'accepted') return CheckCircle2
  if (props.status === 'rejected') return XCircle
  return Edit
})

const handleViewDetails = () => {
  emit('viewDetails', props.requestId)
}
</script>

<style scoped>
.hil-message {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-bg-secondary);
  overflow: hidden;
  transition: all 0.2s;
}

.hil-message.risk-high {
  border-color: rgba(255, 107, 107, 0.4);
  background: linear-gradient(to bottom, rgba(255, 107, 107, 0.05), var(--color-bg-secondary));
}

.hil-message.risk-medium {
  border-color: rgba(255, 193, 7, 0.4);
  background: linear-gradient(to bottom, rgba(255, 193, 7, 0.05), var(--color-bg-secondary));
}

.hil-message.risk-low {
  border-color: rgba(102, 126, 234, 0.4);
  background: linear-gradient(to bottom, rgba(102, 126, 234, 0.05), var(--color-bg-secondary));
}

.hil-message.accepted {
  border-color: rgba(82, 196, 26, 0.4);
  background: linear-gradient(to bottom, rgba(82, 196, 26, 0.05), var(--color-bg-secondary));
}

.hil-message.rejected {
  border-color: rgba(255, 77, 79, 0.4);
  background: linear-gradient(to bottom, rgba(255, 77, 79, 0.05), var(--color-bg-secondary));
}

.hil-message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
}

.hil-icon {
  font-size: 1.2rem;
}

.hil-title {
  flex: 1;
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--color-text);
}

.hil-risk-badge {
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
  text-transform: uppercase;
}

.hil-risk-badge.risk-high {
  background: rgba(255, 107, 107, 0.15);
  color: #ff6b6b;
}

.hil-risk-badge.risk-medium {
  background: rgba(255, 193, 7, 0.15);
  color: #d4a500;
}

.hil-risk-badge.risk-low {
  background: rgba(102, 126, 234, 0.15);
  color: #667eea;
}

.hil-message-body {
  padding: 12px 16px;
}

.hil-description {
  margin: 0 0 8px 0;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.hil-tool-name {
  font-size: 0.85rem;
  color: var(--color-primary);
  font-family: 'SF Mono', 'Menlo', 'Monaco', monospace;
  background: rgba(var(--color-primary-rgb, 99, 102, 241), 0.08);
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
}

.hil-message-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: rgba(0, 0, 0, 0.02);
  border-top: 1px solid var(--color-border);
}

.hil-status {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.hil-status.pending {
  color: var(--color-primary);
}

.hil-status.accepted {
  color: #52c41a;
}

.hil-status.rejected {
  color: #ff4d4f;
}

.hil-status.edited {
  color: #faad14;
}

.hil-action-btn {
  padding: 6px 12px;
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  background: transparent;
  color: var(--color-primary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.hil-action-btn:hover {
  background: var(--color-primary);
  color: white;
}
</style>
