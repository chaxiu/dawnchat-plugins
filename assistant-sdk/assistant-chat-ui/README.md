# @dawnchat/assistant-chat-ui

面向 **Vue 3** 的 Assistant **聊天时间轴 UI 包**：消息列表、工具块、Markdown 片段、等待态等。与 [@dawnchat/assistant-core](../assistant-core/README.md) **无直接依赖**；宿主可把任意来源的「类 Agent Loop  transcript」适配成本包的数据结构后渲染。

## 它负责什么

- `ChatMessageList` 及各类 `ChatPart*` 组件
- 时间轴相关类型（`ChatTimelineItem`、`ChatToolDisplayMeta` 等）
- `agentLoopTranscriptToTimelineItems`：将 agent-loop 风格消息数组映射为时间轴条目（见 `src/adapters/agentLoopTranscript.ts`）
- 基础样式：`@dawnchat/assistant-chat-ui/style.css`（主题可通过 CSS 变量与宿主对齐）

## 它不负责什么

- Assistant runtime、视图注册、工具**执行**（仅负责展示与交互）
- LLM / Agent Loop 运行时（由宿主结合 [@dawnchat/host-orchestration-sdk](../host-orchestration-sdk/README.md) 等实现）

## 安装与引入

在 DawnChat 插件模板中通常声明为 `workspace:*`，由脚手架在发布/预览时重写为 `file:`。

应用侧至少需要：

```ts
import "@dawnchat/assistant-chat-ui/style.css";
import { ChatMessageList } from "@dawnchat/assistant-chat-ui";
```

宿主若使用自有设计 token，建议把 `--color-*` 等变量桥接到现有主题（参考官方 `web-ai-assistant` 的 `style.css` 做法）。

## 与 transcript 的对接

1. 持有 `AgentLoopMessage[]`（或与本包 adapter 类型兼容的结构）
2. 调用 `agentLoopTranscriptToTimelineItems(transcript, { isRunning, getToolDescription? })` 或封装好的宿主适配函数（如 web assistant 的 `toWebAssistantTimelineItems`）
3. 将结果交给 `ChatMessageList`

`getToolDescription` 可选：用于在工具条上显示比裸 `tool name` 更友好的说明（可与宿主工具注册表对齐）。

## 公开入口

- `@dawnchat/assistant-chat-ui` — 组件、类型、adapter、`useStreamingPresentation` 等
- `@dawnchat/assistant-chat-ui/style.css` — 必引样式

## 开发与测试

```bash
# 在 dawnchat-plugins/assistant-workspace 下
bun run --filter @dawnchat/assistant-chat-ui typecheck
bun run --filter @dawnchat/assistant-chat-ui test
bun run --filter @dawnchat/assistant-chat-ui build
```

## 相关包

- [@dawnchat/assistant-core](../assistant-core/README.md) — 运行时与视图（与 UI 包解耦）
- [@dawnchat/host-orchestration-sdk](../host-orchestration-sdk/README.md) — agent-loop 消息模型与编排
- [@dawnchat/assistant-app-sdk](../assistant-app-sdk/README.md) — 无框架会话层（可选，与 UI 独立）
