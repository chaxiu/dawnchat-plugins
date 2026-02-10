# Plugin MCP 实现与重型插件工作方式

本文档总结本次任务实现的代码逻辑、Plugin MCP 调用链路、关键文件位置，以及 ComfyUI/CosyVoice/VibeVoice 插件的工作方式与日志排错方案。

## 一、实现概览

本次实现解决了两类问题：

1. **Plugin MCP 调用路径与工具名解析**
   - 修复 `/mcp/` 尾斜杠导致的 307 重定向。
   - 修复 Host 发送 `plugin.<plugin_id>.<tool>` 造成插件工具名不匹配的 404。

2. **插件日志可观测性**
   - Host 侧把插件 stdout/stderr 写入独立文件，方便定位插件内部错误。
   - SDK 增加统一日志封装，插件入口统一配置日志输出。

## 二、Plugin MCP 调用链路

整体调用链路如下：

1. **插件发起调用**
   - 插件通过 SDK 调用 Host 的 `/sdk/tools/call`。
   - Host 根据工具定义路由到内置或插件工具。

2. **Host 执行插件 MCP**
   - `ToolExecutor` 识别 `provider_type=PLUGIN_MCP`。
   - `PluginManager.start_plugin` 启动插件进程，提供 `http://127.0.0.1:{port}/mcp` 服务。
   - `RemoteMCPProvider` 作为 MCP 客户端调用插件。

3. **插件 MCP Router 执行**
   - 插件的 `mcp.py` 注册 `/mcp` JSON-RPC 路由。
   - `tools/list` 返回 manifest 中声明的工具。
   - `tools/call` 调用对应的 handler，并包装统一返回格式。

### 关键路径说明

- MCP 请求路径：`/mcp`（非 `/mcp/`）
  - Host 侧在 `RemoteMCPProvider` 中拆分 base_url 与 path_prefix，确保命中 `/mcp` 而非 `/mcp/`。
  - 避免 FastAPI 的 307 重定向。

- 工具名解析：
  - Host 调用时工具名为 `plugin.<plugin_id>.<tool_name>`。
  - MCP 协议里插件只认 `<tool_name>`。
  - Host 发送前会剥离 `plugin.` 与 `<plugin_id>.` 前缀。

## 三、关键代码文件

### 1) Host 侧（backend-kernel）

- MCP 客户端与调用路径修复  
  `packages/backend-kernel/app/tools/providers/remote.py`

- 插件进程启动与日志落盘  
  `packages/backend-kernel/app/plugins/manager.py`

- SDK 统一日志封装  
  `dawnchat-plugins/sdk/dawnchat_sdk/logging.py`

### 2) 插件通用 MCP Router

ComfyUI / VibeVoice / CosyVoice 共用 MCP Router 结构：

- `dawnchat-plugins/official-plugins/comfyui/src/mcp.py`
- `dawnchat-plugins/official-plugins/vibevoice/src/mcp.py`
- `dawnchat-plugins/official-plugins/cosyvoice/src/mcp.py`

核心逻辑：

- 路由前缀 `/mcp`
- `tools/list` 返回 manifest 中声明的 tools
- `tools/call` 只匹配 manifest 注册的 tool name

## 四、重型插件如何工作

### 1) ComfyUI 插件

- **入口**：`dawnchat-plugins/official-plugins/comfyui/src/main.py`
- **工具实现**：`dawnchat-plugins/official-plugins/comfyui/src/comfyui_plugin/tools.py`
- **工作方式**：
  - Host 启动插件进程，插件提供 MCP `/mcp` 接口。
  - MCP 工具调用实际转发到 ComfyUI 内部执行逻辑。
  - `manifest.json` 中定义工具输入输出规范。

### 2) VibeVoice 插件

- **入口**：`dawnchat-plugins/official-plugins/vibevoice/src/main.py`
- **工具实现**：`dawnchat-plugins/official-plugins/vibevoice/src/vibevoice_plugin/handlers.py`
- **工作方式**：
  - 插件进程内加载 VibeVoice 引擎。
  - MCP `tts_synthesize` / `tts_list_voices` / `tts_status` 直接由 handler 返回。

### 3) CosyVoice 插件

- **入口**：`dawnchat-plugins/official-plugins/cosyvoice/src/main.py`
- **工具实现**：`dawnchat-plugins/official-plugins/cosyvoice/src/cosyvoice_plugin/handlers.py`
- **工作方式**：
  - 与 VibeVoice 类似，插件进程内加载 CosyVoice 模型。
  - MCP 提供语音合成能力。

## 五、插件依赖与隔离方式

插件依赖由 Host 侧 `PluginManager` 启动时管理：

- 创建隔离 venv
  - `packages/backend-kernel/app/plugins/env_manager.py`
- 基于 `pyproject.toml` 安装依赖
  - ComfyUI：`dawnchat-plugins/official-plugins/comfyui/pyproject.toml`
  - VibeVoice：`dawnchat-plugins/official-plugins/vibevoice/pyproject.toml`
  - CosyVoice：`dawnchat-plugins/official-plugins/cosyvoice/pyproject.toml`

重型依赖只安装在插件 venv 内部，不污染 Host。

## 六、日志体系与排错

### 1) Host 侧日志汇聚

Host 会捕获插件 stdout/stderr，并写入：

`~/Library/Logs/DawnChat/plugins/<plugin_id>.log`

实现位置：

- `packages/backend-kernel/app/plugins/manager.py`

### 2) SDK 统一日志封装

插件入口统一调用 SDK 里的日志初始化：

- `dawnchat-plugins/sdk/dawnchat_sdk/logging.py`
- `setup_plugin_logging("comfyui", level=logging.INFO)` 等

插件入口已接入：

- `dawnchat-plugins/official-plugins/comfyui/src/main.py`
- `dawnchat-plugins/official-plugins/vibevoice/src/main.py`
- `dawnchat-plugins/official-plugins/cosyvoice/src/main.py`

### 3) 常见问题定位

- **307 重定向**：请求是否命中 `/mcp/` 而非 `/mcp`
  - Host 修复在 `remote.py`
- **404 工具不存在**：Host 是否发送了 `plugin.<plugin_id>.` 前缀
  - Host 修复在 `remote.py`，剥离前缀后再调用
- **插件内部异常**：查看 `~/Library/Logs/DawnChat/plugins/<plugin_id>.log`

## 七、典型链路示例

以 `dawnchat.image_gen.text_to_image` 为例：

1. Plugin SDK → `/sdk/tools/call`
2. Host → `ToolExecutor` → `PluginManager.start_plugin`
3. Host → `RemoteMCPProvider.tools/call` → `/mcp`
4. Plugin MCP Router → handler → 返回 `{code, message, data}`

工具名在 Host 侧会被规范成插件短名（如 `text_to_image`），避免 404。
