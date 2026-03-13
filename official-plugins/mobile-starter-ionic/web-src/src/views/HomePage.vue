<template>
  <ion-page>
    <ion-header translucent>
      <ion-toolbar>
        <ion-title>DawnChat Mobile Template</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="safe-page-content">
      <ion-card class="safe-inline-card hero-card">
        <ion-card-header>
          <ion-note color="primary">Capacitor + Ionic</ion-note>
          <ion-card-title>移动端插件标准模板</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p>该模板已内置 safe-area、能力封装与降级策略，适合作为未来所有 mobile 插件的起点。</p>
          <ion-chip color="success" outline>分层架构</ion-chip>
          <ion-chip color="secondary" outline>优雅降级</ion-chip>
          <ion-chip color="primary" outline>移动端 UI</ion-chip>
        </ion-card-content>
      </ion-card>

      <p class="page-section-title safe-inline-card">能力演示</p>
      <ion-list inset class="safe-inline-card">
        <ion-item button :router-link="ROUTE_PATHS.haptics" detail>
          <ion-label>
            <h3>Haptics 触觉反馈</h3>
            <p>轻触 / 中度 / 重击三档反馈示例</p>
          </ion-label>
          <ion-badge color="success">Native</ion-badge>
        </ion-item>
        <ion-item button :router-link="ROUTE_PATHS.flashlight" detail>
          <ion-label>
            <h3>Flashlight 手电筒</h3>
            <p>支持状态同步与开关切换</p>
          </ion-label>
          <ion-badge color="warning">Hardware</ion-badge>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBadge,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonChip,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonTitle,
  IonToolbar
} from '@ionic/vue';
import { ROUTE_PATHS } from '../router/routes';
</script>

<style scoped>
.hero-card p {
  margin: 10px 0 14px;
  color: var(--ion-color-medium);
  line-height: 1.5;
}

ion-chip {
  margin-right: 8px;
  margin-bottom: 4px;
}
</style>