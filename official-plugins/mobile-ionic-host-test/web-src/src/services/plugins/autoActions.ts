import { Clipboard } from '@capacitor/clipboard'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Network } from '@capacitor/network'
import { Preferences } from '@capacitor/preferences'
import { ScreenOrientation } from '@capacitor/screen-orientation'
import { NativeBiometric } from '@capgo/capacitor-native-biometric'
import { getPlatformSummary } from './capabilityService'

const AUTO_TEST_KEY_PREFIX = 'dawnchat_mobile_ionic_starter'

export const runPlatformInfoTest = async (): Promise<string> => {
  return getPlatformSummary()
}

export const runNetworkTest = async (): Promise<string> => {
  const status = await Network.getStatus()
  return status.connected ? `网络已连接 (${status.connectionType})` : '网络未连接'
}

export const runPreferencesTest = async (): Promise<string> => {
  const key = `${AUTO_TEST_KEY_PREFIX}_pref_key`
  const value = `${Date.now()}`
  await Preferences.set({ key, value })
  const readback = await Preferences.get({ key })
  if (readback.value !== value) {
    throw new Error('Preferences 读写校验失败')
  }
  return 'Preferences 读写成功'
}

export const runFilesystemTest = async (): Promise<string> => {
  const path = `${AUTO_TEST_KEY_PREFIX}_file.txt`
  const payload = `ready-${Date.now()}`
  await Filesystem.writeFile({
    path,
    data: payload,
    directory: Directory.Cache,
    encoding: Encoding.UTF8
  })
  const { data } = await Filesystem.readFile({
    path,
    directory: Directory.Cache,
    encoding: Encoding.UTF8
  })
  if (data !== payload) {
    throw new Error('Filesystem 回读内容不一致')
  }
  return 'Filesystem 读写成功'
}

export const runClipboardTest = async (): Promise<string> => {
  const text = `DawnChat Clipboard ${Date.now()}`
  await Clipboard.write({ string: text })
  const { value } = await Clipboard.read()
  if (!value.includes('DawnChat Clipboard')) {
    throw new Error('Clipboard 回读内容异常')
  }
  return 'Clipboard 写入与读取正常'
}

export const runBiometricAvailabilityTest = async (): Promise<string> => {
  const availability = await NativeBiometric.isAvailable()
  if (!availability.isAvailable) {
    return '当前设备未开启可用的生物识别硬件'
  }
  return `生物识别可用 (${availability.biometryType})`
}

export const runScreenOrientationTest = async (): Promise<string> => {
  const orientation = await ScreenOrientation.orientation()
  return `当前方向 ${orientation.type}`
}

export const runSqliteProbeTest = async (): Promise<string> => {
  return 'SQLite 检测由插件注入探测矩阵统一覆盖'
}

