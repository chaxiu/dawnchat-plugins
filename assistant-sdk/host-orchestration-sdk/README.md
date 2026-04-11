# @dawnchat/host-orchestration-sdk

**宿主侧编排与 Agent 运行时**相关的 TypeScript SDK：bridge 协议、session、工具路由、Vercel AI 适配的 Agent Loop 等。Desktop 插件工作台、Web Assistant、未来 Mobile Assistant 都会在宿主层依赖本包，与 [@dawnchat/assistant-core](../assistant-core/README.md) 分工明确（core = 视图与 runtime 契约，本包 = 编排与 LLM 工具调用管线）。

## 它负责什么

- **assistant-client**：与宿主 UI / iframe bridge 相关的类型与常量（如 context token、消息类型）
- **session-core**：`useAssistantSessionOrchestrator` 等会话编排能力
- **event-wait**：终端 / 运行时事件等待注册表等
- **transport**：传输层抽象
- **tool-router**：`createHostToolRouter`、工具调用协议、以及从 runtime capability 生成 Agent 工具定义的辅助（含 `dawnchat.ui.*` 别名与 orchestration 工具定义）
- **agent-loop**：`createAgentLoopRunner`、流式事件、工具调用循环（与具体模型通过 **vercel-ai** 子路径适配）
- **vercel-ai**：`createVercelAiAgentLoopModelAdapter` 等，对接 `ai` 包与 Vercel AI SDK 生态
- **protocol / env**：协议错误结构、可注入 timer 等测试友好能力

## 它不负责什么

- Vue 视图与 Assistant 内置页面（属 `assistant-core`）
- 聊天列表 UI（属 `assistant-chat-ui`）
- 无框架「会话产品层」状态机（可选使用 [@dawnchat/assistant-app-sdk](../assistant-app-sdk/README.md) 在宿主组装）

## 子路径导出（`package.json` `exports`）

| 子路径 | 用途摘要 |
|--------|----------|
| `@dawnchat/host-orchestration-sdk` | 根 re-export |
| `.../assistant-client` | Bridge / 上下文 / UI Agent 消息 |
| `.../session-core` | Session orchestrator |
| `.../event-wait` | 事件等待 |
| `.../transport` | 传输 |
| `.../tool-router` | Host 工具路由 + 共享 tool definitions 辅助 |
| `.../agent-loop` | Agent 循环与消息类型 |
| `.../vercel-ai` | Vercel AI / `ai` 适配器 |
| `.../env` | 环境/timer 注入 |

宿主实现工具时：用 `tool-router` 注册可执行函数，用 `agent-loop` 的 `createAgentLoopRunner` 挂载 `model` + `toolRouter`。

## 依赖

- 运行时依赖包含 `ai`（Vercel AI SDK）。版本以本包 `package.json` 为准。

## 开发与测试

```bash
bun run --filter @dawnchat/host-orchestration-sdk typecheck
bun run --filter @dawnchat/host-orchestration-sdk test
bun run --filter @dawnchat/host-orchestration-sdk build
```

## 相关包

- [@dawnchat/assistant-core](../assistant-core/README.md)
- [@dawnchat/assistant-chat-ui](../assistant-chat-ui/README.md)
- [@dawnchat/assistant-app-sdk](../assistant-app-sdk/README.md)（依赖本包 `agent-loop` 类型）
 