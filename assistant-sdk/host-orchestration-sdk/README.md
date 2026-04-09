# host-orchestration-sdk

`host-orchestration-sdk` 是 DawnChat assistant 的宿主编排层 SDK。

它的目标不是替代 `assistant-core`，而是在宿主侧承接协议 glue、transport、session orchestration，以及未来可替换的 agent glue，使 Desktop、Web、Mobile 可以共享同一套宿主编排模型。

## 它负责什么

- assistant client 协议与消息模型
- context token / context inbox
- runtime event wait 与 session terminal wait
- 宿主侧 session orchestration
- 宿主 transport、tool router、agent loop 的统一抽象

## 它不负责什么

- assistant view runtime 本身
- view manifest、view registry、guide / flow / session step 执行语义
- Desktop / Mobile 的具体平台能力实现
- 宿主产品页面、UI 壳层、业务视图

## 当前分层理解

- `assistant-client`：协议与消息模型
- `event-wait`：等待与匹配机制
- `session-core`：宿主侧 session orchestration
- `transport`：request tracking / timeout strategy / bridge transport glue
- `tool-router`：宿主工具路由抽象
- `agent-loop`：可替换的 agent loop 抽象
- `env`：logger / timer / base64 等环境注入

## 当前稳定公开入口

- `@dawnchat/host-orchestration-sdk`
- `@dawnchat/host-orchestration-sdk/assistant-client`
- `@dawnchat/host-orchestration-sdk/event-wait`
- `@dawnchat/host-orchestration-sdk/session-core`
- `@dawnchat/host-orchestration-sdk/transport`
- `@dawnchat/host-orchestration-sdk/tool-router`
- `@dawnchat/host-orchestration-sdk/agent-loop`
- `@dawnchat/host-orchestration-sdk/vercel-ai`
- `@dawnchat/host-orchestration-sdk/env`

## 当前推荐方向

- `tool-router` 由 DawnChat 自研做实
- `agent-loop` 先定义 DawnChat 自己的最小 contract，再优先封装开源方案
- 统一 assistant message / tool call / tool result / error 的协议面，避免各端各自长类型
- `local_loop` / `external_loop`、`local_route` / `remote_route` / `mcp_bridge` 先以最小 contract 预留，不要求各端共用同一实现
- transport / request tracking / timeout / env adapter 继续向 SDK 内收敛

## 宿主最小职责

宿主未来原则上只需要补齐：

- transport 实现
- platform capability 实现
- 宿主产品层 UI / router / 生命周期接线
- 为 SDK 提供需要的环境依赖注入（如 logger / timer / base64，按需）

而不应再复制一套 session/event-wait/agent glue。

## Web / Mobile 宿主最小接入清单

- Web：补 transport + host page lifecycle + platform capability adapter
- Mobile：补 transport + native capability adapter + WebView 生命周期接线
- 两端都应直接复用 `assistant-client`、`event-wait`、`session-core`、`transport`、`tool-router`
- `agent-loop` 优先通过 adapter 接开源前端 tool-calling / agent 方案，而不是各端各写一套 loop
- `vercel-ai` 当前作为 web/mobile 第一优先 adapter，但它只应是 adapter 层，不应成为 SDK 公共协议源

## 后续优化方向

- 统一宿主侧协议与类型来源
- 抽出可注入 transport adapter
- 继续扩充 `tool-router` 的远端 route / bridge 落地
- 在保持 DawnChat contract 不变的前提下，补更多可替换的 agent adapters
