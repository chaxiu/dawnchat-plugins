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
python scripts/sync_iwp_runtime.py

python scripts/package_plugins.py \
  --release-tag plugins-vlocal-test \
  --base-url https://github.com/chaxiu/dawnchat-plugins/releases/download \
  --output-dir .dist/plugins
```

输出目录默认为 `.dist/plugins`，会包含 `*.dawnchat` 与 `plugins.json`。

### GitHub Actions 自动发布

工作流文件：`.github/workflows/publish-plugins.yml`
版本守卫工作流：`.github/workflows/plugin-version-guard.yml`

触发方式：

- `plugin-version-guard.yml`
  - PR 到 `main`：只做 R2 不可变冲突检查（发现冲突直接阻断合并）
  - `main` 分支 push / 手动触发：若检测到冲突，自动 patch 升版并创建/更新 Bot PR
- 推送 tag：`plugins-v*`
- 手动触发：`workflow_dispatch`（需提供 `release_tag`）
  - `iwp_runtime_release_tag` 与 `iwp_tools_release_tag` 可同时留空或同时填写
  - 两者同时留空时，工作流会使用内置默认值：`v1.0-draft-05` / `v0.1.7`

发布流程会：

1. 扫描 `official-plugins/*/manifest.json`
2. 对 Web 插件自动构建 `web-src`（仅保留运行所需产物）
3. 打包并上传 `*.dawnchat`
4. 上传 `plugins.json` 到同一 Release

### IWP Runtime Pack 同步

- 共享 IWP 资源位于 `.opencode/iwp-runtime/`，由 `.opencode/iwp-runtime.lock.json` 固定校验。
- 本地源码同步（local 模式）：

```bash
python scripts/sync_iwp_runtime.py
```

- Release 资产同步（release 模式）：

```bash
python scripts/sync_iwp_runtime.py \
  --source release \
  --runtime-release-tag v1.0-draft-05 \
  --tools-release-tag v0.1.7 \
  --runtime-version v1.0-draft-05
```

- 仅校验 lock 与 runtime 一致性：

```bash
python scripts/sync_iwp_runtime.py --check
```

- `publish-plugins` 在 `workflow_dispatch` 下会先刷新 runtime 再打包：
  - 若显式传入 `iwp_runtime_release_tag` 与 `iwp_tools_release_tag`，按传入值刷新；
  - 若两者留空，按工作流内置默认值刷新；
  - push tag 场景不自动追踪上游最新 release，仅校验当前仓库 lock。

版本冲突自动化行为：

1. 当同 `plugin_id@version` 产物 hash 与 R2 已存在元数据不一致时，视为不可变冲突
2. 守卫工作流会自动读取冲突列表，对受影响插件执行 patch 升版（同时更新 `manifest.json` 与 `pyproject.toml`）
3. 自动创建/更新 Bot PR，PR 标题包含受影响插件短名列表，便于 reviewer 快速确认
4. `publish-plugins.yml` 发布阶段不回写仓库，只做打包与发布（保持幂等和可审计）

### 最佳实践

- 修改插件后先在本地执行一次 `scripts/package_plugins.py` 验证包结构
- 避免将 `node_modules`、测试缓存和临时文件打进插件包
- 发布 tag 建议使用不可变版本号（例如 `plugins-v2026.02.14-01`）
- 变更 `manifest` 时同步评估 `min_host_version`，避免低版本客户端安装失败
