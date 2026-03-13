import { createRouter, createWebHashHistory } from '@ionic/vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { ROUTE_PATHS } from './routes';

const routes: RouteRecordRaw[] = [
  { path: ROUTE_PATHS.root, redirect: ROUTE_PATHS.home },
  { path: ROUTE_PATHS.home, component: () => import('../views/HomePage.vue') },
  { path: ROUTE_PATHS.haptics, component: () => import('../views/HapticsPage.vue') },
  { path: ROUTE_PATHS.flashlight, component: () => import('../views/FlashlightPage.vue') }
];

const router = createRouter({
  // Offline sandbox requires hash routing.
  history: createWebHashHistory(),
  routes
});

export default router;