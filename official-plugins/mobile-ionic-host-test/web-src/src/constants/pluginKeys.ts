export const PLUGIN_KEYS = {
  CAPACITOR_SQLITE: 'CapacitorSQLite',
  CAPACITOR_BARCODE_SCANNER: 'CapacitorBarcodeScanner',
  CAMERA: 'Camera',
  CLIPBOARD: 'Clipboard',
  DIALOG: 'Dialog',
  FILESYSTEM: 'Filesystem',
  GEOLOCATION: 'Geolocation',
  HAPTICS: 'Haptics',
  IN_APP_BROWSER: 'InAppBrowser',
  KEYBOARD: 'Keyboard',
  LOCAL_NOTIFICATIONS: 'LocalNotifications',
  NETWORK: 'Network',
  PREFERENCES: 'Preferences',
  SCREEN_ORIENTATION: 'ScreenOrientation',
  SHARE: 'Share',
  STATUS_BAR: 'StatusBar',
  TOAST: 'Toast',
  CAPACITOR_AUDIO_RECORDER: 'CapacitorAudioRecorder',
  CAPACITOR_CONTACTS: 'CapacitorContacts',
  CAPACITOR_FLASH: 'CapacitorFlash',
  CAPACITOR_KEEP_AWAKE: 'CapacitorKeepAwake',
  NATIVE_BIOMETRIC: 'NativeBiometric',
  CAPACITOR_SHAKE: 'CapacitorShake',
  VIDEO_PLAYER: 'VideoPlayer',
  NATIVE_AUDIO: 'NativeAudio'
} as const

export type PluginKey = (typeof PLUGIN_KEYS)[keyof typeof PLUGIN_KEYS]

