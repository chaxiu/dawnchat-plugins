# DawnChat 插件系统架构说明（LLM 友好版）

面向目标：让 LLM 在不阅读大量代码的前提下，快速理解插件系统结构、关键入口与扩展点。

## 架构总览

- 宿主后端（Python/FastAPI）负责插件生命周期、环境隔离与能力复用
- 插件通过 SDK 与宿主 API 交互，使用宿主能力与 MCP 工具
- 前端负责插件状态与运行入口展示
- 官方插件在 `dawnchat-plugins/official-plugins/`，会被宿主扫描与分发

## 运行流程（高层）

1. 宿主启动时扫描官方与用户插件目录，解析 `manifest.json`
2. 启动插件前校验宿主版本与插件 `min_host_version` 兼容性
3. 启动插件时创建/复用隔离环境（uv venv + system-site-packages）
4. 插件以子进程启动并分配端口，宿主监听 ready 信号
5. 前端轮询状态并在运行时打开 iframe（Gradio/NiceGUI）
6. 插件通过 SDK 调用宿主 API 与 MCP 工具

## 关键模块索引（路径 + 作用）

### 插件生命周期（Backend）

- packages/backend-kernel/app/api/plugins_routes.py
  提供给前端调用的插件 API 路由，包括启动、停止、状态查询等。
- `packages/backend-kernel/app/plugins/manager.py`  
  插件生命周期核心入口：扫描、启动、停止、端口分配、进程监控。
- `packages/backend-kernel/app/plugins/registry.py`  
  插件注册表与扫描逻辑（官方/用户目录注册）。
- `packages/backend-kernel/app/plugins/models.py`  
  插件数据模型：`PluginManifest`、`PluginInfo`、`PluginState`、`PluginRuntimeInfo`。
- `packages/backend-kernel/app/plugins/env_manager.py`  
  uv 环境管理：创建 venv、继承宿主依赖、安装插件依赖。
- `packages/backend-kernel/pyproject.toml`  
  宿主依赖清单，插件通过 `--system-site-packages` 复用宿主依赖。

### 宿主能力 API（SDK Routes）

- `packages/backend-kernel/app/api/sdk_routes.py`  
  SDK 对外 API：AI、工具调用、存储、任务管理等。  
  必须携带 `X-Plugin-ID` 以标识插件来源。

### MCP 工具系统（扩展能力）

- `packages/backend-kernel/app/tools/manager.py`  
  工具系统门面：工具注册、发现、调用、远程 MCP 管理。
- `packages/backend-kernel/app/tools/builtin/ai/tools.py`  
  内置 AI 工具示例（文本处理、Vision Chat）。
- `packages/backend-kernel/app/tools/builtin/asr/whisper.py`  
  内置 ASR 工具示例（Whisper 语音识别）。

### 前端展示与交互

- `apps/frontend/src/views/AppsView.vue`  
  插件列表与运行界面（运行态 iframe）。
- `apps/frontend/src/stores/pluginStore.ts`  
  插件状态管理与启动/停止逻辑。

### 插件 SDK（宿主访问与 UI 统一）

- `dawnchat-plugins/sdk/dawnchat_sdk/host.py`  
  插件调用宿主能力的核心客户端（AI、Tools、Storage 等）。
- `dawnchat-plugins/sdk/dawnchat_sdk/ui/components.py`  
  NiceGUI 组件封装，保持宿主 UI 风格。
- `dawnchat-plugins/sdk/dawnchat_sdk/ui/theme.py`  
  主题系统与暗/亮色切换。

## 典型插件案例（官方插件）

- `dawnchat-plugins/official-plugins/hello-world-sdk/`  
  SDK 集成示例插件，展示最小化接入宿主能力与 UI 的方式。
- `dawnchat-plugins/official-plugins/echoflow/`  
  较复杂的英语学习插件，模块化较多。插件可自行引入轻量依赖，启动时按需动态下载。

## 开发与打包脚本（插件同步）

- `dev.sh`  
  开发环境启动脚本，包含官方插件同步与 SDK 同步逻辑。  
  参考区间：`/Users/zhutao/Cursor/workspace/plugin/dev.sh#L403-495`
- `build.sh`  
  打包脚本，包含官方插件复制到 sidecar 的逻辑。  
  参考区间：`/Users/zhutao/Cursor/workspace/plugin/build.sh#L956-989`

## 插件目录规范（简化）

每个插件目录通常包含：

- `manifest.json`  
  插件元信息与能力声明（由 `PluginManifest` 解析），包含 `min_host_version`。
- `pyproject.toml`  
  插件依赖声明（由 `UVEnvManager` 安装）。
- `src/main.py`  
  入口文件（默认入口，或由 manifest 能力配置指定）。

官方插件位置：`dawnchat-plugins/official-plugins/`  
用户插件位置：`Config.PLUGIN_DIR`（由后端配置）。

## 版本兼容（宿主 vs 插件）

- 宿主版本号：`Config.VERSION`（默认 1.0.0）
- 插件最低宿主版本：`manifest.json` 的 `min_host_version`
- 启动阶段进行版本兼容校验，不满足则拒绝启动并记录错误信息

## 扩展指南（面向 LLM）

- 宿主不支持的通用能力，优先新增 MCP 工具  
  参考 `app/tools/builtin/*` 与 `app/tools/manager.py` 的注册模型。
- 插件侧优先通过 `dawnchat_sdk/host.py` 调用宿主 API  
  避免直接访问宿主内部模块，确保兼容与隔离。

## 快速定位建议（给 LLM）

若要理解“启动与运行”：先看 `PluginManager` 与 `EnvManager`  
若要理解“宿主能力入口”：看 `sdk_routes.py`  
若要扩展“新能力”：看 `tools/manager.py` 与 `tools/builtin/*`  
若要理解“前端 UI”：看 `AppsView.vue` 与 `pluginStore.ts`
