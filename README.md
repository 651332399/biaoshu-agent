# 标书制作智能体前端

这是标书制作智能体的 React/Vite 工作台。当前有两种模式：

前端只保留真实后端接线模式：通过 `/api` 接入 `engine/app` FastAPI 服务，支持真实上传招标文件、消费 SSE 事件、查看 requirements artifact、人工确认并继续生成占位大纲/草稿/合规报告/docx。

## 运行

```bash
cd ../engine
uv run uvicorn app.main:app --reload --port 8000

cd ../biaoshu-agent
npm ci
npm run dev
```

浏览器打开 `http://localhost:3000/` 进入真实后端接线模式。

## 验证

```bash
npm run lint
npm test
npm run build
```

## 当前边界

- `Live` 模式的第一条真实通路是上传 → ingest/analyze → requirements → 确认①。
- outline/generate/compliance/export 已按同一事件协议提供可运行占位产物，用于前端联调；正式质量仍依赖后续 P2-P4 引擎节点替换。
- 浏览器端 `exportDocx.ts` 保留为草稿预览；服务端产物存在时优先下载 `bid.docx`。
