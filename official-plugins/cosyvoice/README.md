# CosyVoice 插件版本管理与同步

## 目录结构
- src/cosyvoice: 指向你的 CosyVoice fork 的子模块
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
dawnchat-plugins/official-plugins/cosyvoice/scripts/upstream-sync.sh
```

行为：
- 拉取 upstream 与 origin，合并到 main
- 递归初始化子模块
- 将更新推送到你的 fork

本仓不再使用 local_overrides/patches 机制，统一在 fork 维护所有改动。

## 基于指定提交生成本地改动分支
```bash
bash dawnchat-plugins/official-plugins/cosyvoice/scripts/apply-local-diff.sh 55e3e370a0ac30c3c4ca461aec4e9583f5bd4713 my-local-sync
```
行为：
- 检出到指定提交
- 创建分支 my-local-sync
- 将 src/local_overrides/cosyvoice 的改动覆盖到 fork 子模块工作区
- 提交并推送到你的 fork

## 典型工作流
1. 在你的 CosyVoice fork 修改并提交
2. 合并/重放 upstream 改动到 fork
3. 在本仓运行 upstream-sync.sh 拉取最新 fork 版本（递归）
