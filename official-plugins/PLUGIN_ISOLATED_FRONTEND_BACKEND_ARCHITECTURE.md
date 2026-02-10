# 插件独立前后端技术方案（简洁版）

## 目标

- 插件可拥有独立前端与独立后端，提升复杂 UI 表达能力
- 插件仍以宿主“下载 → 解压 → 安装依赖 → 启动”的流程运行
- 支持桌面端动态下发与更新（替换更新，无需 diff）
- 尽量把差异控制在插件内部，宿主逻辑保持不变或最小改动

## 设计原则

- 与现有插件体系兼容：继续使用 manifest.json、插件目录结构、Python 依赖隔离
- 前端与后端解耦：前端静态资源与后端 API 通过插件本地端口通信
- 统一运行入口：宿主只感知“插件启动端口 + 入口 URL”
- 最小宿主改动：可用单一启动入口与状态检查完成嵌入

## 插件包结构（建议）

```
<plugin_id>/
├── manifest.json
├── pyproject.toml
├── src/
│   └── main.py
└── web/
    ├── index.html
    ├── assets/
    └── manifest.json
```

说明：
- web 为插件独立前端构建产物（Vite/React/Vue 均可）
- src/main.py 为插件后端入口（FastAPI 或轻量 ASGI/WSGI）
- web/manifest.json 为前端构建信息（版本、构建时间、入口文件，可选）

## 运行形态

### 后端进程（插件内）

- 由宿主 PluginManager 启动并分配端口
- 默认提供两类路由：
  - API：/api/*
  - 静态资源：/ （指向 web/）
- 可复用宿主依赖（system-site-packages）或插件自身依赖

### 前端渲染

- 宿主仍以 iframe 方式嵌入
- iframe URL 指向插件后端端口的 / 页面
- 插件前端通过相对路径访问 /api/*

## 宿主侧最小改动点

1. 插件启动逻辑不变，仍由 PluginManager 启动 Python 进程并等待 ready
2. 插件运行时入口 URL 统一为 http://127.0.0.1:{port}/
3. 插件状态与生命周期不变

如需区分 NiceGUI 与独立前端，仅在 manifest.json 中增加声明字段：

```
{
  "ui": {
    "type": "web",
    "entry": "/"
  }
}
```

宿主仅使用 ui.type 判断入口 URL，避免侵入业务逻辑

## 插件后端实现（参考形态）

- 选用 FastAPI + uvicorn
- 静态资源使用 Starlette StaticFiles
- 提供 /health 或 /ready 供宿主检测

入口 main.py 最简职责：
- 解析宿主传入的 host/port
- 挂载静态 web 目录
- 暴露 /api/*
- 启动服务并打印 ready 信号

## 插件前端实现

- 任意前端框架，构建产物输出到 web/
- basePath 设置为 / 或相对路径
- 与后端通信使用相对路径 /api/*

## 打包与发布

- 插件包仍为 .dawnplugin 或 zip
- 解压后目录结构与现有一致，宿主无需新逻辑
- 更新方式为替换插件目录，覆盖 web/ 与 src/

## 下载与安装流程（统一现有流程）

对齐现有方案（参考在线插件市场架构）：

1. 前端从市场获取下载 URL
2. 后端下载、解压到 Config.PLUGIN_DIR/<plugin_id>
3. UVEnvManager 安装依赖
4. PluginRegistry 重新扫描

差异点仅在插件内部：web/ 作为静态资源被插件后端服务

## 安全与权限

- 插件仍在隔离 venv 中运行
- 前端资源仅由本地插件后端提供
- API 使用宿主提供的 SDK 访问宿主能力（X-Plugin-ID）

## 版本与更新策略

- 插件版本由 manifest.json 或 web/manifest.json 记录
- 更新流程为全量替换，允许回滚旧版本备份（可选）
- 前端与后端版本一致，防止 API 不兼容

## 与现有插件共存

- NiceGUI 插件保持现状
- 独立前后端插件无需改变宿主渲染方式
- 插件类型可并存于官方与用户插件目录

## 最小落地步骤

1. 新建插件模板：FastAPI + StaticFiles + web 构建产物
2. manifest.json 增加 ui.type 与 ui.entry
3. 宿主插件 UI 入口读取 ui.entry 并拼接端口
4. 插件发布包仍走统一下载与安装流程

## Demo：Hello World (Vue)

### 目录结构

```
dawnchat-plugins/official-plugins/hello-world-vue/
├── manifest.json
├── pyproject.toml                 # fastapi / uvicorn 依赖
├── src/
│   └── main.py                    # FastAPI 启动，挂载 StaticFiles('/web')
├── web/                           # 前端构建产物（由 web-src 生成）
└── web-src/                       # Vue 源码（vite 构建到 ../web）
    ├── package.json               # 仅插件内使用的前端依赖
    ├── index.html
    └── src/
        ├── main.js
        ├── App.vue
        ├── styles.css
        └── locales/{zh,en}.json
```

### 运行说明
- 后端：FastAPI 提供 /api/health 与 /api/info，并在 startup 打印 {"status":"ready"} 到 stderr
- 前端：通过 URL 查询参数 theme/lang 与宿主同步，样式变量与 DawnChat 主题一致
- 静态资源：SVG、CSS 均随前端构建打包到 web/

### dev.sh 构建集成
- 在“同步官方插件”前增加前端构建步骤：检测插件目录下是否存在 web-src/package.json，若存在则使用 pnpm 构建到插件内的 web/ 目录
- 构建命令：
  - 进入 web-src 执行 pnpm install --ignore-workspace --no-frozen-lockfile（如未安装）
  - 执行 pnpm exec vite build，将产物输出到 ../web
- 构建失败策略：开发环境打印警告并继续同步，以便继续调试其他插件

### manifest 扩展字段
```
{
  "ui": {
    "type": "web",
    "entry": "/"
  }
}
```

宿主不需要分辨框架类型，只要 iframe 指向 http://127.0.0.1:{port}/ 即可。

### 主题与国际化同步
- 主题：iframe URL 携带 theme=dark|light，前端根据 tokens 设置 CSS 变量，实现与宿主一致的视觉
- 国际化：iframe URL 携带 lang=zh|en，前端从 locales 加载对应文本

### Ready 信号与健康检查
- 插件后端启动时打印 {"status":"ready"} 到 stderr，保持与现有流程一致
- health_check_url 指向 http://127.0.0.1:{port}/，宿主无需修改

### build.sh 与发布流程
- build.sh 在复制官方插件前进行前端构建，确保打包产物包含 web/ 静态资源
- publish_plugins.py 在打包前检测 web/ 是否存在，如缺失则自动构建 web-src
- 发布场景构建失败策略：直接失败中断，避免发布缺失前端资源的插件包
