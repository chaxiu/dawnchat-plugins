<template>
  <div class="cards">
    <div v-for="model in models" :key="model.id" class="card">
      <div class="head">
        <h4>{{ model.name }}</h4>
        <span class="tag" v-if="model.sizeLabel">{{ model.sizeLabel }}</span>
      </div>
      <p class="desc">{{ model.description || '' }}</p>
      <div class="foot">
        <span class="state" :class="{ installed: model.installed }">
          {{ model.installed ? 'Installed' : 'Not Installed' }}
        </span>
        <slot name="actions" :model="model"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ModelDescriptor } from '../../types/model-management'

defineProps<{ models: ModelDescriptor[] }>()
</script>

<style scoped>
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; background: #fff; }
.head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.head h4 { margin: 0; font-size: 14px; color: #111827; }
.tag { font-size: 11px; color: #6b7280; background: #f3f4f6; border-radius: 999px; padding: 2px 8px; }
.desc { margin: 8px 0 10px; font-size: 12px; color: #6b7280; min-height: 34px; }
.foot { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.state { font-size: 12px; color: #b45309; }
.state.installed { color: #047857; }
</style>
