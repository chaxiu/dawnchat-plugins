<template>
  <ChatPartText v-if="item.type === 'text'" :text="item.text" />
  <ChatPartTool
    v-else-if="item.type === 'tool'"
    :tool="item.tool"
    :status="item.status"
    :text="item.text"
    :display="item.toolDisplay"
    :tool-input-aria-label="toolInputAriaLabel"
    :tool-input-title="toolInputTitle"
    :tool-name-label="toolNameLabel"
    @file-open="(path) => emit('file-open', path)"
  />
  <ChatPartReasoning
    v-else-if="item.type === 'reasoning'"
    :text="item.text"
    :expanded="reasoningExpanded"
    @toggle="emit('toggle-reasoning')"
  />
  <ChatPartStep v-else-if="item.type === 'step'" :text="item.text" />
  <ChatPartUnknown v-else :text="item.text" />
</template>

<script setup lang="ts">
import type { ChatRenderItem } from "../types";
import ChatPartReasoning from "./ChatPartReasoning.vue";
import ChatPartStep from "./ChatPartStep.vue";
import ChatPartText from "./ChatPartText.vue";
import ChatPartTool from "./ChatPartTool.vue";
import ChatPartUnknown from "./ChatPartUnknown.vue";

defineProps<{
  item: ChatRenderItem;
  reasoningExpanded: boolean;
  toolInputAriaLabel?: string;
  toolInputTitle?: string;
  toolNameLabel?: string;
}>();

const emit = defineEmits<{
  "toggle-reasoning": [];
  "file-open": [path: string];
}>();
</script>
