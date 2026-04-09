# assistant-core

`assistant-core` 是 DawnChat assistant 的通用运行时内核。

它的目标不是承接平台实现，而是作为 Assistant Runtime 的单一来源，提供跨 Desktop、Web、Mobile 都可复用的运行时契约与核心执行逻辑。

## 它负责什么

- 通用 runtime environment 装配
- `AssistantHostAdapter` 与 `ViewRegistryProvider` 注入边界
- Assistant runtime event 协议
- view manifest / view registry / view runtime
- session step 执行模型与 guide / view / flow / session 等通用运行时

## 它不负责什么

- Desktop 的 `parent window` 通信实现
- Desktop / Mobile 的语音、震动、导航等平台能力实现
- 宿主侧 session orchestration、tool routing、agent loop 编排
- 宿主产品层 router、页面壳层、desktop-only / mobile-only views

## 当前推荐接入方式

宿主应显式提供一个 `AssistantRuntimeEnvironment`：

- `hostAdapter`
- `viewRegistryProvider`

然后通过 `composeAssistantCoreRuntime()` 组装运行时。

## 稳定边界

当前最适合作为稳定边界使用的是：

- `AssistantHostAdapter`
- `AssistantRuntimeEnvironment`
- runtime events
- view manifest / view registration 契约
- `composeAssistantCoreRuntime()`

当前推荐优先使用的公开入口：

- `@dawnchat/assistant-core`
- `@dawnchat/assistant-core/runtime`
- `@dawnchat/assistant-core/view`
- `@dawnchat/assistant-core/events`
- `@dawnchat/assistant-core/guide`
- `@dawnchat/assistant-core/session`
- `@dawnchat/assistant-core/observation`
- `@dawnchat/assistant-core/persistence`
- `@dawnchat/assistant-core/browser`

其中 `browser` 代表 browser-oriented optional layer，当前主要承接 Dexie persistence 默认实现与 scope 解析，不应被理解为平台无关核心契约。

## Web / Mobile 宿主最小接入清单

- 提供 `hostAdapter`
- 提供 `viewRegistryProvider`
- 在宿主中显式调用 `composeAssistantCoreRuntime()`
- 如果不想使用默认 browser persistence，显式传入 `persistenceAdapter`
- 把平台特有的 voice / vibration / native navigation / parent window bridge 保留在宿主层

## 后续优化方向

- 强化根入口作为稳定高层 API
- 减少宿主对深路径内部实现的直接依赖
- 继续保持“通用 runtime 单一来源”
- 逐步把重型依赖与可选增强层和核心稳定层区分清楚
