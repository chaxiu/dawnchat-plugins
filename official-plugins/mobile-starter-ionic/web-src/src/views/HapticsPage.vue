<template>
  <ion-page>
    <ion-header translucent>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button :default-href="ROUTE_PATHS.home" />
        </ion-buttons>
        <ion-title>Haptics</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="safe-page-content">
      <ion-card class="safe-inline-card">
        <ion-card-header>
          <ion-card-title>触觉反馈测试</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p class="desc">通过 `@capacitor/haptics` 调用系统线性马达，页面仅负责展示，逻辑由 composable/service 处理。</p>
          <ion-badge :color="statusColor">{{ statusText }}</ion-badge>
          <p class="feedback">{{ feedbackMessage }}</p>
        </ion-card-content>
      </ion-card>

      <div class="safe-inline-card action-group">
        <ion-button expand="block" :disabled="isRunning" @click="runImpact('LIGHT')">Light 轻触</ion-button>
        <ion-button expand="block" color="secondary" :disabled="isRunning" @click="runImpact('MEDIUM')">Medium 中度</ion-button>
        <ion-button expand="block" color="danger" :disabled="isRunning" @click="runImpact('HEAVY')">Heavy 重击</ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar
} from '@ionic/vue';
import { useHaptics } from '../composables/useHaptics';
import { ROUTE_PATHS } from '../router/routes';

const { isRunning, feedbackMessage, lastStatus, runImpact } = useHaptics();

const statusText = computed(() => {
  if (lastStatus.value === 'success') return '可用';
  if (lastStatus.value === 'unsupported') return '未注入';
  if (lastStatus.value === 'error') return '异常';
  return '待触发';
});

const statusColor = computed(() => {
  if (lastStatus.value === 'success') return 'success';
  if (lastStatus.value === 'unsupported') return 'warning';
  if (lastStatus.value === 'error') return 'danger';
  return 'medium';
});
</script>

<style scoped>
.desc {
  margin: 8px 0 10px;
  color: var(--ion-color-medium);
  line-height: 1.45;
}

.feedback {
  margin-top: 10px;
  font-size: 0.9rem;
  color: var(--ion-color-medium-shade);
}

.action-group {
  display: grid;
  gap: 10px;
  margin-top: 8px;
}
</style>