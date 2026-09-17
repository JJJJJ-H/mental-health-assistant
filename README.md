# MewHelp — 电商智能客服

基于 FastAPI + LangGraph 的电商智能客服，前端为 React/Vite 聊天壳。支持查订单物流、答政策 FAQ（RAG 引用）、退款/工单子流程、工具调用与中断续跑。

> 本仓库为课程与工程演示系统，订单与退款结果均为测试数据，**不构成真实业务承诺**。

旧版「心理健康小助手」（DeepSeek + Vercel Serverless + TF-IDF RAG）已归档为 Git 标签 `archive/mental-health`，当前 `main` 仅为本智能客服 monorepo。

## 功能

- 游客可用：浏览器生成并持久化 `user_id`，会话落在服务端 MySQL
- SSE 流式对话：工具徽章、正文流式输出、引用 `[n]`、动作按钮
- Agent：LangGraph 分流 + ReAct；物流/售后经 MCP；FAQ 走混合检索 + 重排
- 中断续跑：选订单、确认工单（`/api/actions/resume`）
- 动作：转人工（前端模拟）、建工单、退款表单
- 管理页（后端静态）：知识库、飞轮待审、观测成本、主题分布、分类器验收等

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18、Vite、TypeScript、ReactMarkdown、react-virtualized |
| 后端 | FastAPI、LangGraph / LangChain、SQLAlchemy、SSE |
| 数据 | MySQL、Milvus（向量）、可选 Langfuse |
| 工具 | 内置 `@tool` + 独立 MCP（物流 `:8101`、售后 `:8102`） |
| 模型 | 聊天 / 嵌入 / 重排三组上游直连（默认硅基流动） |

## 目录

```
app/            FastAPI 入口、LangGraph、RAG、工具、静态管理页
mcp_servers/    物流 / 售后 MCP 进程
web/            React 聊天前端（对接 /api/chat SSE）
sql/            建表与迁移（compose 首启自动执行）
scripts/        建库、评估、微调等离线脚本
tests/          后端单测
data/kb/        内置 Markdown 知识库原文
docs/           各章 spec / plan
```

## 本地启动

### 前置

- [uv](https://github.com/astral-sh/uv)
- Docker（Compose）
- Node.js 18+（仅前端）
- make（Windows 可用 Git Bash / WSL，或对照 `Makefile` 手跑命令）

内存建议 ≥ 8G。

### 1. 后端依赖与环境变量

```bash
uv sync
cp .env.example .env
```

至少填写（可三组共用同一 Key）：

```bash
CHAT_API_KEY=...
EMBED_API_KEY=...
RERANK_API_KEY=...
```

默认模型与地址见 `.env.example`（硅基流动 DeepSeek / bge-m3 / bge-reranker）。换成 DeepSeek 官方示例：

```bash
CHAT_BASE_URL=https://api.deepseek.com/v1
CHAT_MODEL=deepseek-v4-flash
```

请保持 `CHAT_THINKING=disabled`，否则流式与多步 Agent 会明显变慢。

### 2. 起基础设施并灌数

```bash
docker compose up -d   # MySQL + Milvus 等
make seed              # 业务测试数据
```

### 3. 起应用与 MCP

```bash
make dev
```

- 应用：http://localhost:8000 （含原版静态聊天页与 `/admin` 等）
- MCP：`:8101` 物流、`:8102` 售后

验收：在 8000 页问「订单 1001 的物流到哪了」，应出现工具调用标记（如 `query_order`、`query_logistics`）。

### 4. React 前端壳

```bash
cd web
npm install
npm run dev
```

打开 http://localhost:5173 。开发时 Vite 将 `/api` 代理到 `http://127.0.0.1:8000`。

## 前后端如何对接

| 项 | 约定 |
|---|---|
| 发消息 | `POST /api/chat`，body：`{ user_id, message, conversation_id? }` |
| 流式帧 | `delta` / `tool` / `citations` / `actions` / `interrupt` / `done` |
| 续跑 | `POST /api/actions/resume`（`order_id` 或 `confirmed`） |
| 会话列表 | `GET /api/conversations?user_id=` |
| 历史消息 | `GET /api/conversations/{id}/messages` |

前端核心：`web/src/services/chatApi.ts`、`sseParser.ts`、`context/ChatContext.tsx`。

## 生产部署建议

不要把 MySQL / Milvus / LangGraph 塞进 Vercel Serverless。

1. **后端**：云主机 Docker Compose 跑 API + MySQL + Milvus + MCP；配置 `.env` 密钥
2. **前端**：`cd web && npm run build`，静态资源部署到 Vercel（或任意静态托管）
3. 构建时设置 `VITE_API_BASE=https://你的后端域名`（无尾斜杠）
4. 后端 CORS 已允许本地 `5173` 与 `*.vercel.app`；自定义域名请改 `app/main.py`
5. Vercel 项目根目录指向 `web/`，使用仓库内 `web/vercel.json`（纯静态，无 Serverless 聊天）

管理后台仍由后端提供：`https://后端/admin`、`/kb`、`/review` 等。

## 知识库

内置文档在 `data/kb/*.md`。更新后常见流程：

```bash
make kb-build
make kb-vectorize
```

录入与检索自测也可用 http://localhost:8000/kb 。

## 验证

```bash
make test                 # 后端单测（不打真实模型）
cd web && npm run typecheck
cd web && npm run build
```

更多验收命令见 `make help` 与 `DEPLOY.md`。

## 常用端口

| 端口 | 服务 |
|---|---|
| 5173 | React 开发服务器 |
| 8000 | FastAPI |
| 8101 / 8102 | 物流 / 售后 MCP |
| 8110 | 主题分类器（可选） |
| 3000 | Langfuse（可选） |
| 19530 | Milvus |

## 隐私与安全

- 对话保存在服务端数据库；前端仅持久化 `user_id`、主题等偏好
- API Key 只放服务端 `.env`，勿提交进 Git
- 公开部署请加限流，避免额度被刷

## License

以仓库根目录 `LICENSE` 为准（若缺失则沿用上游 MIT 约定）。
