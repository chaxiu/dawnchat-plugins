# DawnChat Plugin SDK

面向 DawnChat 插件开发的统一 SDK，包含 Python 后端能力封装与 Vue 前端 UI 组件库。

## 架构概览

### Python SDK（PyPI：`dawnchat-sdk`）

- 核心能力：Host API 客户端、工具调用、AI/存储等能力封装
- 代码路径：`dawnchat-plugins/sdk/dawnchat_sdk/`
- 运行环境：插件进程 Python 3.11+

### Vue SDK（NPM：建议独立包，例如 `@dawnchat/sdk`）

- 核心能力：Chat UI 组件、会话管理、ZMP v2 WebSocket 连接、存储适配
- 代码路径：`dawnchat-plugins/sdk/dawnchat_sdk/ui/vue`
- 运行环境：插件前端（Vite/Vue）

Python SDK 与 Vue SDK 需要独立发布：

- PyPI 只承载 Python 代码与类型
- NPM 承载 Vue 组件与 TypeScript 代码

## 安装与使用

### Python SDK

```bash
pip install dawnchat-sdk
```

```python
from dawnchat_sdk import BasePlugin, host

class MyPlugin(BasePlugin):
    async def on_start(self):
        pass
```

### Vue SDK

建议将 Vue SDK 作为独立包发布到 NPM，例如：

```bash
pnpm add @dawnchat/sdk
```

```ts
import { ChatRoot, MessageComposer, useChatSession } from '@dawnchat/sdk/ui/vue'
```

## 本地开发（源码依赖）

### Python 插件开发

插件运行时会通过插件环境自动安装本地 SDK，但 IDE 静态分析仍需要额外配置：

- 在仓库根目录使用 `pyrightconfig.json` 的 `extraPaths` 指向 `dawnchat-plugins/sdk`
- 插件虚拟环境中使用可编辑安装：`pip install -e ../../dawnchat-plugins/sdk`

### Vue 插件开发

在插件 `web-src` 下添加 `tsconfig.json`，配置 `paths` 指向仓库内 SDK 源码：

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@dawnchat/sdk/ui/vue": ["../../../dawnchat-plugins/sdk/dawnchat_sdk/ui/vue"]
    }
  }
}
```

## 发布流程（Python SDK）

### 1. 账号与权限准备

- 注册 PyPI 账号：https://pypi.org/account/register/
- 启用 2FA
- 创建 API Token（建议项目级别 token）

### 2. 版本更新

- 修改 `dawnchat-plugins/sdk/pyproject.toml` 的 `version`
- 更新 `dawnchat-plugins/sdk/README.md`（必要时）

### 3. 构建与发布

推荐使用跨平台脚本：

```bash
python scripts/publish_sdk.py
```

发布到 TestPyPI：

```bash
python scripts/publish_sdk.py --test
```

使用 Token 发布：

```bash
PYPI_TOKEN=xxxxx python scripts/publish_sdk.py
```

如果只构建不上传：

```bash
python scripts/publish_sdk.py --build-only
```

macOS/Linux 可使用 Bash 脚本：

```bash
./scripts/publish_sdk.sh --token xxxxx
```

### 4. 验证发布

- TestPyPI: https://test.pypi.org/project/dawnchat-sdk/
- PyPI: https://pypi.org/project/dawnchat-sdk/

## 发布流程（Vue SDK）

建议将 `dawnchat-plugins/sdk` 作为独立 NPM 包发布：

1. 更新 `dawnchat-plugins/sdk/package.json` 的 `version`
2. 执行 `pnpm publish --access public`（如果使用 scope 包）

## 文档

查看 [ZenMind_Plugin_Platform_Architecture_v7](../../docs/v4/ZenMind_Plugin_Platform_Architecture_v7.md) 获取完整架构说明。

## License

MIT
