import { Haptics, ImpactStyle } from '@capacitor/haptics';
import type { NativeResult } from '../../types/native';
import { nativeError, nativeSuccess, nativeUnsupported } from '../../types/native';
import { isPluginAvailable, normalizeErrorMessage } from './platformService';

export type HapticsLevel = 'LIGHT' | 'MEDIUM' | 'HEAVY';

const IMPACT_STYLE_MAP: Record<HapticsLevel, ImpactStyle> = {
  LIGHT: ImpactStyle.Light,
  MEDIUM: ImpactStyle.Medium,
  HEAVY: ImpactStyle.Heavy
};

export const triggerHapticsImpact = async (level: HapticsLevel): Promise<NativeResult<null>> => {
  if (!isPluginAvailable('Haptics')) {
    return nativeUnsupported('当前宿主未注入 Haptics 插件');
  }

  try {
    await Haptics.impact({ style: IMPACT_STYLE_MAP[level] });
    return nativeSuccess(null, `已触发 ${level} 震动反馈`);
  } catch (error) {
    const message = normalizeErrorMessage(error, '触发震动失败');
    return nativeError(message, error);
  }
};
