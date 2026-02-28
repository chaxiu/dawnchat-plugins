# Hello World Vue Plugin

`com.dawnchat.hello-world-vue` 是一个 DawnChat 官方示例插件，用于演示：

- Python 后端能力（FastAPI + DawnChat SDK）
- Vue 前端页面（`web-src`）
- MCP 工具声明与调用
- 插件预览模式联调

## 目录结构

```text
hello-world-vue/
  manifest.json
  pyproject.toml
  src/
    main.py
    mcp.py
  tests/
    test_mcp_async_router.py
  web-src/
    src/App.vue
```

## 开发入口

- 后端入口：`src/main.py`
- MCP 路由：`src/mcp.py`
- 前端入口：`web-src/src/App.vue`
- 工具声明：`manifest.json` 的 `capabilities.tools`

## 常见修改范式

1. 新增一个工具
   - 在 `manifest.json` 增加 tool 元信息
   - 在 `src/main.py` 增加 handler 并注册到 `tool_handlers`
   - 在前端增加调用入口（如果需要）
2. 修改前端样式或交互
   - 只改 `web-src/src/*`
   - 保持 API 路由与返回结构兼容
3. 修改后端 API
   - 优先新增路由，不破坏现有 `/api/sdk/*` 示例接口

## 本地验证

- 后端测试：`pytest tests/ -v`
- 前端构建：在 `web-src` 执行 `pnpm build`
- 预览验证：进入 DawnChat 插件预览模式，确认页面可访问和工具调用成功

## 注意事项

- 该插件是教学示例，优先可读性和稳定性。
- 请保持前后端接口字段清晰，不引入隐式行为。
- 变更后需确认 `manifest.json` 与实现一致。
