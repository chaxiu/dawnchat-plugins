# REQ-0268: ChatTaskCard 子代理名称与模型徽章同行内联展示并发布 v0.1.17

## 目标

在 assistant-sdk/assistant-chat-ui 的 ChatTaskCard 组件中，消除子代理名称（task.agentLabel，如 scout）与模型徽章（task.modelLabel，如 deepseek-v4.1-flash）分上下两行渲染的冗余布局，改为同一水平 flex 行（align-items: center，窄屏允许自然 wrap）内并排展示：当 agentLabel 与 modelLabel 同时非空时按「agentLabel · modelChip」顺序同排渲染（中间带柔和居中圆点 · 分隔，模型徽章继续保留精巧 chip 样式及 title=task.modelTitle 悬浮提示）；当仅一方非空时不渲染多余分隔点；两者皆空时不渲染该行。同步将 assistant-sdk/assistant-chat-ui/package.json 的 version 从 0.1.16 升至 0.1.17，更新/新增组件单测断言同行容器与分隔点行为，通过门禁后合入并推送到 origin/main 以触发 GitHub Actions 发布 @dawnchat/assistant-chat-ui@0.1.17。

## 验收

- ac-1: 当 ChatTaskCard 同时传入非空 agentLabel 与 modelLabel 时，代理名称文本、居中分隔点（·）与模型徽章（含 title=modelTitle）位于同一水平内联行容器内按序渲染；仅传入 agentLabel 或仅传入 modelLabel 时不渲染分隔点，未传入 modelLabel 时不渲染模型徽章。
- ac-2: assistant-sdk/assistant-chat-ui/package.json 版本号更新为 0.1.17，组件单测、typecheck 与 build 全绿，合入 main 并推送至 origin/main 触发 npm-publish 工作流发布 @dawnchat/assistant-chat-ui@0.1.17。
