<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";

import {
  installAssistantRuntimeCapabilities,
  uninstallAssistantRuntimeCapabilities,
} from "./runtime/bootstrap";
import { installWebAssistantViewRegistry } from "./runtime/viewRegistry";

/**
 * 宿主 iframe + Vite HMR 会重挂载根组件。若在 onUnmounted 里 uninstallViewRegistryProvider，
 * 全局注册表被清空而 router 模块不会重新执行，非 core 的已注册视图会永久
 * 「View unavailable」。单页插件无需在 App 层卸载 view registry（整页卸载会销毁 JS 上下文）。
 */
installWebAssistantViewRegistry();

let registeredCapabilityNames: string[] = [];

onMounted(() => {
  registeredCapabilityNames = installAssistantRuntimeCapabilities();
});

onUnmounted(() => {
  uninstallAssistantRuntimeCapabilities(registeredCapabilityNames);
  registeredCapabilityNames = [];
});
</script>

<template>
  <RouterView />
</template>
