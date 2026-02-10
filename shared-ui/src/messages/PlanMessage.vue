<template>
  <MessageItem role="system" variant="plan-message">
    <CollapsibleMessage
      :title="title"
      :icon="icon"
      :default-expanded="true"
      :expand-text="expandText"
      :collapse-text="collapseText"
    >
      <div class="plan-content">
        <div v-if="reasoning" class="plan-reasoning">{{ reasoning }}</div>
        <div class="plan-todo-list">
          <div v-for="todo in todos" :key="todo.id" class="plan-todo-item">
            <component :is="todoIconResolver(todo.status)" :size="14" class="todo-icon" />
            <span class="todo-text">{{ todo.description }}</span>
          </div>
        </div>
      </div>
    </CollapsibleMessage>
  </MessageItem>
</template>

<script setup lang="ts">
import CollapsibleMessage from './CollapsibleMessage.vue'
import MessageItem from './MessageItem.vue'

defineProps<{
  title: string
  icon?: any
  expandText: string
  collapseText: string
  todos: Array<{ id: string; description: string; status: string }>
  reasoning?: string
  todoIconResolver: (status: string) => any
}>()
</script>

<style scoped>
.plan-content {
  padding: 0.5rem;
}

.plan-reasoning {
  font-style: italic;
  color: var(--color-text-secondary);
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
}

.plan-todo-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.plan-todo-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.todo-icon {
  flex-shrink: 0;
  font-size: 1rem;
}

.todo-text {
  word-break: break-word;
  line-height: 1.4;
}
</style>
