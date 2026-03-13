<script setup lang="ts">
import { ref } from 'vue'
import {
  IonApp,
  IonContent,
  IonHeader,
  IonLabel,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar
} from '@ionic/vue'
import SdkDashboardPage from './pages/SdkDashboardPage.vue'
import ManualTestsPage from './pages/ManualTestsPage.vue'

type RootTab = 'auto' | 'manual'

const activeTab = ref<RootTab>('auto')
</script>

<template>
  <ion-app>
    <ion-page class="app-shell-page">
      <ion-header>
        <ion-toolbar>
          <ion-title>DawnChat Mobile SDK 示例</ion-title>
        </ion-toolbar>
        <ion-toolbar class="app-shell-segment-toolbar">
          <ion-segment v-model="activeTab" class="app-shell-segment">
            <ion-segment-button value="auto">
              <ion-label>自动诊断</ion-label>
            </ion-segment-button>
            <ion-segment-button value="manual">
              <ion-label>人工测试</ion-label>
            </ion-segment-button>
          </ion-segment>
        </ion-toolbar>
      </ion-header>

      <ion-content class="app-shell-content">
        <sdk-dashboard-page v-if="activeTab === 'auto'" />
        <manual-tests-page v-else />
      </ion-content>
    </ion-page>
  </ion-app>
</template>

<style scoped>
.app-shell-page {
  background: var(--ion-color-light, #f5f5f5);
}

.app-shell-segment {
  width: calc(100% - 16px);
  max-width: 320px;
  margin-inline: auto;
}

.app-shell-segment-toolbar {
  --padding-start: 0;
  --padding-end: 0;
}
</style>