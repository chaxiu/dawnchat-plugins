# DawnChat Mobile Ionic Starter

官方移动端示例插件，用于验证 DawnChat mobile 宿主（Android/iOS）中的 Capacitor SDK 底座能力。

## 目标

- 提供“自动诊断 + 人工测试”双模式能力验证。
- 使用模块化结构（pages/composables/services/tests/types），避免单文件堆逻辑。
- 在设备能力缺失时给出 `skipped` 原因，而不是直接报错失败。

## 页面说明

- 自动诊断：执行无感测试（网络、文件、KV、剪贴板、生物识别可用性等）。
- 人工测试：执行会触发权限、系统弹窗或硬件交互的测试（相机、定位、通知等）。
- 注入探测矩阵：覆盖宿主声明的插件底座清单。

## 测试能力与权限映射

| 能力 | 类型 | 典型权限/前置条件 |
| --- | --- | --- |
| Network / Preferences / Filesystem / Clipboard | 自动 | 无或系统默认 |
| NativeBiometric | 自动 | 设备支持生物识别 |
| Camera | 人工 | Camera 权限 |
| Geolocation | 人工 | Location 权限 |
| Contacts | 人工 | Contacts 权限 |
| LocalNotifications | 人工 | Notification 权限 |
| Flash | 人工 | 设备有闪光灯 |
| KeepAwake / Share / Toast / Dialog / Haptics | 人工 | 设备支持系统能力 |

## 目录结构

- `src/pages`: 页面组件（自动诊断页、人工测试页）
- `src/composables`: 状态与编排逻辑
- `src/services/plugins`: 各插件 action 与能力探测
- `src/tests`: 声明式测试注册表
- `src/types`: 共享类型
- `src/styles`: safe-area 与移动端样式
