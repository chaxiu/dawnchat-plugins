# @dawnchat/assistant-app-sdk

**无 UI、无框架**的 Assistant **聊天会话状态机**：transcript 持久化回调、hydrate、`submitPrompt` 流程、流式事件归并到 `AgentLoopMessage[]`。适合 Web / Mobile 等宿主在各自框架（Vue、React、Capacitor 等）里包一层 composable 或 store。

## 它负责什么

- `createAssistantChatSession(options)`：会话生命周期与快照订阅
- `applyAgentLoopStreamEvent`：将 runner 流式事件合并到临时 transcript（可单独单测）
- 通过 **注入** `createRunContext` 组装 `AgentLoopRunner` + 工具列表（具体实现来自宿主 + [@dawnchat/host-orchestration-sdk](../host-orchestration-sdk/README.md)）
- 可选 `transcriptStore`、`logger`、`validateConfig`

## 它不负责什么

- Vue 组件或 DOM（见 [@dawnchat/assistant-chat-ui](../assistant-chat-ui/README.md)）
- Assistant 视图与 runtime（见 [@dawnchat/assistant-core](../assistant-core/README.md)）
- 工具路由与 bridge 协议细节（宿主实现后通过 `createRunContext` 注入）

## 依赖

- **dependencies**：`@dawnchat/host-orchestration-sdk`（源码树内为 `file:../host-orchestration-sdk`；发布/同步后与其他 SDK 一并 vendor）

仅使用本包类型与 `agent-loop` 消息模型；不在此包内安装 Vue。

## 公开入口

- `@dawnchat/assistant-app-sdk` — 当前导出 `chatSession` 模块（`createAssistantChatSession`、`applyAgentLoopStreamEvent` 等）

## 宿主接入要点

1. 实现 `createRunContext({ config, systemPrompt })` → 返回 `{ runner, tools }`（典型：`createVercelAiAgentLoopModelAdapter` + `createAgentLoopRunner` + 宿主 `toolRouter`）
2. 实现 `transcriptStore`（如同步 `localStorage`、Capacitor Preferences、或宿主桥）
3. 在 UI 层订阅 `session.subscribe` 或使用 `getSnapshot()` 驱动渲染
4. 用户输入：`session.setPrompt` 或与 ref 双向同步后调用 `submitPrompt(config)`

参考实现：[web-ai-assistant 的 `useAssistantChat.ts`](../../official-plugins/web-ai-assistant/web-src/src/features/chat/useAssistantChat.ts)。

## 开发与测试

```bash
bun run --filter @dawnchat/assistant-app-sdk typecheck
bun run --filter @dawnchat/assistant-app-sdk test
bun run --filter @dawnchat/assistant-app-sdk build
```

## 相关包

- [@dawnchat/host-orchestration-sdk](../host-orchestration-sdk/README.md)
- [@dawnchat/assistant-chat-ui](../assistant-chat-ui/README.md)
- [@dawnchat/assistant-core](../assistant-core/README.md)
