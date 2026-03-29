# `_ir` Architecture Guide

## 1. 目录职责

- `frontend/`：Web UI 与能力注册运行时。
- `backend/`：Bun HTTP 服务与静态资源托管。
- `python/`：Python sidecar 与 MCP tool 路由。
- `shared/`：跨端共享协议或常量。

## 2. 端间协作边界

- 前端只负责 UI 能力定义与渲染，不负责宿主协议实现。
- Bun 后端负责插件 HTTP 接口与前端静态资源托管。
- Python sidecar 负责 MCP 能力扩展，不直接耦合前端渲染细节。

## 3. 扩展一个新能力的标准流程

1. 定义能力契约（名称、输入 schema、返回结构）。
2. 在对应端新增 handler 与测试。
3. 更新对应端 README 的能力说明。
4. 运行该端最小验证命令并记录结果。

## 4. 最佳实践

- 入口文件只保留 bootstrap，不堆叠业务分支。
- 新增代码优先进入既有分层目录，不创建平行路径。
- 单测优先覆盖参数校验、错误分支、兼容性行为。
