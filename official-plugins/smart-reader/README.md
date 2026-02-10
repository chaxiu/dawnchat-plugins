# Smart Reader 插件架构

本插件提供本地 PDF 结构化读取与 AI 伴读体验，后端基于 FastAPI，前端为 Vue。

## 目录结构

- src/main.py：插件 FastAPI 入口
- src/smart_reader/api：HTTP API 路由
- src/smart_reader/core：配置、会话与索引
- src/smart_reader/services：Embedding 与对话服务
- web-src：插件前端源码（Vite + Vue）
- web：构建产物
- manifest.json：插件元数据

## 后端分层

- api/：/api/library、/api/session、/api/chat
- core/ingestion：PDF 解析与切块
- core/storage：LibraryStore 与 LanceDB 索引
- services：EmbeddingService 与 ChatService

## 前端结构

- components：Workbench、ChatPanel、PdfViewer 等 UI
- composables：useSmartReader 业务状态
- services/api：插件后端 API 调用封装

## 数据流概览

1. 文件导入 → PDF 切块 → 向量化 → LanceDB
2. ChatPanel 使用 SDK 会话连接宿主 WS
3. 后端提供 /api/host/config 返回 ws_url

## 构建

- 前端构建输出到 web/
- FastAPI 在 / 挂载静态资源

