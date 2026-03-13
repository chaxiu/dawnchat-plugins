import type { AutoTestDefinition, ManualTestDefinition } from '../types/sdk-test'
import { PLUGIN_KEYS } from '../constants/pluginKeys'
import {
  runBiometricAvailabilityTest,
  runClipboardTest,
  runFilesystemTest,
  runNetworkTest,
  runPlatformInfoTest,
  runPreferencesTest,
  runScreenOrientationTest,
  runSqliteProbeTest
} from '../services/plugins/autoActions'
import {
  runCameraTest,
  runCapabilityOnlyManualTest,
  runContactsTest,
  runDialogTest,
  runFlashToggleTest,
  runGeolocationTest,
  runHapticsTest,
  runKeepAwakeTest,
  runLocalNotificationTest,
  runShareTest,
  runToastTest
} from '../services/plugins/manualActions'

export const autoTestRegistry: AutoTestDefinition[] = [
  { id: 'platform', name: '平台信息', run: runPlatformInfoTest },
  { id: 'network', name: 'Network 网络状态', pluginKey: PLUGIN_KEYS.NETWORK, run: runNetworkTest },
  { id: 'preferences', name: 'Preferences 键值存储', pluginKey: PLUGIN_KEYS.PREFERENCES, run: runPreferencesTest },
  { id: 'filesystem', name: 'Filesystem 沙盒读写', pluginKey: PLUGIN_KEYS.FILESYSTEM, run: runFilesystemTest },
  { id: 'clipboard', name: 'Clipboard 剪贴板', pluginKey: PLUGIN_KEYS.CLIPBOARD, run: runClipboardTest },
  { id: 'biometric', name: 'NativeBiometric 生物识别可用性', pluginKey: PLUGIN_KEYS.NATIVE_BIOMETRIC, run: runBiometricAvailabilityTest },
  { id: 'screen-orientation', name: 'ScreenOrientation 屏幕方向', pluginKey: PLUGIN_KEYS.SCREEN_ORIENTATION, run: runScreenOrientationTest },
  { id: 'sqlite-probe', name: 'SQLite 注入探测（见底座矩阵）', pluginKey: PLUGIN_KEYS.CAPACITOR_SQLITE, run: runSqliteProbeTest }
]

export const manualTestRegistry: ManualTestDefinition[] = [
  { id: 'toast', name: 'Toast 提示', pluginKey: PLUGIN_KEYS.TOAST, run: runToastTest },
  { id: 'dialog', name: 'Dialog 弹窗', pluginKey: PLUGIN_KEYS.DIALOG, run: runDialogTest },
  { id: 'haptics', name: 'Haptics 震动', pluginKey: PLUGIN_KEYS.HAPTICS, run: runHapticsTest },
  { id: 'camera', name: 'Camera 拍照', pluginKey: PLUGIN_KEYS.CAMERA, run: runCameraTest },
  { id: 'geolocation', name: 'Geolocation 定位', pluginKey: PLUGIN_KEYS.GEOLOCATION, run: runGeolocationTest },
  { id: 'contacts', name: 'Contacts 通讯录', pluginKey: PLUGIN_KEYS.CAPACITOR_CONTACTS, run: runContactsTest },
  { id: 'share', name: 'Share 系统分享', pluginKey: PLUGIN_KEYS.SHARE, run: runShareTest },
  { id: 'notification', name: 'LocalNotifications 本地通知', pluginKey: PLUGIN_KEYS.LOCAL_NOTIFICATIONS, run: runLocalNotificationTest },
  { id: 'flash', name: 'Flash 手电筒', pluginKey: PLUGIN_KEYS.CAPACITOR_FLASH, run: runFlashToggleTest },
  { id: 'keep-awake', name: 'KeepAwake 常亮锁', pluginKey: PLUGIN_KEYS.CAPACITOR_KEEP_AWAKE, run: runKeepAwakeTest },
  {
    id: 'status-bar',
    name: 'StatusBar 注入探测',
    pluginKey: PLUGIN_KEYS.STATUS_BAR,
    run: () => runCapabilityOnlyManualTest(PLUGIN_KEYS.STATUS_BAR, 'StatusBar')
  },
  {
    id: 'keyboard',
    name: 'Keyboard 注入探测',
    pluginKey: PLUGIN_KEYS.KEYBOARD,
    run: () => runCapabilityOnlyManualTest(PLUGIN_KEYS.KEYBOARD, 'Keyboard')
  },
  {
    id: 'inappbrowser',
    name: 'InAppBrowser 注入探测',
    pluginKey: PLUGIN_KEYS.IN_APP_BROWSER,
    run: () => runCapabilityOnlyManualTest(PLUGIN_KEYS.IN_APP_BROWSER, 'InAppBrowser')
  },
  {
    id: 'barcode-scanner',
    name: 'BarcodeScanner 注入探测',
    pluginKey: PLUGIN_KEYS.CAPACITOR_BARCODE_SCANNER,
    run: () => runCapabilityOnlyManualTest(PLUGIN_KEYS.CAPACITOR_BARCODE_SCANNER, 'BarcodeScanner')
  },
  {
    id: 'audio-recorder',
    name: 'AudioRecorder 注入探测',
    pluginKey: PLUGIN_KEYS.CAPACITOR_AUDIO_RECORDER,
    run: () => runCapabilityOnlyManualTest(PLUGIN_KEYS.CAPACITOR_AUDIO_RECORDER, 'AudioRecorder')
  },
  {
    id: 'native-audio',
    name: 'NativeAudio 注入探测',
    pluginKey: PLUGIN_KEYS.NATIVE_AUDIO,
    run: () => runCapabilityOnlyManualTest(PLUGIN_KEYS.NATIVE_AUDIO, 'NativeAudio')
  },
  {
    id: 'shake',
    name: 'Shake 注入探测',
    pluginKey: PLUGIN_KEYS.CAPACITOR_SHAKE,
    run: () => runCapabilityOnlyManualTest(PLUGIN_KEYS.CAPACITOR_SHAKE, 'Shake')
  },
  {
    id: 'video-player',
    name: 'CapacitorVideoPlayer 注入探测',
    pluginKey: PLUGIN_KEYS.VIDEO_PLAYER,
    run: () => runCapabilityOnlyManualTest(PLUGIN_KEYS.VIDEO_PLAYER, 'CapacitorVideoPlayer')
  }
]

