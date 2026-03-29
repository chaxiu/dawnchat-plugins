# Python Sidecar Architecture Guide

## 1. 目录结构

- `entry/main.py`：FastAPI app 组装与进程启动。
- `app/config.py`：配置读取与 manifest 装载。
- `app/mcp/registry.py`：MCP tool 清单与 handler 映射组装。
- `app/mcp/tools`：每个 tool 的定义与处理逻辑。
- `mcp.py`：SDK 路由构建适配层。
- `tests`：health、MCP happy path 与错误分支测试。

## 2. 新增 Tool 规范

1. 在 `app/mcp/tools` 新增 tool 模块。
2. 在 `app/mcp/registry.py` 注册 tool definition 和 handler。
3. 保证 `tools/list` 可发现，`tools/call` 可执行。
4. 在 `tests` 中增加 happy path 与 error path 覆盖。

## 3. 测试策略

- 优先使用 ASGITransport + AsyncClient 做进程内测试。
- 错误分支至少覆盖未知 tool 或非法参数。
- 保持 JSON-RPC 协议行为与 SDK 默认语义一致。

## 4. 最小验证命令

在 `_ir/python` 目录执行：

- `pytest`

## 5. 最佳实践

- `main.py` 只保留 app 装配，避免堆叠业务逻辑。
- tool 定义与 handler 同模块维护，降低演进成本。
- manifest 读取与 fallback 策略集中在 registry 层实现。
