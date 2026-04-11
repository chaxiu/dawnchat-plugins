<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { IonApp } from "@ionic/vue";

import {
  installAssistantRuntimeCapabilities,
  uninstallAssistantRuntimeCapabilities,
} from "./runtime/bootstrap";
import { installMobileAssistantViewRegistry } from "./runtime/viewRegistry";

/** 同 web-ai-assistant：避免 HMR 重挂载根组件时卸载全局 view registry 导致视图解析失败。 */
installMobileAssistantViewRegistry();

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
  <ion-app>
    <router-view />
  </ion-app>
</template>
