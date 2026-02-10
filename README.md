# DawnChat Plugins

该仓库承载 DawnChat 插件体系的官方插件、SDK 与共享 UI/协议库。

## 目录结构

- official-plugins：官方插件集合
- sdk：插件 SDK（Python 与前端 UI）
- shared-protocol：跨端协议与消息模型
- shared-ui：可复用的 Vue 消息组件

## Git 子模块

- ComfyUI、VibeVoice、CosyVoice 通过 submodule 引入，并固定到本地同步分支
- ComfyUI 自定义节点使用 custom_nodes/comfyui-inpaint-nodes 子模块

## 忽略规则

- local_overrides 目录不参与版本控制
- node_modules、__pycache__ 等缓存目录已统一忽略

## 开发说明

- 克隆后执行 submodule 初始化
- 修改插件前先确认子模块分支为 local-sync-20260209b
