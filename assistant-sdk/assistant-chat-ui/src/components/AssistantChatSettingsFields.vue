<script setup lang="ts">
import { computed } from "vue";

import type { SettingsField } from "../types/assistantSettingsForm";
import { isSettingsFieldVisible } from "../types/assistantSettingsForm";

const props = defineProps<{
  fields: SettingsField[];
  draftConfig: Record<string, unknown>;
}>();

const emit = defineEmits<{
  "update:draft-config": [patch: Record<string, unknown>];
  "change-provider": [provider: string];
}>();

const visibleFields = computed(() =>
  props.fields.filter((field) => isSettingsFieldVisible(field, props.draftConfig))
);

function stringValue(key: string): string {
  const raw = props.draftConfig[key];
  if (raw === undefined || raw === null) {
    return "";
  }
  return String(raw);
}

function onSelectChange(field: SettingsField, event: Event) {
  const target = event.target as HTMLSelectElement | null;
  if (!target) {
    return;
  }
  const value = target.value;
  if (field.kind === "select" && field.key === "provider") {
    emit("change-provider", value);
    return;
  }
  emit("update:draft-config", { [field.key]: value });
}

function onTextInput(field: SettingsField, event: Event) {
  const target = event.target as HTMLInputElement | null;
  if (!target) {
    return;
  }
  emit("update:draft-config", { [field.key]: target.value });
}
</script>

<template>
  <div class="form-grid-wrap">
    <div class="form-grid">
    <template v-for="field in visibleFields" :key="field.key">
      <label
        v-if="field.kind === 'select'"
        class="field"
        :class="{ 'field--full': field.gridColumn === 'full' }"
      >
        <span>{{ field.label }}</span>
        <select
          :data-testid="field.testId"
          :value="stringValue(field.key)"
          @change="onSelectChange(field, $event)"
        >
          <option v-for="opt in field.options" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </label>
      <label
        v-else
        class="field"
        :class="{ 'field--full': field.gridColumn === 'full' }"
      >
        <span>{{ field.label }}</span>
        <input
          :type="field.kind === 'password' ? 'password' : 'text'"
          :value="stringValue(field.key)"
          :placeholder="field.placeholder"
          @input="onTextInput(field, $event)"
        />
      </label>
    </template>
    </div>
  </div>
</template>

<style scoped>
.form-grid-wrap {
  container-type: inline-size;
  width: 100%;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

@container (min-width: 420px) {
  .form-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.field--full {
  grid-column: 1 / -1;
}

input,
select {
  font: inherit;
  font-size: 0.875rem;
  min-height: 40px;
  border-radius: var(--radius-md, 14px);
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text-primary);
  padding: 9px 12px;
  box-sizing: border-box;
}

input:focus,
select:focus {
  outline: 2px solid color-mix(in srgb, var(--primary) 35%, transparent);
  outline-offset: 0;
}

</style>
