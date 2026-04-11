import { ref } from 'vue';
import { getFlashlightState, toggleFlashlight } from '../services/native/flashlightService';

export const useFlashlight = () => {
  const isBusy = ref(false);
  const isFlashOn = ref(false);
  const lastStatus = ref<'idle' | 'success' | 'unsupported' | 'error'>('idle');
  const feedbackMessage = ref('可在真机中切换手电筒状态');

  const syncFlashState = async (): Promise<void> => {
    isBusy.value = true;
    const result = await getFlashlightState();
    lastStatus.value = result.status;
    feedbackMessage.value = result.message;
    if (result.status === 'success') {
      isFlashOn.value = result.data.isOn;
    }
    isBusy.value = false;
  };

  const toggle = async (): Promise<void> => {
    if (isBusy.value) {
      return;
    }

    isBusy.value = true;
    const result = await toggleFlashlight();
    lastStatus.value = result.status;
    feedbackMessage.value = result.message;
    if (result.status === 'success') {
      isFlashOn.value = result.data.isOn;
    }
    isBusy.value = false;
  };

  return {
    isBusy,
    isFlashOn,
    lastStatus,
    feedbackMessage,
    syncFlashState,
    toggle
  };
};
