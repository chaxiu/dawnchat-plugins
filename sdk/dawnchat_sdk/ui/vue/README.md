# DawnChat SDK Vue UI

面向插件前端的轻量聊天 UI 与会话封装，提供 ZMP v2 WebSocket 连接、消息映射、存储适配与基础组件。

## 目录结构

- client/：ZmpLiteClient（WS 连接与协议处理）
- store/：ChatStore、Memory/IndexedDB 适配器
- composables/：useChatSession/useChatHistory/useChatStream
- components/：ChatRoot、MessageComposer、ExtensibleMessageList
- types/：会话配置与协议类型封装
- defaults.ts：默认 labels/format/render

## 典型用法

```ts
import { ChatRoot, MessageComposer, useChatSession } from '@dawnchat/sdk/ui/vue'

const { messages, sendMessage } = useChatSession({
  wsUrl,
  projectId: pluginId,
  sessionId: fileId,
  namespace: pluginId,
  mode: 'smart_reader'
})
```

## 存储与隔离

- `namespace` 或 `storageNamespace` 用于插件级隔离
- `dbPath` 用于 IndexedDB 数据库命名
- 不同插件务必使用不同 namespace

## 扩展能力

- `messageMapper`：自定义协议映射
- `renderers/transform`：自定义渲染与消息变换

