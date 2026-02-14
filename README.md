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

## 插件发布与打包

### 打包产物

- 每个官方插件会打包为一个 `.dawnchat` 文件（zip 格式容器）
- 发布时会生成 `plugins.json` 清单，包含：
  - 插件基础信息（`id`、`name`、`version`、`min_host_version` 等）
  - 安装包下载地址与校验信息（`package.url`、`package.sha256`、`package.size`）
  - 对应 `manifest` 内容

### 本地打包（调试）

在仓库根目录执行：

```bash
python scripts/package_plugins.py \
  --release-tag plugins-vlocal-test \
  --base-url https://github.com/chaxiu/dawnchat-plugins/releases/download \
  --output-dir .dist/plugins
```

输出目录默认为 `.dist/plugins`，会包含 `*.dawnchat` 与 `plugins.json`。

### GitHub Actions 自动发布

工作流文件：`.github/workflows/publish-plugins.yml`

触发方式：

- 推送 tag：`plugins-v*`
- 手动触发：`workflow_dispatch`（需提供 `release_tag`）

发布流程会：

1. 扫描 `official-plugins/*/manifest.json`
2. 对 Web 插件自动构建 `web-src`（仅保留运行所需产物）
3. 打包并上传 `*.dawnchat`
4. 上传 `plugins.json` 到同一 Release

### 最佳实践

- 修改插件后先在本地执行一次 `scripts/package_plugins.py` 验证包结构
- 避免将 `node_modules`、测试缓存和临时文件打进插件包
- 发布 tag 建议使用不可变版本号（例如 `plugins-v2026.02.14-01`）
- 变更 `manifest` 时同步评估 `min_host_version`，避免低版本客户端安装失败
