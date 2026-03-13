<script setup lang="ts">
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonLabel,
  IonList
} from '@ionic/vue'
import { useManualActions } from '../composables/useManualActions'

const { manualTests, manualState, runManualTest } = useManualActions()

const badgeColor = (status: string): string => {
  if (status === 'success') return 'success'
  if (status === 'failed') return 'danger'
  if (status === 'running') return 'primary'
  if (status === 'skipped') return 'warning'
  return 'medium'
}
</script>

<template>
  <div class="safe-scroll-content">
    <ion-card>
      <ion-card-header>
        <ion-card-title>人工测试</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <p>用于权限弹窗、系统交互、硬件能力等需要人工观察的场景。</p>
      </ion-card-content>
    </ion-card>

    <ion-list inset>
      <ion-item v-for="item in manualTests" :key="item.id">
        <ion-label>
          <h2>{{ item.name }}</h2>
          <p v-if="manualState[item.id]?.message">{{ manualState[item.id]?.message }}</p>
        </ion-label>
        <ion-button
          slot="end"
          size="small"
          :disabled="manualState[item.id]?.status === 'running'"
          @click="runManualTest(item.id)"
        >
          运行
        </ion-button>
        <ion-badge slot="end" :color="badgeColor(manualState[item.id]?.status || 'pending')">
          {{ manualState[item.id]?.status || 'pending' }}
        </ion-badge>
      </ion-item>
    </ion-list>
  </div>
</template>

