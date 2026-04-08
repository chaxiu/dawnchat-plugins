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
- `tool-router`：宿主工具路由抽象
- `agent-loop`：可替换的 agent loop 抽象

## 当前推荐方向

- `tool-router` 由 DawnChat 自研做实
- `agent-loop` 先定义 DawnChat 自己的最小 contract，再优先封装开源方案
- transport / request tracking / timeout / env adapter 继续向 SDK 内收敛

## 宿主最小职责

宿主未来原则上只需要补齐：

- transport 实现
- platform capability 实现
- 宿主产品层 UI / router / 生命周期接线

而不应再复制一套 session/event-wait/agent glue。

## 后续优化方向

- 统一宿主侧协议与类型来源
- 抽出可注入 transport adapter
- 把 `tool-router` 从占位接口升级为真实路由层
- 把 `agent-loop` 从类型桩升级为 adapter-first 的可运行抽象
