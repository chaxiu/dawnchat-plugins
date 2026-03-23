# Desktop Starter Template Guide

## 1. 文档目标

本文件面向未来接手该模板的 Agent，帮助快速理解当前架构、代码组织和演进规则，减少重复探索成本。

核心定位：

- 这是 DawnChat 官方桌面端插件模板（desktop app type）。
- 技术形态为 `Bun backend + Vue frontend`。
- 当前模板已经收敛到 `_ir/backend + _ir/frontend + _ir/shared` 三域结构。

---

## 2. 快速入口（先看这些）

- 插件清单：`manifest.json`
- IWP 配置：`.iwp-lint.yaml`
- 后端入口：`_ir/backend/entry/main.ts`
- 前端工程根：`_ir/frontend/web-src/`
- 前端主页面：`_ir/frontend/web-src/src/views/pages/home/HolographicCommandOrbScene.vue`
- 前端默认参数模型：`_ir/frontend/web-src/src/models/home_scene.ts`
- IWP 意图层根：`InstructWare.iw/`
- 首页意图文档：`InstructWare.iw/views/pages/home.md`
- 后端 hello 接口意图文档：`InstructWare.iw/logic/tools/hello_world.md`

## 2.5 30 秒上手 Checklist（给自动化 Agent）

- 读取 `manifest.json`，确认 `runtime.entry` 与 `preview.frontend_dir`。
- 读取 `InstructWare.iw/system.md` 与 `views/pages/home.md`，确认当前语义目标。
- 读取 `_ir/backend/entry/main.ts`，确认后端最小 API（health/info/hello）。
- 读取 `_ir/frontend/web-src/src/models/home_scene.ts`，确认默认参数与 `@iwp.link`。
- 读取 `_ir/frontend/web-src/src/views/pages/home/HolographicCommandOrbScene.vue`，确认 UI 使用的是 `models` 字面量。
- 变更默认值时遵循“先改文档，再改代码字面量，再跑 reconcile”。

---

## 3. 当前架构与分层理念

### 3.1 顶层目录

- `_ir/backend`：运行时后端实现（Bun）。
- `_ir/frontend`：前端实现与构建产物。
  - `web-src`：源码工程（可独立构建）。
  - `web`：构建产物目录。
- `_ir/shared`：预留共享层（跨前后端稳定语义模型）。

### 3.2 前端内部建议分层（`_ir/frontend/web-src/src`）

- `views/**`：页面与视图组件。
- `logic/**`：渲染/行为逻辑。
- `models/**`：页面配置、默认参数、视图模型。

设计原则：

- 视图负责渲染与交互挂载。
- 默认值和语义配置优先沉淀到 `models`。
- 可复用算法/渲染细节下沉到 `logic`。

### 3.3 运行时路径约束（来自 manifest）

- `runtime.root = _ir`
- `runtime.entry = backend/entry/main.ts`
- `preview.frontend_dir = frontend/web-src`

若目录重构，必须同步修改以上三处路径语义。

---

## 4. 后端现状（最小 API）

`_ir/backend/entry/main.ts` 当前仅保留最小接口：

- `GET /health`
- `GET /api/info`
- `GET /api/hello?name=...`

说明：

- `tools/call` 已移除，`manifest.capabilities.tools` 当前为空数组。
- 该模板旨在作为“极简桌面插件基线”，不预置复杂工具协议。

---

## 5. IWP 模式下如何迭代（推荐）

### 5.1 SSOT 原则

- 意图层 SSOT 在 `InstructWare.iw/**`。
- 实现层在 `_ir/**`。
- 默认值采用“文档声明 + 代码字面量”方式保持一致。

### 5.2 Node Link 规则

- 当文档节点需要约束代码字面量时，在代码旁使用 `@iwp.link`。
- 例如首页默认参数位于：
  - 文档：`InstructWare.iw/views/pages/home.md` 的 `Data Bindings`
  - 代码：`_ir/frontend/web-src/src/models/home_scene.ts`
- 文档更新后，需通过 session diff/reconcile 检查 link 一致性与失配。

### 5.3 标准校验链路

- `iwp-lint schema --config .iwp-lint.yaml`
- `iwp-build session diff --config .iwp-lint.yaml --preset agent-default`
- `iwp-build session reconcile --config .iwp-lint.yaml --preset agent-default`
- 必要时：`iwp-lint links normalize --config .iwp-lint.yaml --write`

建议在大改目录结构时，严格遵守 Stage 边界：先意图、后实现、再 link 对齐、最后反向审查。

---

## 6. 非 IWP 模式下如何工作

如果用户明确不按 IWP 协议推进，可采用普通工程模式：

- 将 `InstructWare.iw` 视为可选文档，而非强制门禁。
- 重点保证运行正确性：
  - backend 启动与 API 可用；
  - frontend 构建通过；
  - manifest 路径配置正确。
- 避免混入失效 `@iwp.link` 注释，防止后续恢复 IWP 时产生噪音。

推荐做法：

- 即使暂不执行 IWP gate，也保持目录分层稳定（backend/frontend/shared）。
- 需求稳定后再批量补齐意图文档与 link，降低来回迁移成本。

---

## 7. Agent 接手建议流程

1. 先读 `manifest.json` 明确运行入口与预览目录。
2. 读 `InstructWare.iw/system.md` 与 `views/pages/home.md` 理解目标语义。
3. 从 `models -> logic -> views` 路径反查当前前端实现。
4. 变更默认参数时，优先改文档，再对齐代码字面量与 link。
5. 提交前至少完成 schema + build + reconcile 三项校验。

---

## 8. 已知现状与注意事项

- 当前模板允许 warning 级未覆盖节点存在，不阻塞提交。
- 关键错误是 link 失效（如 IWP105）或 schema error，需要优先修复。
- `README.md` 不参与 IWP schema 校验（已在 `.iwp-lint.yaml` 排除）。
