<template>
  <div class="collapsible-message" :class="{ 'expanded': isExpanded }">
    <div class="message-header" @click="toggleExpand">
      <div class="header-content">
        <slot name="header">
          <component :is="icon" v-if="icon && typeof icon !== 'string'" class="icon-component" :size="16" />
          <span v-else-if="icon" class="icon">{{ icon }}</span>
          <span class="title">{{ title }}</span>
        </slot>
      </div>
      <button class="expand-btn">
        {{ isExpanded ? collapseText : expandText }}
      </button>
    </div>

    <div v-show="isExpanded" class="message-body">
      <div class="content-wrapper">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  title?: string
  icon?: string | any
  defaultExpanded?: boolean
  expandText: string
  collapseText: string
}>()

const isExpanded = ref(props.defaultExpanded || false)

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}
</script>

<style scoped>
.collapsible-message {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg-secondary);
  overflow: hidden;
  margin: 4px 0;
  max-width: 100%;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.02);
  transition: background 0.2s;
}

.message-header:hover {
  background: rgba(0, 0, 0, 0.05);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  font-weight: 500;
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.icon-component {
  margin-right: 4px;
}

.expand-btn {
  background: none;
  border: none;
  font-size: 0.8rem;
  color: var(--color-primary);
  cursor: pointer;
  padding: 2px 6px;
  margin-left: 8px;
  white-space: nowrap;
}

.message-body {
  border-top: 1px solid var(--color-border);
  background: var(--color-bg);
}

.content-wrapper {
  padding: 12px;
  max-height: 300px;
  overflow-y: auto;
  font-size: 0.9rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
