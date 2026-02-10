# Plugin 如何接入、复用宿主 AI Agent 系统

## 目标

- 复用宿主的 Agent 能力与消息协议，不在插件内重写整套 Agent
- 允许 Smart Reader 暴露 MCP 工具，让宿主 Agent 能操控插件 UI/行为
- 前后端改动最小化，且可复用于后续插件

## 现状梳理（关键链路）

- 宿主前端聊天 UI 与消息流主要在 [WorkbenchView.vue](file:///Users/zhutao/Cursor/ZenMind/apps/frontend/src/views/WorkbenchView.vue#L1-L220) 与 [zmpStore.ts](file:///Users/zhutao/Cursor/ZenMind/apps/frontend/src/stores/zmpStore.ts#L600-L880)
- 宿主后端 Agent 入口在 [service.py](file:///Users/zhutao/Cursor/ZenMind/packages/backend-kernel/app/agentv2/service.py#L1-L260)，WebSocket 适配在 [agent_adapter_v2.py](file:///Users/zhutao/Cursor/ZenMind/packages/backend-kernel/app/websocket/agent_adapter_v2.py#L1-L260)
- SDK 能力入口在 [sdk_routes.py](file:///Users/zhutao/Cursor/ZenMind/packages/backend-kernel/app/api/sdk_routes.py#L1-L520)，插件当前通过 SDK 直接调用 LLM（见 [chat_service.py](file:///Users/zhutao/Cursor/ZenMind/dawnchat-plugins/official-plugins/smart-reader/src/smart_reader/services/chat_service.py#L1-L36)）
- 插件 MCP 工具注册由宿主 PluginManager 扫描 manifest 并注册为 plugin.* 工具（见 [manager.py](file:///Users/zhutao/Cursor/ZenMind/packages/backend-kernel/app/plugins/manager.py#L108-L210) 与 [executor.py](file:///Users/zhutao/Cursor/ZenMind/packages/backend-kernel/app/tools/executor.py#L182-L230)）
- 示例插件已经实现 /mcp（见 [hello-world-vue mcp.py](file:///Users/zhutao/Cursor/ZenMind/dawnchat-plugins/official-plugins/hello-world-vue/src/mcp.py#L1-L84)）

## 推荐架构：Host Agent + Plugin Bridge（可复用）

### 1) 插件前端作为 ZMP Client，直接复用宿主 Agent

核心思路：插件前端通过 WebSocket 直连宿主 `/ws/zmp`，用 ZMP 协议进行对话，复用宿主 Agent 逻辑与流式消息。

建议做法：

- 在插件前端实现一个 ZmpLiteClient，只覆盖 `handshake`、`user_command`、`agent_stream/response/error` 等必要消息
- 使用 `payload.mode="smart_reader"` 标识插件业务场景，避免与宿主工作台混淆
- `payload` 里携带 `plugin_context`（file_id/page/selection/anchor 等）作为 Agent 的上下文输入

这样做的好处：

- 不依赖宿主前端的 Tauri DB 与 Matrix 逻辑（zmpStore 不适合插件直接复用）
- 仍可复用协议模型与 UI 组件，实现“体验一致、实现轻量”

### 2) 插件暴露 MCP 工具，让宿主 Agent 操控 UI

核心思路：插件后端提供 `/mcp`，暴露“高亮/跳转/笔记”等工具；宿主 Agent 调用 plugin.* 工具即可完成 UI 操作。

建议工具方向：

- `highlight_region`: 高亮某页/区域
- `scroll_to`: 跳转指定页码或锚点
- `add_note`: 在页内记录笔记
- `get_reader_state`: 返回当前页、缩放、选区、文件 id 等
- `search_chunks`: 在插件内向量库中检索并返回片段（供 Agent 组织回答）

宿主工具侧已经支持插件 MCP 路由（plugin.*），只需：

- 在插件 manifest 增加 `capabilities.tools` 定义（宿主会在初始化时注册）
- 插件后端实现 `/mcp`（可直接复用 hello-world-vue 的实现方式）

### 3) 插件内建立“工具调用 → UI 事件”通道

Agent 调用插件 MCP 工具后，需要让插件前端实时响应。

建议机制：

- 插件后端提供 `/api/events`（SSE 或 WebSocket）推送 UI 指令
- 插件 MCP 工具执行后写入事件队列，由前端订阅并更新 UI
- 前端统一通过事件流驱动 PDF 高亮、滚动、笔记渲染

这样可以解耦“工具调用”和“UI 侧渲染”，便于后续扩展到视频场景。

### 4) Agent 侧路由与上下文处理

宿主 Agent 侧建议做轻量扩展：

- 在 Agent 入口根据 `payload.mode` 路由到 smart_reader 相关策略或 toolset
- `plugin_context` 直接入状态，供 Planner/Tools 决策
- 复用现有 AgentServiceV2 的流式机制，不额外加新通道

这能保持 Agent 核心逻辑统一，同时避免为每个插件复制一套 Agent。

## 关于数据流与历史消息存储

### 插件是否与宿主前端共享消息流？

如果插件前端使用轻量 ZMP 客户端直连宿主 `/ws/zmp`，默认情况下消息流是隔离的：

- 插件的 Agent 消息只会在插件前端渲染
- 宿主前端不会自动接收或展示插件会话
- 两者属于不同的数据流链路

除非明确做桥接，否则不会混用宿主聊天 UI 与插件会话。

### 插件是否需要自建历史消息存储？

是的，插件需要自行决定历史消息策略：

- MVP 可直接内存保存，不做持久化
- 需要跨会话历史时，建议在插件侧使用 IndexedDB 存储
- 若希望与宿主统一存储，可通过 SDK 的 storage 能力做 KV 持久化（需确认权限与接口）

推荐做法是先在插件侧完成存储闭环，后续再考虑与宿主存储融合。

## 插件聊天 UI 与宿主 Vue 复用边界

### 可直接复用（推荐）

- 协议与消息映射：使用 [shared-protocol](file:///Users/zhutao/Cursor/ZenMind/dawnchat-plugins/shared-protocol/src/index.ts#L1-L260) 的 RawProtocolMessage、UIMessage、createMessageMapper，将 ZMP 消息映射为 UIMessage
- 消息渲染组件：使用 [shared-ui MessageList](file:///Users/zhutao/Cursor/ZenMind/dawnchat-plugins/shared-ui/src/messages/MessageList.vue#L1-L191) 及其子组件（Ack/Thought/Plan/Tool/Stream/Response/Error）

插件只需提供：

- 轻量 ZMP 客户端将消息写入本地数组
- 调用 createMessageMapper.mergeMessages 得到 UIMessage 列表
- 传入 MessageList 渲染

### 不建议复用（宿主耦合过强）

- 宿主工作台视图 [WorkbenchView.vue](file:///Users/zhutao/Cursor/ZenMind/apps/frontend/src/views/WorkbenchView.vue#L1-L220) 依赖项目房间、任务挂件、HIL 弹窗、App 级路由与布局
- 宿主 ZMP Store [zmpStore.ts](file:///Users/zhutao/Cursor/ZenMind/apps/frontend/src/stores/zmpStore.ts#L1-L220) 依赖 Tauri DB、项目仓库、Matrix 同步与全局生命周期管理
- 宿主消息持久化链路会将所有消息写入 Rust 数据库并做项目管理，不适合插件复用

### 结论

- UI 层优先复用 shared-ui + shared-protocol
- 逻辑层自行实现轻量 ZMP 客户端与本地存储
- 如需与宿主统一会话与存储，需额外做桥接层，不建议作为插件 MVP

## 关于在 SDK 中封装“轻量聊天 UI + 缓存”的可行性

结论：可行，且适合沉淀为可复用能力。建议将其封装在 `dawnchat-plugins/sdk/dawnchat_sdk/ui`，以“轻量 ZMP 客户端 + UI 渲染组件 + 轻量缓存适配器”为核心。

### 适用边界

- 适合多数插件的“聊天即服务”场景：快速接入宿主 Agent，复用 UI，避免复制 ZMP 逻辑
- 不直接复用宿主数据库与全局会话体系，避免 Tauri DB 与项目级依赖
- 对 UI 定制需求较高的插件仍可在业务层覆写样式或替换渲染容器

### 建议的 SDK 结构

- `ui/client`: ZmpLiteClient（只处理握手、发送与 agent_stream/response/error）
- `ui/store`: ChatStore（内存 + 可插拔轻量持久化）
- `ui/components`: 基于 shared-ui 的 MessageList/MessageItem 组合
- `ui/types`: 暴露 UIMessage、RawProtocolMessage、SessionConfig
- `ui/bridge`: 允许业务层注入扩展协议解析与消息渲染

### 轻量缓存方案建议

SDK 只做“缓存适配”，而非强制持久化实现：

- 默认内存缓存（最小成本）
- 可选 IndexedDB/LocalStorage 适配器
- 通过 `storageAdapter` 注入，插件只需传入 `dbPath` 或 `namespace` 即可获得会话隔离
- 采用“会话级 key”组织数据，方便插件按 file_id 或 doc_id 切换历史

### 对插件业务层的使用方式

插件只需提供必要的上下文与可选配置：

- `sessionId`（file_id/doc_id）
- `dbPath` 或 `namespace`（用于缓存隔离）
- `mode` 与 `plugin_context`（用于宿主 Agent 路由与工具规划）

插件内可直接调用 SDK 的 `createChatUI()` 或 `useChatSession()` 完成：

- 建立 ZMP 连接
- 发送用户消息
- 订阅流式消息并渲染
- 自动写入轻量缓存

### 协议扩展的落地方式

可行，且应当由业务层扩展：

- SDK 提供默认协议映射（RawProtocolMessage → UIMessage）
- 插件需要自定义消息类型时，在业务层提供 `messageMapper` 扩展
- UI 组件层通过 `renderers` 注入自定义 MessageItem
- 保持 SDK 中立，不将特定插件协议耦合到基础库

## Vue 前端 SDK 设计（面向插件复用）

目标是在 `dawnchat-plugins/sdk/dawnchat_sdk/ui` 下增加 Vue 侧能力，与当前 NiceGUI 版本并列，提供一致的聊天能力与最小接入成本。

### 设计原则

- 与 NiceGUI 侧保持 API 语义一致（session、client、store、renderers）
- 协议层与 UI 解耦，支持业务层扩展协议与渲染
- 默认轻量实现，不依赖宿主 Tauri DB 与全局会话系统
- 兼容 Vue 生态最佳实践（Composable + Store + Component）

### 建议的 Vue SDK 分层

- `ui/vue/client`: ZmpLiteClient（WebSocket 连接、handshake、user_command、agent_stream/response/error）
- `ui/vue/store`: ChatStore（内存 + 可插拔持久化适配）
- `ui/vue/composables`: useChatSession/useChatStream/useChatHistory
- `ui/vue/components`: ChatRoot、MessageInput、MessageComposer（包装 shared-ui MessageList/MessageItem）
- `ui/vue/renderers`: MessageRendererRegistry（默认 + 可扩展）
- `ui/vue/types`: 仅聚合导出 shared-protocol 类型与 SDK 自身配置类型

### 默认组件与样式来源

- UI 组件直接复用 [shared-ui](file:///Users/zhutao/Cursor/ZenMind/dawnchat-plugins/shared-ui/src/index.ts#L1-L16) 的 MessageList/MessageItem，不在 SDK 中重复实现
- SDK 只提供装配层（ChatRoot/MessageComposer）将 shared-ui 与 store/composables 组合
- 样式复用 shared-ui 的 CSS 变量，确保与宿主一致
- 业务层可通过 props 覆写主题变量或 class

### 轻量存储适配

- 默认内存缓存
- 可选 IndexedDB 适配器用于长期缓存
- 对插件只暴露 `dbPath` 或 `namespace`
- ChatStore 不持久化消息结构以外的业务字段

### 协议扩展机制（业务侧）

- `messageMapper` 可注入，允许新增消息类型或字段映射
- `renderers` 注册自定义 MessageItem 渲染
- `transform` 钩子支持在渲染前对消息做聚合或裁剪

### 与 shared-ui 的关系与封装策略

- 依赖策略：SDK 将 `@dawnchat/shared-ui` 与 `@dawnchat/shared-protocol` 作为对等依赖使用
- 封装策略：SDK 不复制或改写 shared-ui 组件；仅提供容器与装配层
- 适配责任：SDK 负责提供默认的 `formatTime`、`renderMarkdown`、`labels/icons`，并将消息映射后的 UIMessage 传入 shared-ui 的 MessageList
- 扩展入口：业务层可通过 `messageMapper` 与 `renderers` 注入自定义消息与渲染，shared-ui 保持稳定作为单一来源

### 与 shared-protocol 的关系与封装策略

- 类型来源：UIMessage、RawProtocolMessage 等类型直接从 [shared-protocol](file:///Users/zhutao/Cursor/ZenMind/dawnchat-plugins/shared-protocol/src/index.ts#L1-L287) 导入并在 SDK 聚合导出
- 逻辑来源：message mapper 直接复用 shared-protocol 的 createMessageMapper，不在 SDK 复制实现
- SDK 仅补充 SessionConfig、StorageAdapter 等“接入配置类型”，不重新定义协议类型

### Vue SDK 对插件的调用方式

插件只需提供：

- `sessionId`（file_id/doc_id）
- `dbPath` 或 `namespace`
- `mode` 与 `plugin_context`
- 可选 `messageMapper` 与 `renderers`

插件侧只需要：

- 初始化 `useChatSession`
- 调用 `sendMessage`
- 使用 `MessageList` 组件渲染


## 推荐落地路径（MVP 顺序）

1) 插件 manifest 添加 tools 定义，并在插件后端实现 `/mcp`
2) 插件前端实现 ZmpLiteClient，接入宿主 `/ws/zmp`
3) Agent 侧增加 `payload.mode="smart_reader"` 的路由逻辑
4) 插件后端加入 UI 事件通道，工具调用触发 UI 更新
5) 逐步替换插件内部的 `/api/chat/completions`，改为走宿主 Agent

## 方案优劣评估

优点：

- 复用宿主 Agent 能力与协议体系，插件开发成本低
- 插件与宿主解耦，未来可迁移到其它插件场景
- MCP 工具统一管理，Agent 能力与 UI 控制可组合扩展

成本：

- 需要为插件前端实现轻量 ZMP 客户端（但不依赖 Tauri 与本地 DB）
- Agent 需要按 mode 做最小化路由

## 关键实现参考

- ZMP 消息与流程： [zmpStore.ts](file:///Users/zhutao/Cursor/ZenMind/apps/frontend/src/stores/zmpStore.ts#L600-L900)
- Agent v2 流式接口： [service.py](file:///Users/zhutao/Cursor/ZenMind/packages/backend-kernel/app/agentv2/service.py#L173-L260)
- WebSocket 适配层： [agent_adapter_v2.py](file:///Users/zhutao/Cursor/ZenMind/packages/backend-kernel/app/websocket/agent_adapter_v2.py#L66-L240)
- 插件 MCP 示例： [hello-world-vue mcp.py](file:///Users/zhutao/Cursor/ZenMind/dawnchat-plugins/official-plugins/hello-world-vue/src/mcp.py#L1-L84)
- 插件工具注册机制： [manager.py](file:///Users/zhutao/Cursor/ZenMind/packages/backend-kernel/app/plugins/manager.py#L108-L210)

## 循序渐进落地方案

1) 在 SDK 中新增 `ui/vue` 目录结构与基础类型
2) 实现 ZmpLiteClient 与最小 ChatStore（内存）
3) 提供 useChatSession 与 MessageList 组件集成
4) 增加 IndexedDB 适配器与 `dbPath/namespace` 接口
5) 支持 messageMapper/renderers 扩展与协议自定义
6) 在 smart-reader 插件落地并验证兼容性
