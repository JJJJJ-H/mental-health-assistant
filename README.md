# MewHelp — 电商智能客服

FastAPI + LangGraph 后端，React/Vite 前端壳。查订单物流、答政策 FAQ、退款/工单子流程、RAG 引用。

> 演示系统，测试数据不构成真实业务承诺。

## 结构

| 路径 | 内容 |
|---|---|
| `app/` | FastAPI、LangGraph、RAG、工具 |
| `mcp_servers/` | 物流 / 售后 MCP |
| `web/` | React 聊天前端（对接 `/api/chat` SSE） |
| `sql/` | 建表 |
| `scripts/` | 离线脚本 |

## 后端

```bash
cp .env.example .env
docker compose up -d
make seed
make dev
```

应用 `http://localhost:8000`（含静态管理页）。

## 前端

```bash
cd web
npm install
npm run dev
```

`http://localhost:5173`，Vite 代理 `/api` → `:8000`。

生产构建：`cd web && npm run build`。部署静态资源到 Vercel 时设置 `VITE_API_BASE` 为后端域名，后端已开 CORS。

## 环境变量

见 `.env.example`：`CHAT_*` / `EMBED_*` / `RERANK_*`。

## 验证

```bash
make test
cd web && npm run typecheck
```
