import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Capacitor } from '@capacitor/core'
import { Dialog } from '@capacitor/dialog'
import { Geolocation } from '@capacitor/geolocation'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Share } from '@capacitor/share'
import { Toast } from '@capacitor/toast'
import { CapacitorContacts } from '@capgo/capacitor-contacts'
import { CapacitorFlash } from '@capgo/capacitor-flash'
import { KeepAwake } from '@capgo/capacitor-keep-awake'

export const runToastTest = async (): Promise<string> => {
  await Toast.show({
    text: 'DawnChat: Toast 插件可用',
    duration: 'short',
    position: 'bottom'
  })
  return 'Toast 已触发'
}

export const runDialogTest = async (): Promise<string> => {
  await Dialog.alert({
    title: 'DawnChat',
    message: 'Dialog 插件可用'
  })
  return 'Dialog 已展示'
}

export const runHapticsTest = async (): Promise<string> => {
  await Haptics.impact({ style: ImpactStyle.Heavy })
  return 'Haptics 已触发重震动'
}

export const runCameraTest = async (): Promise<string> => {
  const photo = await Camera.getPhoto({
    quality: 80,
    allowEditing: false,
    source: CameraSource.Prompt,
    resultType: CameraResultType.Uri
  })
  if (!photo.webPath) {
    throw new Error('相机返回为空')
  }
  return `拍照成功: ${photo.format ?? 'unknown'}`
}

export const runGeolocationTest = async (): Promise<string> => {
  const permission = await Geolocation.checkPermissions()
  if (permission.location !== 'granted') {
    await Geolocation.requestPermissions()
  }
  const pos = await Geolocation.getCurrentPosition()
  return `定位成功: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`
}

export const runShareTest = async (): Promise<string> => {
  const canShare = await Share.canShare()
  if (!canShare.value) {
    return '当前环境不支持系统分享'
  }
  await Share.share({
    title: 'DawnChat Mobile Example',
    text: '这是一个 Capacitor 官方示例插件诊断页',
    url: 'https://capacitorjs.com'
  })
  return 'Share 面板已唤起'
}

export const runLocalNotificationTest = async (): Promise<string> => {
  await LocalNotifications.requestPermissions()
  await LocalNotifications.schedule({
    notifications: [
      {
        id: Date.now() % 1000000,
        title: 'DawnChat 通知测试',
        body: '若你看到了这条通知，LocalNotifications 可用',
        schedule: { at: new Date(Date.now() + 2000) }
      }
    ]
  })
  return '本地通知已安排（2 秒后）'
}

export const runFlashToggleTest = async (): Promise<string> => {
  const current = await CapacitorFlash.isSwitchedOn()
  if (current.value) {
    await CapacitorFlash.switchOff()
    return 'Flash 已关闭'
  }
  await CapacitorFlash.switchOn({ intensity: 1 })
  return 'Flash 已打开'
}

export const runKeepAwakeTest = async (): Promise<string> => {
  await KeepAwake.keepAwake()
  return 'KeepAwake 已开启'
}

export const runContactsTest = async (): Promise<string> => {
  await CapacitorContacts.checkPermissions()
  await CapacitorContacts.requestPermissions()
  const contacts = await CapacitorContacts.getContacts({})
  return `读取联系人数量: ${contacts.contacts.length}`
}

export const runCapabilityOnlyManualTest = async (pluginKey: string, displayName: string): Promise<string> => {
  const available = Capacitor.isPluginAvailable(pluginKey)
  if (!available) {
    throw new Error(`${displayName} 未注入，无法执行交互测试`)
  }
  return `${displayName} 已注入（探测型测试）`
}

