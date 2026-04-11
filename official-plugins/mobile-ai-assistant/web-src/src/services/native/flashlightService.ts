import { CapacitorFlash } from '@capgo/capacitor-flash';
import type { NativeResult } from '../../types/native';
import { nativeError, nativeSuccess, nativeUnsupported } from '../../types/native';
import { isNativePlatform, isPluginAvailable, normalizeErrorMessage } from './platformService';

interface FlashlightState {
  isOn: boolean;
}

export const getFlashlightState = async (): Promise<NativeResult<FlashlightState>> => {
  if (!isNativePlatform()) {
    return nativeUnsupported('当前是 Web 环境，手电筒仅支持真机');
  }
  if (!isPluginAvailable('CapacitorFlash')) {
    return nativeUnsupported('当前宿主未注入 Flashlight 插件');
  }

  try {
    const result = await CapacitorFlash.isSwitchedOn();
    return nativeSuccess({ isOn: result.value }, result.value ? '手电筒当前为开启状态' : '手电筒当前为关闭状态');
  } catch (error) {
    const message = normalizeErrorMessage(error, '获取手电筒状态失败');
    return nativeError(message, error);
  }
};

export const toggleFlashlight = async (): Promise<NativeResult<FlashlightState>> => {
  if (!isNativePlatform()) {
    return nativeUnsupported('当前是 Web 环境，手电筒仅支持真机');
  }
  if (!isPluginAvailable('CapacitorFlash')) {
    return nativeUnsupported('当前宿主未注入 Flashlight 插件');
  }

  try {
    const result = await CapacitorFlash.toggle();
    return nativeSuccess(
      { isOn: result.value },
      result.value ? '手电筒已开启' : '手电筒已关闭'
    );
  } catch (error) {
    const message = normalizeErrorMessage(error, '切换手电筒失败');
    return nativeError(message, error);
  }
};
