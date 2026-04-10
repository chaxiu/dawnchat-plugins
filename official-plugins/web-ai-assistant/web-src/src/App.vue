<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";

import {
  installAssistantRuntimeCapabilities,
  uninstallAssistantRuntimeCapabilities,
} from "./runtime/bootstrap";
import { uninstallWebAssistantViewRegistry } from "./runtime/viewRegistry";

let registeredCapabilityNames: string[] = [];

onMounted(() => {
  registeredCapabilityNames = installAssistantRuntimeCapabilities();
});

onUnmounted(() => {
  uninstallAssistantRuntimeCapabilities(registeredCapabilityNames);
  uninstallWebAssistantViewRegistry();
  registeredCapabilityNames = [];
});
</script>

<template>
  <RouterView />
</template>
