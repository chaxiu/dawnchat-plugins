# DawnChat Shared UI

面向宿主与插件的通用消息渲染组件库，保持稳定 UI 结构与语义，供 SDK 与前端复用。

## 目录结构

- src/messages/：消息展示组件集合
- src/index.ts：统一导出入口

## 组件概览

- MessageList：消息列表容器
- MessageItem/MessageBubble/MessageMeta：基础消息结构
- UserMessage/ResponseMessage/StreamMessage：常见消息类型
- ToolCallMessage/PlanMessage/TodoUpdateMessage/HilMessage：结构化消息
- ErrorMessage/UnknownMessage：异常与兜底渲染

## 样式约定

依赖 CSS 变量进行主题适配：

- --color-bg / --color-bg-secondary
- --color-text / --color-text-secondary
- --color-border / --color-primary

