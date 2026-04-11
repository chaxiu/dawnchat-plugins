# @dawnchat/assistant-core

`assistant-core` 是 DawnChat Assistant 的**通用运行时内核**：契约、视图注册、会话步进与 runtime 事件等跨端复用逻辑都在这里，**不包含**具体宿主（Desktop WebView / 独立 Web / Mobile）的壳层实现。

## 它负责什么

- 通用 runtime environment 装配（`composeAssistantCoreRuntime`）
- `AssistantHostAdapter` 与 `ViewRegistryProvider` 注入边界
- Assistant runtime event 协议（如 `HOST_ASSISTANT_RUNTIME_EVENT_MESSAGE`）
- View manifest / registry / runtime；内置 demo 视图（board、tictactoe 等）可走 **Shadow DOM**（`ViewHost` + `render_mode`）以降低与宿主全局样式的耦合
- Session step 执行、guide / view / flow 等与具体 UI 框架无关的编排模型

## 它不负责什么

- Desktop 宿主与外壳之间的消息桥接、多窗口通信等具体实现
- 语音、震动、系统导航等平台能力
- **宿主侧** session orchestration、tool routing、Agent Loop 与 LLM 调用（见 [@dawnchat/host-orchestration-sdk](../host-orchestration-sdk/README.md)）
- 宿主产品层路由、页面壳、仅某端可用的视图

## 相关包（建议一起读）

| 包 | 角色 |
|----|------|
| [@dawnchat/host-orchestration-sdk](../host-orchestration-sdk/README.md) | 宿主编排：bridge、session、tool-router、agent-loop |
| [@dawnchat/assistant-chat-ui](../assistant-chat-ui/README.md) | 聊天时间轴 Vue 组件（可选） |
| [@dawnchat/assistant-app-sdk](../assistant-app-sdk/README.md) | 无框架聊天会话状态机（可选） |

## 当前推荐接入方式

宿主显式提供 `AssistantRuntimeEnvironment`：

- `hostAdapter`
- `viewRegistryProvider`

再调用 `composeAssistantCoreRuntime()` 完成装配。若不用默认的浏览器侧 Dexie persistence，请传入自定义 `persistenceAdapter`。

## 稳定边界与公开入口

适合作为稳定契约使用的包括：`AssistantHostAdapter`、`AssistantRuntimeEnvironment`、runtime events、view manifest / 注册、`composeAssistantCoreRuntime()`。

`package.json` `exports` 与源码对齐，常用子路径示例：

- `@dawnchat/assistant-core` — 聚合入口
- `@dawnchat/assistant-core/runtime`
- `@dawnchat/assistant-core/view`
- `@dawnchat/assistant-core/events`
- `@dawnchat/assistant-core/guide`
- `@dawnchat/assistant-core/session`
- `@dawnchat/assistant-core/observation`
- `@dawnchat/assistant-core/persistence`
- `@dawnchat/assistant-core/browser` — 浏览器向可选层（含 Dexie 默认实现等），**不等同于**平台无关核心
- `@dawnchat/assistant-core/style.css` — 核心侧全局样式（按需引入）

## Web / Mobile 宿主最小清单

1. 实现并注入 `hostAdapter`、`viewRegistryProvider`
2. 调用 `composeAssistantCoreRuntime()`
3. 按需替换 `persistenceAdapter`
4. 平台能力留在宿主；编排与 Agent 侧使用 `host-orchestration-sdk` + 宿主自研 router

## 开发与构建

在 monorepo 中通常通过 [assistant-workspace](../../assistant-workspace/package.json) 执行 `build:sdk` / `verify:sdk`。发布到插件侧时由 DawnChat 脚手架将 `workspace:*` 重写为 `file:` vendor（见后端 `Config.ASSISTANT_SDK_PACKAGE_DIRS`）。

## 后续方向

- 强化根入口的高层稳定 API，减少对深路径的直接依赖
- 继续区分「核心契约」与「可选增强 / 浏览器层」
