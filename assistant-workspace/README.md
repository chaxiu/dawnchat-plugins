# @dawnchat/assistant-workspace

`assistant-workspace` 是 DawnChat Assistant 相关前端源码的**统一开发工作区**。它把 assistant SDK 包与官方 assistant 模板放到同一个 Bun workspace 里，方便在本地同时开发、联调、验证和构建。

它的定位更接近：

- SDK 与模板的源码集成层
- `workspace:*` 依赖的解析入口
- Assistant 相关变更的统一验证入口

它**不是**：

- 用户插件最终运行目录
- DawnChat 主前端 `apps/frontend` 的替代品
- Tauri / Python 宿主运行时本身

## 它包含什么

当前 workspace 主要纳入两类内容：

1. Assistant SDK 包

- `../assistant-sdk/assistant-core`
- `../assistant-sdk/host-orchestration-sdk`
- `../assistant-sdk/assistant-app-sdk`
- `../assistant-sdk/assistant-chat-ui`

2. 官方 Assistant 模板

- `../official-plugins/desktop-ai-assistant/_ir/frontend/web-src`
- `../official-plugins/web-ai-assistant/web-src`
- `../official-plugins/mobile-ai-assistant/web-src`

## 它解决什么问题

Assistant 相关开发里，很多包之间是 `workspace:*` 依赖关系。

例如：

- desktop assistant 模板依赖 `assistant-core`
- 宿主编排能力依赖 `host-orchestration-sdk`
- 无框架会话层依赖 `assistant-app-sdk`
- 聊天 UI 依赖 `assistant-chat-ui`

如果没有这个 workspace，本地修改某个 SDK 后，很难立即让模板以源码依赖的方式消费到最新实现，也不方便做一体化验证。

## 常用命令

在 `dawnchat-plugins/assistant-workspace` 目录下执行：

```bash
bun install
```

### SDK 构建与验证

```bash
bun run build:sdk
bun run verify:sdk
```

说明：

- `build:sdk` 会构建 assistant SDK 的 `dist/`
- `verify:sdk` 会串行执行各 SDK 的 `typecheck + test + build`

### 官方模板构建与验证

```bash
bun run build:templates
bun run verify:templates
```

说明：

- `build:templates` 会先处理模板依赖链接，再构建 desktop / web / mobile assistant 模板
- `verify:templates` 会先验证 SDK，再验证模板

### 单模板开发

```bash
bun run template:desktop:dev
bun run template:web:dev
bun run template:mobile:dev
```

### 单模板校验

```bash
bun run --filter desktop-ai-assistant-vue-web verify
bun run --filter web-ai-assistant-vue-web verify
bun run --filter mobile-ai-assistant-ionic-web verify
```

## 开发时的常见注意事项

### 1. 这里是源码工作区，不是最终发布形态

模板和 SDK 在这里通常保留 `workspace:*` 依赖，便于本地联调。

真正发布到插件运行目录时，DawnChat 脚手架/运行链路会把这些依赖重写为可落地的形式，不应该把 `assistant-workspace` 误当成最终用户环境。

### 2. 修改 SDK 后，不能只改 `src/`

Assistant 相关包很多下游会通过 `package.json` 的 `exports` / `types` 消费 `dist/` 产物，而不是直接吃 `src/`。

这意味着：

- 改了 `assistant-core` / `host-orchestration-sdk` / `assistant-app-sdk` / `assistant-chat-ui` 的源码后
- 不能只看源码通过
- 必须至少执行对应包的 `build`，或直接执行 `bun run build:sdk` / `bun run verify:sdk`

否则常见现象是：

- TypeScript 仍读取旧声明
- 模板 `typecheck` 报 “没有导出某个类型/常量”
- 运行时代码已经是新的，但 `d.ts` 还是旧的，导致表面很诡异的错位

### 3. 优先在 workspace 里验证模板

如果改动涉及：

- `assistant-core`
- `host-orchestration-sdk`
- 官方 assistant 模板

推荐的最小验证顺序是：

```bash
bun run --filter @dawnchat/host-orchestration-sdk build
bun run --filter desktop-ai-assistant-vue-web verify
```

或直接：

```bash
bun run verify:templates
```

原因是模板很多错误不会在单个 SDK 包里暴露，而会在模板真实消费 `workspace:*` 依赖时暴露。

### 4. `bun install` 要在这个目录执行

因为这里才是 Bun workspace 根目录。

如果你新增了：

- 某个 SDK 依赖
- 某个模板依赖

需要回到这里执行：

```bash
bun install
```

否则模板或 SDK 可能出现：

- 找不到 workspace 包
- 找不到新增 npm 依赖
- `vue-tsc` / `vitest` / `vite` 在模板目录里解析失败

### 5. Windows 需要关注模板依赖链接脚本

`scripts/link-template-vite-modules.mjs` 是一个模板依赖链接辅助脚本，主要为 Windows 下的模块解析准备。

对应命令：

```bash
bun run link:template-vite-modules
```

脚本作用：

- 从 `assistant-workspace/node_modules` 收集模板声明过的依赖
- 将这些依赖按模板需要链接到各模板自己的 `node_modules`

在 macOS / Linux 下它通常会直接跳过；在 Windows 下则很重要，否则模板 dev/build 可能因为 Vite / Rollup 解析不到依赖而失败。

### 6. 模板测试失败，不一定是你刚改的代码坏了

官方模板里的部分测试，本质上是在校验它们与 `assistant-core` 当前输出是否一致。

所以当你修改了：

- view registry
- runtime capability 描述
- workspace contract
- host bridge 类型

可能出现的情况是：

- SDK 代码本身没错
- 模板测试断言过期了

这时应该先判断：

- 是实现真的回归了
- 还是模板快照/断言需要同步到新的 core 行为

不要机械地把所有失败都归因到运行时代码。

### 7. 改 host bridge / assistant-client 协议时，要做“协议 + 模板 + 宿主”三边联查

如果你改的是：

- `host-orchestration-sdk/assistant-client`
- runtime event
- host invoke / iframe postMessage 协议

建议至少检查三处：

1. SDK 的 `dist` 是否已重建
2. assistant 模板是否能通过 `verify`
3. 宿主侧调用方是否同步更新

这是 assistant 相关开发里最容易出现“源码改了，但消费方还在用旧契约”的区域。

### 8. 先用 workspace 验证，再回到宿主工程联调

一个比较稳妥的顺序是：

1. 在 `assistant-workspace` 内通过 SDK / 模板验证
2. 再回到 DawnChat 主工程验证 `apps/frontend`、`apps/desktop/src-tauri`、`packages/backend-kernel`

这样能把问题更快分层：

- 是 SDK/模板自身问题
- 还是 DawnChat 宿主接线问题

## 推荐工作流

### 场景一：修改 assistant SDK

```bash
bun install
bun run --filter @dawnchat/assistant-core test
bun run build:sdk
bun run --filter desktop-ai-assistant-vue-web verify
```

### 场景二：修改 desktop assistant 模板

```bash
bun install
bun run --filter desktop-ai-assistant-vue-web test:unit
bun run --filter desktop-ai-assistant-vue-web verify
```

### 场景三：修改 assistant-client / host 协议

```bash
bun install
bun run --filter @dawnchat/host-orchestration-sdk build
bun run --filter @dawnchat/host-orchestration-sdk test
bun run --filter desktop-ai-assistant-vue-web verify
```

## 与主工程的关系

需要特别注意：

- `assistant-workspace` 主要负责 Assistant SDK 与官方模板源码层的开发和验证
- DawnChat 主工程中的宿主前端、Tauri、Python backend 仍在各自目录中开发

典型分工：

- `assistant-workspace`：SDK / 模板源码联调
- `apps/frontend`：宿主前端接线与产品层逻辑
- `apps/desktop/src-tauri`：桌面宿主原生能力
- `packages/backend-kernel`：后端控制面与服务

## 什么时候应该优先看这里

遇到下面这些问题时，优先检查 `assistant-workspace`：

- 某个 assistant SDK 类型导出“明明写了却找不到”
- official assistant 模板 `vue-tsc` / `vitest` / `vite build` 失败
- 修改 `assistant-core` 后，模板行为没更新
- 新增 `workspace:*` 依赖后模板找不到包
- host bridge / assistant-client 协议改动后，模板与宿主出现类型不一致

## 相关目录

- `../assistant-sdk/*`：assistant SDK 包源码
- `../official-plugins/*/web-src`：官方 assistant 模板源码
- `./scripts/link-template-vite-modules.mjs`：Windows 模板依赖链接辅助脚本

## 一句话总结

如果你在做 DawnChat Assistant 相关开发，把这里当成：

- **SDK 与模板的一体化源码工作区**
- **`workspace:*` 依赖的真实验证入口**
- **assistant 相关改动的第一道集成校验层**

通常是最合适的。
