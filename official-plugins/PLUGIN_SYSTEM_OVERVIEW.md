# DawnChat 插件系统架构说明（2026 概览）

目标：用一页内容快速说明 DawnChat 插件系统的核心能力与当前演进方向，便于开发者与 LLM 建立统一认知。

## 1) 系统定位

- 宿主（Python/FastAPI）负责插件生命周期、环境隔离、统一 API 与安全边界。
- 插件通过 SDK 调用宿主能力（AI、工具、存储、任务），避免直接耦合宿主内部实现。
- 前端负责市场、安装/更新/卸载、运行态与开发态入口。

## 2) 当前能力版图（高层）

### 在线发布与更新

- 官方插件以 `GitHub Release + plugins.json` 作为分发基础。
- 客户端通过市场接口拉取清单，执行安装、更新、卸载。
- 安装流程具备状态机（下载、解压、建环境、装依赖、就绪/失败），并支持进度轮询。

### 本地优先的目录治理

- 插件相关内容已按职责拆分，避免“代码与数据混放”：
  - **源码目录**：插件可执行代码（安装/更新会覆盖）。
  - **数据目录**：插件运行数据（卸载源码时默认保留）。
  - **模型目录**：插件下载模型资产（独立管理，避免误删）。
  - **下载缓存目录**：安装包与更新缓存。
- 所有目录遵循系统级用户数据路径策略（macOS/Windows/Linux 各自系统目录）。

### 运行态与预览态

- **运行态（normal）**：面向最终使用，插件按常规生命周期启动。
- **预览态（preview）**：面向开发，支持前端热更新与后端热重载。
- 预览态通过 `PluginPreviewManager` 统一管理端口、进程与文件变更监听。

### 开发模式（Dev Workbench）

- 新增“开发模式”入口：左侧插件预览，右侧开发聊天面板。
- 支持元素圈选（inspector 风格），将 `文件 + 行列位置 + 片段` 回填到输入框。
- 目标是为后续 coding agent 接入提供稳定的人机协作入口。

## 3) 关键模块索引（按职责）

### 插件生命周期与市场

- `packages/backend-kernel/app/api/plugins_routes.py`
- `packages/backend-kernel/app/plugins/manager.py`
- `packages/backend-kernel/app/plugins/installer_service.py`
- `packages/backend-kernel/app/plugins/preview_manager.py`
- `packages/backend-kernel/app/plugins/env_manager.py`

### 预览与开发态

- `packages/backend-kernel/app/plugins/vite_preview_server_template.mjs`
- `apps/frontend/src/views/PluginDevWorkbenchView.vue`
- `apps/frontend/src/components/apps/PluginPreviewPane.vue`
- `apps/frontend/src/stores/pluginStore.ts`

### SDK 与宿主能力入口

- `dawnchat-plugins/sdk/dawnchat_sdk/host.py`
- `packages/backend-kernel/app/api/sdk_routes.py`
- `packages/backend-kernel/app/tools/manager.py`

## 4) 插件包与兼容性（简述）

- 插件仍以 `manifest.json + pyproject.toml + src/` 为核心结构。
- 宿主会在启动/安装阶段校验插件兼容性（如 `min_host_version`）。
- 插件依赖安装在隔离环境中执行，避免污染宿主运行时。

## 5) 对 LLM 的阅读建议

- 要理解“安装与更新”：先看 `plugins_routes.py` + `installer_service.py`。
- 要理解“预览与开发模式”：看 `preview_manager.py` + `PluginDevWorkbenchView.vue`。
- 要理解“宿主能力调用”：看 `sdk_routes.py` + `dawnchat_sdk/host.py`。
