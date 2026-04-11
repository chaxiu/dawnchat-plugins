import { ref } from 'vue';
import type { HapticsLevel } from '../services/native/hapticsService';
import { triggerHapticsImpact } from '../services/native/hapticsService';

export const useHaptics = () => {
  const isRunning = ref(false);
  const lastStatus = ref<'idle' | 'success' | 'unsupported' | 'error'>('idle');
  const feedbackMessage = ref('点击任意按钮触发震动反馈');

  const runImpact = async (level: HapticsLevel): Promise<void> => {
    if (isRunning.value) {
      return;
    }

    isRunning.value = true;
    const result = await triggerHapticsImpact(level);
    lastStatus.value = result.status;
    feedbackMessage.value = result.message;
    isRunning.value = false;
  };

  return {
    isRunning,
    lastStatus,
    feedbackMessage,
    runImpact
  };
};
