# Frontend Architecture Guide

## 1. 目录结构

- `web-src/src/cards`：卡片组件与能力定义注册表。
- `web-src/src/runtime`：宿主桥接适配与能力注册编排。
- `web-src/src/router`：页面路由定义与扩展入口。
- `web-src/src/components`：通用展示容器。
- `web-src/src/views/pages`：路由页面实现。
- `web-src/src/App.vue`：应用壳层与全局能力生命周期接线。

## 2. 能力扩展规范

1. 在 `cards/registry.ts` 新增能力定义。
2. 在 `App.vue` 通过声明式注册将 handler 接入 runtime。
3. 输入 payload 统一通过 runtime 归一化函数处理。
4. 能力返回保持结构化对象，便于 Agent 解析。

## 3. 路由扩展规范

1. 在 `router/index.ts` 注册页面路由。
2. 页面文件放在 `views/pages/**`，避免把页面逻辑写入 `App.vue`。
3. `App.vue` 仅负责壳层布局与全局能力注册，页面内容通过 `RouterView` 承载。

## 4. 测试策略

- `cards/__tests__`：能力定义与组件回归。
- `runtime/__tests__`：bridge 不可用、注册失败、payload 异常。
- `__tests__/app-router.spec.ts`：路由壳层切换与页面渲染 smoke。
- 单测默认使用 mock，不依赖真实宿主运行态。

## 5. 最小验证命令

在 `web-src` 目录执行：

- `bun run typecheck`
- `bun run test:unit`
- `bun run build`

## 6. 最佳实践

- 能力定义与生命周期接线保持同源，不手写重复 capability 名。
- 不在组件层直接访问宿主全局对象，统一走 runtime 封装。
- 全局能力状态放在 runtime composable，避免页面切换导致状态丢失。
- 任何 schema 变更必须同步测试和能力描述。

## 7. Assistant SDK Dependency Policy

- 源模板中的 `@dawnchat/assistant-core`、`@dawnchat/host-orchestration-sdk` 统一保留为 `workspace:*`。
- 这类依赖只表示“模板源码在 `dawnchat-plugins/assistant-workspace` 内部引用 DawnChat Assistant SDK”，不表示用户创建后的插件还能直接按原样安装。
- 创建用户插件或准备 preview/runtime 时，必须由 DawnChat 后端 scaffolder/runtime 将它们改写为运行时可解析的 `file:` 依赖，必要时同时拷贝 `vendor/assistant-sdk` dist 包。
- 若在用户插件目录中仍看到 `workspace:*`，应视为 scaffold/rewrite 流程未生效，而不是模板本身的正确运行状态。
- assistant 源模板验证默认从 `dawnchat-plugins/assistant-workspace` 执行 `bun install` / `bun run verify`，而不是直接在模板目录里单独解析 workspace 依赖。
- Bun 安装在创建后用户插件/runtime 阶段仍然成立，但那时依赖已经是后端 rewrite 后的 `file:` 形式。
