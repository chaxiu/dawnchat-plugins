# ComfyUI 插件版本管理与同步

## 目录结构
- src/comfyui: 指向你的 ComfyUI fork 的子模块
- src/comfyui/custom_nodes/comfyui-inpaint-nodes: 在 fork 仓库中作为嵌套子模块管理
- scripts/upstream-sync.sh: 同步上游到 fork 并拉取递归子模块

## 子模块初始化
```bash
git submodule update --init --recursive
```

## 代理配置
```bash
export https_proxy=http://127.0.0.1:7890
export http_proxy=http://127.0.0.1:7890
export all_proxy=socks5://127.0.0.1:7890
```

## 同步上游
```bash
dawnchat-plugins/official-plugins/comfyui/scripts/upstream-sync.sh
```

行为：
- 拉取 upstream 与 origin，合并到 master
- 递归初始化子模块（包含 custom_nodes）
- 将更新推送到你的 fork

## 管理 custom_nodes
在你的 ComfyUI fork 仓库内使用嵌套子模块管理：
- 路径：custom_nodes/comfyui-inpaint-nodes
- 指向你的 comfyui-inpaint-nodes fork
- 与 ComfyUI 一起递归拉取与更新

## 基于指定提交生成本地改动分支
当你要以指定提交为基底，合入本地修改并形成一个用于审阅的分支：
```bash
# 以你给出的提交为例
bash dawnchat-plugins/official-plugins/comfyui/scripts/apply-local-diff.sh c176b214cc768d41892add4d4f51c5c5627cbf7b my-local-sync
```
行为：
- 检出到指定提交
- 创建分支 my-local-sync
- 将 src/local_overrides/comfyui 的改动覆盖到 fork 子模块工作区（排除 custom_nodes/comfyui-inpaint-nodes 子模块本体）
- 提交并推送到你的 fork

## 推荐工作流
1. 在你的 ComfyUI fork 修改并提交
2. 在 fork 中维护 custom_nodes 的嵌套子模块
3. 合并/重放 upstream 改动到 fork
4. 在本仓运行 upstream-sync.sh 拉取最新 fork 版本（递归）

本仓不再使用 local_overrides/patches 机制，统一在 fork 维护所有改动。
