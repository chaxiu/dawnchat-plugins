import { Capacitor } from '@capacitor/core'
import type { HostPluginDescriptor, HostPluginProbeResult } from '../../types/sdk-test'
import { PLUGIN_KEYS } from '../../constants/pluginKeys'

export const hostPluginDescriptors: HostPluginDescriptor[] = [
  { id: 'sqlite', displayName: 'SQLite', packageName: '@capacitor-community/sqlite', pluginKey: PLUGIN_KEYS.CAPACITOR_SQLITE, testKind: 'auto' },
  { id: 'barcode-scanner', displayName: 'Barcode Scanner', packageName: '@capacitor/barcode-scanner', pluginKey: PLUGIN_KEYS.CAPACITOR_BARCODE_SCANNER, testKind: 'manual' },
  { id: 'camera', displayName: 'Camera', packageName: '@capacitor/camera', pluginKey: PLUGIN_KEYS.CAMERA, testKind: 'manual' },
  { id: 'cli', displayName: 'Capacitor CLI', packageName: '@capacitor/cli', testKind: 'build_only' },
  { id: 'clipboard', displayName: 'Clipboard', packageName: '@capacitor/clipboard', pluginKey: PLUGIN_KEYS.CLIPBOARD, testKind: 'auto' },
  { id: 'core', displayName: 'Capacitor Core', packageName: '@capacitor/core', testKind: 'build_only' },
  { id: 'dialog', displayName: 'Dialog', packageName: '@capacitor/dialog', pluginKey: PLUGIN_KEYS.DIALOG, testKind: 'manual' },
  { id: 'filesystem', displayName: 'Filesystem', packageName: '@capacitor/filesystem', pluginKey: PLUGIN_KEYS.FILESYSTEM, testKind: 'auto' },
  { id: 'geolocation', displayName: 'Geolocation', packageName: '@capacitor/geolocation', pluginKey: PLUGIN_KEYS.GEOLOCATION, testKind: 'manual' },
  { id: 'haptics', displayName: 'Haptics', packageName: '@capacitor/haptics', pluginKey: PLUGIN_KEYS.HAPTICS, testKind: 'manual' },
  { id: 'inappbrowser', displayName: 'InAppBrowser', packageName: '@capacitor/inappbrowser', pluginKey: PLUGIN_KEYS.IN_APP_BROWSER, testKind: 'manual' },
  { id: 'ios', displayName: 'Capacitor iOS', packageName: '@capacitor/ios', testKind: 'build_only' },
  { id: 'keyboard', displayName: 'Keyboard', packageName: '@capacitor/keyboard', pluginKey: PLUGIN_KEYS.KEYBOARD, testKind: 'manual' },
  { id: 'local-notifications', displayName: 'Local Notifications', packageName: '@capacitor/local-notifications', pluginKey: PLUGIN_KEYS.LOCAL_NOTIFICATIONS, testKind: 'manual' },
  { id: 'network', displayName: 'Network', packageName: '@capacitor/network', pluginKey: PLUGIN_KEYS.NETWORK, testKind: 'auto' },
  { id: 'preferences', displayName: 'Preferences', packageName: '@capacitor/preferences', pluginKey: PLUGIN_KEYS.PREFERENCES, testKind: 'auto' },
  { id: 'screen-orientation', displayName: 'Screen Orientation', packageName: '@capacitor/screen-orientation', pluginKey: PLUGIN_KEYS.SCREEN_ORIENTATION, testKind: 'auto' },
  { id: 'share', displayName: 'Share', packageName: '@capacitor/share', pluginKey: PLUGIN_KEYS.SHARE, testKind: 'manual' },
  { id: 'status-bar', displayName: 'StatusBar', packageName: '@capacitor/status-bar', pluginKey: PLUGIN_KEYS.STATUS_BAR, testKind: 'manual' },
  { id: 'toast', displayName: 'Toast', packageName: '@capacitor/toast', pluginKey: PLUGIN_KEYS.TOAST, testKind: 'manual' },
  { id: 'audio-recorder', displayName: 'Audio Recorder', packageName: '@capgo/capacitor-audio-recorder', pluginKey: PLUGIN_KEYS.CAPACITOR_AUDIO_RECORDER, testKind: 'manual' },
  { id: 'contacts', displayName: 'Contacts', packageName: '@capgo/capacitor-contacts', pluginKey: PLUGIN_KEYS.CAPACITOR_CONTACTS, testKind: 'manual' },
  { id: 'flash', displayName: 'Flash', packageName: '@capgo/capacitor-flash', pluginKey: PLUGIN_KEYS.CAPACITOR_FLASH, testKind: 'manual' },
  { id: 'keep-awake', displayName: 'Keep Awake', packageName: '@capgo/capacitor-keep-awake', pluginKey: PLUGIN_KEYS.CAPACITOR_KEEP_AWAKE, testKind: 'manual' },
  { id: 'native-biometric', displayName: 'Native Biometric', packageName: '@capgo/capacitor-native-biometric', pluginKey: PLUGIN_KEYS.NATIVE_BIOMETRIC, testKind: 'auto' },
  { id: 'shake', displayName: 'Shake', packageName: '@capgo/capacitor-shake', pluginKey: PLUGIN_KEYS.CAPACITOR_SHAKE, testKind: 'manual' },
  { id: 'video-player', displayName: 'Video Player', packageName: '@capgo/capacitor-video-player', pluginKey: PLUGIN_KEYS.VIDEO_PLAYER, testKind: 'manual' },
  { id: 'native-audio', displayName: 'Native Audio', packageName: '@capgo/native-audio', pluginKey: PLUGIN_KEYS.NATIVE_AUDIO, testKind: 'manual' }
]

export const probeHostPlugin = (descriptor: HostPluginDescriptor): HostPluginProbeResult => {
  if (descriptor.testKind === 'build_only') {
    return {
      descriptor,
      status: 'skipped',
      message: '构建依赖，不参与运行时检测'
    }
  }

  if (!descriptor.pluginKey) {
    return {
      descriptor,
      status: 'failed',
      message: '缺少 pluginKey，无法探测'
    }
  }

  const available = Capacitor.isPluginAvailable(descriptor.pluginKey)
  return {
    descriptor,
    status: available ? 'success' : 'failed',
    message: available ? '宿主已注入' : '宿主未注入或名称不匹配'
  }
}

export const getPlatformSummary = (): string => {
  return `Platform: ${Capacitor.getPlatform()} | Native: ${Capacitor.isNativePlatform() ? 'Yes' : 'No'}`
}

