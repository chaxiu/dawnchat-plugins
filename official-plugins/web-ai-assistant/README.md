# Web AI Assistant Template

## Purpose

- `web-ai-assistant` 是 DawnChat 的 Web Assistant MVP 模板。
- 它复用 `assistant-core` 与 `host-orchestration-sdk`，用于验证 Web 端 assistant runtime、provider 配置、agent loop 与 tool route 闭环。

## Dependency Policy

- 源模板中的 `@dawnchat/assistant-core`、`@dawnchat/host-orchestration-sdk` 统一保留为 `workspace:*`。
- 这表示模板源码在 `dawnchat-plugins/assistant-workspace` 中依赖 DawnChat 内部 Assistant SDK，而不是表示最终用户插件目录可直接保留该依赖形态。
- 当模板被创建为用户插件、进入 preview 安装或 runtime 准备阶段时，后端 scaffolder/runtime 必须把这些依赖改写为运行时可解析的 `file:` 依赖。
- 在 release / 打包视角下，必要时还会同步拷贝 `vendor/assistant-sdk` dist 包，保证用户插件目录可以独立完成依赖安装。

## Verification

assistant 源模板在 `dawnchat-plugins/assistant-workspace` 中验证，执行：

- `bun install`
- `bun run verify`

用户插件在创建后进入独立运行目录时，前端依赖安装仍由 Bun 执行。

## Source vs Runtime Install

- 在模板源码目录中，不要把 `bun install` 当作常规开发入口；源码模板依赖包含 `workspace:*`，默认开发验证走 `dawnchat-plugins/assistant-workspace`。
- Bun 安装是给“创建后的用户插件目录 / preview runtime”准备的，此时依赖已经被后端 rewrite 成运行时可解析的 `file:` 形式。
