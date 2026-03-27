# Desktop Hello World Template Guide

## 1. 模板定位

这是 DawnChat 官方最简桌面插件模板，目标是作为 IWP 接入的基础起点。

- 技术形态：`Bun backend + Vue frontend`
- 架构基线：`_ir/backend + _ir/frontend + _ir/shared`
- 业务复杂度：仅保留 Hello World 级别功能

## 2. 快速入口

- 插件清单：`manifest.json`
- IWP 配置：`.iwp-lint.yaml`
- 后端入口：`_ir/backend/entry/main.ts`
- 前端工程根：`_ir/frontend/web-src/`
- 前端主页面：`_ir/frontend/web-src/src/views/pages/home/HomeHelloWorldPage.vue`
- IWP 意图层根：`InstructWare.iw/`

## 3. 运行时最小接口

- `GET /health`
- `GET /api/info`
- `GET /api/hello?name=...`

`/api/hello` 响应示例：

```json
{
  "status": "ok",
  "plugin_id": "com.dawnchat.desktop-hello-world",
  "greeting": "Hello, DawnChat!"
}
```

## 4. IWP 迭代建议

推荐遵循以下顺序：

1. 先改 `InstructWare.iw/**`（意图层）。
2. 再改 `_ir/**`（实现层）。
3. 最后执行 schema 与 session 校验。

常用命令：

- `iwp-lint schema --config .iwp-lint.yaml`
- `iwp-build session diff --config .iwp-lint.yaml --preset agent-default`
- `iwp-build session reconcile --config .iwp-lint.yaml --preset agent-default`

## 5. 前端本地开发

在 `_ir/frontend/web-src` 目录执行：

- `pnpm install`
- `pnpm build`

构建产物会输出到 `_ir/frontend/web`，由 Bun 后端静态托管。
