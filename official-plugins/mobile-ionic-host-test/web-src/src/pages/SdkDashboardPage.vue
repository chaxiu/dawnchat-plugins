<script setup lang="ts">
import { onMounted } from 'vue'
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonLabel,
  IonList,
  IonSpinner
} from '@ionic/vue'
import { useSdkTests } from '../composables/useSdkTests'

const { autoTests, autoState, hostProbeResults, running, summary, runAllAutoTests, runSingleAutoTest } = useSdkTests()

const badgeColor = (status: string): string => {
  if (status === 'success') return 'success'
  if (status === 'failed') return 'danger'
  if (status === 'running') return 'primary'
  if (status === 'skipped') return 'warning'
  return 'medium'
}

onMounted(() => {
  void runAllAutoTests()
})
</script>

<template>
  <div class="safe-scroll-content">
    <ion-card>
      <ion-card-header>
        <ion-card-title>自动诊断</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <p>一键执行静默测试，快速验证宿主 SDK 底座可用性。</p>
        <p>
          成功 {{ summary.success }} / 失败 {{ summary.failed }} / 跳过 {{ summary.skipped }} / 总数 {{ summary.total }}
        </p>
        <ion-button expand="block" :disabled="running" @click="runAllAutoTests">
          <ion-spinner v-if="running" name="crescent" class="ion-margin-end" />
          {{ running ? '诊断中...' : '重新执行自动诊断' }}
        </ion-button>
      </ion-card-content>
    </ion-card>

    <ion-list inset>
      <ion-item v-for="item in autoTests" :key="item.id">
        <ion-label>
          <h2>{{ item.name }}</h2>
          <p v-if="autoState[item.id]?.message">{{ autoState[item.id]?.message }}</p>
        </ion-label>
        <ion-button fill="clear" size="small" slot="end" @click="runSingleAutoTest(item.id)">重试</ion-button>
        <ion-badge slot="end" :color="badgeColor(autoState[item.id]?.status || 'pending')">
          {{ autoState[item.id]?.status || 'pending' }}
        </ion-badge>
      </ion-item>
    </ion-list>

    <ion-card>
      <ion-card-header>
        <ion-card-title>宿主插件注入探测矩阵</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <p>通过 Capacitor 插件可用性探测，覆盖文档中列出的底座插件。</p>
      </ion-card-content>
      <ion-list inset>
        <ion-item v-for="probe in hostProbeResults" :key="probe.descriptor.id">
          <ion-label>
            <h2>{{ probe.descriptor.displayName }}</h2>
            <p>{{ probe.descriptor.packageName }} · {{ probe.message }}</p>
          </ion-label>
          <ion-badge slot="end" :color="badgeColor(probe.status)">{{ probe.status }}</ion-badge>
        </ion-item>
      </ion-list>
    </ion-card>
  </div>
</template>

