<template>
  <MessageItem role="assistant">
    <MessageBubble variant="assistant">
      <div class="markdown-content" v-html="html" />
    </MessageBubble>
    <MessageMeta :text="time" />
  </MessageItem>
</template>

<script setup lang="ts">
import MessageItem from './MessageItem.vue'
import MessageBubble from './MessageBubble.vue'
import MessageMeta from './MessageMeta.vue'

defineProps<{
  html: string
  time: string
}>()
</script>

<style scoped>
.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  margin-top: 1em;
  margin-bottom: 0.5em;
  font-weight: 600;
  line-height: 1.3;
  color: var(--color-text);
}

.markdown-content :deep(h1) { font-size: 1.5rem; }
.markdown-content :deep(h2) { font-size: 1.3rem; }
.markdown-content :deep(h3) { font-size: 1.15rem; }
.markdown-content :deep(h4) { font-size: 1rem; }

.markdown-content :deep(p) {
  margin: 0.5em 0;
  line-height: 1.6;
}

.markdown-content :deep(p:first-child) {
  margin-top: 0;
}

.markdown-content :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 0.5em 0;
  padding-left: 1.5em;
}

.markdown-content :deep(li) {
  margin: 0.25em 0;
  line-height: 1.5;
}

.markdown-content :deep(code) {
  background: rgba(0, 0, 0, 0.08);
  padding: 0.15em 0.4em;
  border-radius: 4px;
  font-family: 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace;
  font-size: 0.9em;
}

.markdown-content :deep(pre) {
  background: rgba(0, 0, 0, 0.05);
  padding: 12px 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 0.75em 0;
}

.markdown-content :deep(pre code) {
  background: none;
  padding: 0;
  font-size: 0.85rem;
  line-height: 1.5;
}

.markdown-content :deep(blockquote) {
  margin: 0.75em 0;
  padding: 0.5em 1em;
  border-left: 3px solid var(--color-primary);
  background: rgba(var(--color-primary-rgb, 99, 102, 241), 0.05);
  color: var(--color-text-secondary);
}

.markdown-content :deep(blockquote p) {
  margin: 0;
}

.markdown-content :deep(a) {
  color: var(--color-primary);
  text-decoration: none;
}

.markdown-content :deep(a:hover) {
  text-decoration: underline;
}

.markdown-content :deep(hr) {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 1em 0;
}

.markdown-content :deep(strong) {
  font-weight: 600;
}

.markdown-content :deep(em) {
  font-style: italic;
}

.markdown-content :deep(del) {
  text-decoration: line-through;
  opacity: 0.7;
}
</style>
