# feat(assistant-chat-ui): support modelLabel and modelTitle badge on ChatTaskCard (v0.1.16)

## 目标

背景痛点：ChatTaskInfo 与 ChatTaskCard 缺少模型展示字段，接入方无法在子专员任务卡片上展示该子任务实际执行的模型名称与完整 provider/model 标识。
预期变化：在 assistant-sdk/assistant-chat-ui 的 ChatTaskInfo 类型新增可选字段 modelLabel?: string 与 modelTitle?: string，在 ChatTaskCard.vue 中当存在非空 modelLabel 时渲染一枚独立的 .task-meta-chip 模型徽章（正文显示 modelLabel，DOM title 属性绑定 modelTitle || modelLabel），补齐组件单测并通过 typecheck/test/build 验证后，将 assistant-sdk/assistant-chat-ui/package.json 版本号从 0.1.15 升级至 0.1.16 合入推送触发自动发版。
价值分类：user

工程约束（公开开源仓库纪律）：仅修改 assistant-sdk/assistant-chat-ui/ 下的类型、组件、单测与 package.json（0.1.15 -> 0.1.16）；提交前必须在 assistant-sdk/assistant-chat-ui 目录实跑通过 typecheck、test 与 build（注意 dist/ 已被 gitignore，切勿强加未跟踪临时文件）；代码中严禁包含任何本机路径或私有环境信息。

## 验收

- ac-1: ChatTaskInfo 导出可选字段 modelLabel?: string 与 modelTitle?: string；当传入非空 modelLabel 时，ChatTaskCard 渲染包含 modelLabel 文本的 .task-meta-chip 徽章，且徽章元素的 title 属性为 modelTitle（未传 modelTitle 时回退为 modelLabel）。
- ac-2: 未传入 modelLabel 或为空白字符串时，ChatTaskCard 不渲染模型徽章，既有 agentLabel、mode、scope、duration、exitCode 等展示与交互保持完全向后兼容。
- ac-3: assistant-sdk/assistant-chat-ui/package.json 的 version 更新为 0.1.16，且包内 typecheck、test、build 全部零退出码通过。
