# Bun Backend Architecture Guide

## 1. 目录结构

- `entry/main.ts`：进程启动与环境参数装配。
- `src/server.ts`：请求分发入口。
- `src/http/routes`：按接口拆分的路由处理器。
- `src/http/static.ts`：静态文件解析与 index 回退。
- `src/http/response.ts`：统一 JSON 响应封装。
- `tests`：路由与工具函数单测。

## 2. 新增接口规范

1. 在 `src/http/routes` 新增 route handler。
2. 在 `src/server.ts` 增加分发规则。
3. 在 `tests/http_routes.spec.ts` 增加回归断言。
4. 保持已有接口兼容，不随意改变响应字段名。

## 3. 测试策略

- 路由测试优先通过 `createBackendFetch` 直接调用。
- 工具函数测试独立覆盖，避免被 HTTP 场景耦合。
- 不依赖真实监听端口做单测。

## 4. 最小验证命令

在 `_ir/backend` 目录执行：

- `bun run typecheck`
- `bun run test:unit`

## 5. 最佳实践

- 入口瘦身，业务逻辑放在 `src`。
- 路由层只做参数解析与响应编排。
- 返回结构保持稳定，避免破坏宿主和 Agent 兼容性。
