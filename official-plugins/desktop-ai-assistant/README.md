# Desktop AI Assistant Template Guide

## 1. 模板定位

这是 DawnChat 官方桌面端 AI 插件模板，面向“可持续自进化”的插件开发场景。

- 技术形态：`Vue frontend + Bun backend + Python sidecar`
- 架构基线：`_ir/frontend + _ir/backend + _ir/python + _ir/shared`
- 能力基线：前端能力编排、Bun HTTP 服务、Python MCP sidecar

## 2. 快速入口

- 插件清单：`manifest.json`
- 全局约束：`AGENTS.md`、`.opencode/skills/`
- `_ir` 总览：`_ir/README.md`
- 前端指南：`_ir/frontend/README.md`
- Bun 后端指南：`_ir/backend/README.md`
- Python sidecar 指南：`_ir/python/README.md`

## 3. 默认运行接口

- Bun backend：
  - `GET /health`
  - `GET /api/info`
  - `GET /api/hello?name=...`
- Python sidecar：
  - `GET /health`
  - `POST /mcp`（JSON-RPC）

## 4. 推荐迭代顺序

1. 先确认目标属于哪一端（frontend/backend/python）。
2. 再按端内 README 的目录规则新增或修改代码。
3. 最后执行该端最小测试与构建验证。

## 5. 最小验证命令

- 前端（`_ir/frontend/web-src`）：
  - `bun run typecheck`
  - `bun run test:unit`
  - `bun run build`
- Bun 后端（`_ir/backend`）：
  - `bun run typecheck`
  - `bun run test:unit`
- Python sidecar（`_ir/python`）：
  - `pytest`

## 6. 模板扩展原则

- 保持对外能力名和 payload 兼容，避免破坏宿主调用契约。
- 新增能力必须同时补充测试与文档说明。
- 不在入口文件堆叠业务逻辑，优先放入分层目录。
