<template>
  <ion-page>
    <ion-header translucent>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button :default-href="ROUTE_PATHS.home" />
        </ion-buttons>
        <ion-title>Flashlight</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="safe-page-content">
      <ion-card class="safe-inline-card">
        <ion-card-header>
          <ion-card-title>手电筒控制</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div class="flash-status" :class="{ 'is-on': isFlashOn }">
            {{ isFlashOn ? 'ON' : 'OFF' }}
          </div>
          <ion-badge :color="statusColor">{{ statusText }}</ion-badge>
          <p class="feedback">{{ feedbackMessage }}</p>
          <ion-button
            expand="block"
            class="toggle-btn"
            :disabled="isBusy || lastStatus === 'unsupported'"
            @click="toggle"
          >
            {{ isFlashOn ? '关闭手电筒' : '打开手电筒' }}
          </ion-button>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
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
import { useFlashlight } from '../composables/useFlashlight';
import { ROUTE_PATHS } from '../router/routes';

const { isBusy, isFlashOn, lastStatus, feedbackMessage, syncFlashState, toggle } = useFlashlight();

onMounted(async () => {
  await syncFlashState();
});

const statusText = computed(() => {
  if (lastStatus.value === 'success') return '可用';
  if (lastStatus.value === 'unsupported') return '不支持';
  if (lastStatus.value === 'error') return '异常';
  return '待初始化';
});

const statusColor = computed(() => {
  if (lastStatus.value === 'success') return isFlashOn.value ? 'warning' : 'success';
  if (lastStatus.value === 'unsupported') return 'medium';
  if (lastStatus.value === 'error') return 'danger';
  return 'medium';
});
</script>

<style scoped>
.flash-status {
  width: 146px;
  height: 146px;
  border-radius: 999px;
  margin: 16px auto;
  display: grid;
  place-items: center;
  font-size: 1.25rem;
  font-weight: 700;
  background: #2b2e36;
  color: #f8fafc;
  transition: all 0.25s ease;
}

.flash-status.is-on {
  background: #ffc409;
  color: #171717;
  box-shadow: 0 0 26px rgba(255, 196, 9, 0.85);
}

.feedback {
  margin: 10px 0 12px;
  color: var(--ion-color-medium);
}

.toggle-btn {
  margin-top: 4px;
}
</style>