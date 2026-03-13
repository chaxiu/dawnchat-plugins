# DawnChat Mobile Starter (Ionic + Capacitor)

用于 DawnChat mobile 插件的标准起始模板，目标是：

- 能直接复制创建新插件；
- 保持页面层简洁，不把 Native 调用堆在 `.vue`；
- 在 Web/HMR 与真机环境都具备可解释的降级行为；
- 默认处理 safe-area 与深色模式，保证移动端观感。

## 页面与能力

- `HomePage`：模板介绍与能力入口；
- `HapticsPage`：触觉反馈演示（Light/Medium/Heavy）；
- `FlashlightPage`：手电筒状态同步与开关演示。

## 目录结构（分层约定）

- `src/views/`：页面视图，仅做 UI 展示和事件绑定；
- `src/composables/`：页面状态管理、交互编排；
- `src/services/native/`：Capacitor/Capgo 插件调用与错误归一化；
- `src/types/`：跨层共享类型（`success/unsupported/error`）；
- `src/styles/`：safe-area 等全局布局样式；
- `src/theme/`：主题 token（颜色、圆角、阴影、深色模式）。

## 接入新能力 SOP

1. 安装目标插件依赖并同步宿主（`cap sync`）。
2. 在 `src/services/native/` 新建 service：
   - 先做 `isNativePlatform` + `isPluginAvailable` 检查；
   - 返回统一 `NativeResult<T>`，不要直接向页面抛原始错误。
3. 在 `src/composables/` 新建 composable：
   - 管理 `isBusy`、状态标记、反馈文案；
   - 暴露给页面可直接绑定的方法。
4. 在 `src/views/` 接入页面：
   - 页面只消费 composable，不直接 import 原生插件。

## 模板规范（重要）

- 禁止在页面内直接调用 Capacitor 插件；
- 禁止 `console.log` / `alert`；
- 能力不可用时必须返回可读文案（`unsupported`），不能静默失败；
- 保持 Hash 路由（离线沙箱兼容）；
- 保留 `viewport-fit=cover` 与 safe-area 样式，避免刘海屏遮挡。

## 运行

```bash
bun install
bun run dev
```

构建检查：

```bash
bun run build
```
