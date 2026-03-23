# DawnChat 插件系统架构说明（2026 概览）

目标：用一页内容说明 DawnChat 当前“插件生态 + 实时预览 + 自然语言开发迭代”整体链路，帮助开发者与 LLM 快速建立统一认知。

## 1) 系统定位

- 宿主（Python/FastAPI）负责插件生命周期、环境隔离、统一 API 与安全边界。
- 前端负责市场、安装/更新/卸载、创建插件、开发工作台（预览 + coding agent）。
- coding agent 作为开发能力层，支持 OpenCode 与 AgentV3 双引擎，面向插件源码创建与修改。

## 2) 当前能力版图（高层）

### 在线发布、安装与更新

- 官方插件以 `GitHub Release + plugins.json` 为分发基础。
- 客户端通过市场接口拉取清单，执行安装/更新/卸载。
- 安装流程具备状态机（下载、解压、建环境、装依赖、就绪/失败），并支持轮询进度。

### 本地优先的目录治理

- 插件目录按职责拆分，避免代码与数据混放：
  - **源码目录**：插件可执行代码（安装/更新会覆盖）。
  - **数据目录**：插件运行数据（卸载源码默认保留）。
  - **模型目录**：插件模型资产（独立管理）。
  - **下载缓存目录**：安装包与模板缓存。
- 所有目录遵循系统级用户数据路径策略（macOS/Windows/Linux）。

### 运行态与预览态

- **运行态（normal）**：面向最终使用，按常规生命周期启动插件。
- **预览态（preview）**：面向开发，支持前端热更新与后端热重载。
- 预览运行由 `PluginPreviewManager` 统一管理端口、Python/Bun 进程与文件监听。

### 插件创建（Template -> User Plugin）

- 前端在 Apps 视图提供“创建应用”向导，收集应用名、插件 ID、描述等信息。
- 后端先确保模板缓存，再从模板拷贝源码，重写 `manifest.json / pyproject.toml`，并替换旧模板 ID 引用。
- 创建完成后自动建隔离环境并安装依赖，写入 `source_type=user_created` 元数据并刷新注册表。

### 开发模式（自然语言迭代）

- 开发工作台采用双栏布局：左侧插件实时预览，右侧开发聊天面板。
- 聊天面板支持 OpenCode / AgentV3 引擎切换，在同一 UI 契约下发送自然语言修改请求。
- 圈选能力可将 `文件 + 行列 + 片段` 注入输入框，形成可定位上下文，驱动更准确的代码修改。
- UI Bridge 支持 agent 对预览页面执行 describe/query/act，并回推 context token，形成“看得见 + 改得动”的闭环。

## 3) 关键链路（从创建到迭代）

1. 用户在 `AppsView` 打开创建向导并确认参数。
2. 前端调用 `/api/plugins/template/ensure` 与 `/api/plugins/create-from-template` 完成创建。
3. 前端调用 `/api/plugins/{id}/preview/start` 并轮询 `/preview/status` 等待预览 ready。
4. 跳转开发工作台，加载预览 iframe 与 coding agent 会话。
5. 用户自然语言描述需求，agent 产出改动并流式回传。
6. 用户可通过圈选与上下文回推继续迭代，预览态实时验证修改结果。

## 4) 关键模块索引（按职责）

### 插件生命周期、市场与创建

- `packages/backend-kernel/app/api/plugins_routes.py`
- `packages/backend-kernel/app/plugins/manager.py`
- `packages/backend-kernel/app/plugins/installer_service.py`
- `packages/backend-kernel/app/plugins/env_manager.py`

### 预览运行时与热更新

- `packages/backend-kernel/app/plugins/preview_manager.py`
- `packages/backend-kernel/app/plugins/vite_preview_server_template.mjs`
- `apps/frontend/src/stores/pluginStore.ts`

### 创建入口与开发工作台（前端）

- `apps/frontend/src/views/AppsView.vue`
- `apps/frontend/src/components/apps/CreateAppWizardModal.vue`
- `apps/frontend/src/components/apps/InstalledAppsSection.vue`
- `apps/frontend/src/features/plugin-dev-workbench/views/PluginDevWorkbenchPage.vue`
- `apps/frontend/src/components/apps/PluginPreviewPane.vue`
- `apps/frontend/src/components/apps/PluginDevChatPanel.vue`

### Coding Agent 双引擎（OpenCode + AgentV3）

- `apps/frontend/src/stores/codingAgentStore.ts`
- `apps/frontend/src/stores/coding-agent/runtimeOrchestrator.ts`
- `apps/frontend/src/services/coding-agent/openCodeAdapter.ts`
- `apps/frontend/src/services/coding-agent/agentV3Adapter.ts`
- `apps/frontend/src/services/coding-agent/adapterRegistry.ts`
- `packages/backend-kernel/app/api/opencode_routes.py`
- `packages/backend-kernel/app/api/agentv3_routes.py`

### UI Bridge 与上下文回推

- `apps/frontend/src/composables/usePluginUiBridge.ts`
- `apps/frontend/src/services/plugin-ui-bridge/bridgeClient.ts`
- `apps/frontend/src/services/plugin-ui-bridge/contextToken.ts`
- `packages/backend-kernel/app/api/plugin_ui_bridge_routes.py`
- `packages/backend-kernel/app/plugin_ui_bridge/service.py`
- `packages/backend-kernel/app/tools/helpers/plugin_bridge.py`

### SDK 与宿主能力入口

- `dawnchat-plugins/sdk/dawnchat_sdk/host.py`
- `packages/backend-kernel/app/api/sdk_routes.py`
- `packages/backend-kernel/app/tools/manager.py`

## 5) 对 LLM 的阅读建议

- 要理解“创建插件”先看：`AppsView.vue` -> `pluginStore.ts` -> `plugins_routes.py` -> `manager.py#create_plugin_from_template`。
- 要理解“预览与圈选”先看：`PluginDevWorkbenchPage.vue` -> `PluginPreviewPane.vue` -> `preview_manager.py` -> `vite_preview_server_template.mjs`。
- 要理解“自然语言改代码”先看：`PluginDevChatPanel.vue` -> `codingAgentStore.ts` -> `openCodeAdapter.ts / agentV3Adapter.ts`。
- 要理解“UI 上下文回推与页面操作”先看：`usePluginUiBridge.ts` -> `plugin_ui_bridge_routes.py` -> `plugin_ui_bridge/service.py`。
