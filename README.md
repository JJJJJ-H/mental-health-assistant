# 心理健康小助手

一个从零实现的心理健康科普 AI 对话项目。它使用 DeepSeek、SSE 流式输出和内置 RAG 知识库，为用户提供可追溯来源的对话式科普信息。

> 本项目仅用于心理健康科普和工程实践，不能替代专业诊断、心理咨询或医疗治疗。若存在伤害自己或他人的紧急风险，请立即联系当地急救服务、前往附近医疗机构急诊，或请可信赖的亲友陪伴并协助联系专业机构。

## 功能

- 游客打开网页即可使用，无需注册。
- DeepSeek 多轮对话，密钥仅保存在服务端。
- SSE 流式回答，支持中途停止生成。
- 内置 Markdown 科普知识库和构建期 TF-IDF 索引。
- RAG 检索、Prompt 拼接、正文 `[1]` 引用和来源高亮。
- Markdown、GFM 和代码高亮。
- `localStorage` 历史记录持久化、搜索、删除和清空。
- 浅色、深色和跟随系统主题。
- `react-virtualized` 长列表渲染、Vite 分包和引用面板懒加载。
- Vercel Serverless Functions 部署。

## 技术栈

React 18、Vite、TypeScript、Vercel Functions、SSE、ReactMarkdown、highlight.js、react-virtualized、localStorage、Vitest。

## 本地启动

```bash
npm install
copy .env.example .env.local
npm run dev
```

前端默认运行在 `http://localhost:5173`。

### Windows PowerShell 开发环境

Windows PowerShell 5 下建议先运行：

```powershell
. .\scripts\Initialize-DevShell.ps1
.\scripts\Test-DevShell.ps1
```

初始化脚本会统一 `Path`、UTF-8 代码页和 PowerShell 文件编码，并优先使用用户目录中安装的官方 ripgrep。验证脚本会检查 Git、Node、ripgrep、UTF-8 和 `Start-Process`。

如需联调完整 Serverless API，请安装 Vercel CLI 后执行：

```bash
npx vercel dev
```

## 环境变量

```env
DEEPSEEK_API_KEY=your_server_side_key
ALLOW_MOCK_LLM=false
```

- `DEEPSEEK_API_KEY`：正式环境必填，只能配置在服务端。
- `ALLOW_MOCK_LLM`：仅用于本地联调。显式设置为 `true` 时，没有 Key 也会返回固定演示文本。
- 正式部署不要开启 Mock 模式，避免把演示结果误认为真实模型回答。

## 更新知识库

内置资料位于 `knowledge/*.md`，每篇使用以下 front matter：

```md
---
id: stable-id
title: 文档标题
source: 来源说明
---

正文
```

更新文档后执行：

```bash
npm run build:index
```

生成的只读索引位于 `server/rag/index.generated.ts`。部署构建也会自动重新生成索引。

## 验证

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## 部署到 Vercel

1. 将仓库推送到自己的 GitHub。
2. 在 Vercel 中导入仓库。
3. 在 Vercel 项目环境变量中配置 `DEEPSEEK_API_KEY`。
4. 确保生产环境没有将 `ALLOW_MOCK_LLM` 设置为 `true`。
5. 为公开匿名接口配置 Vercel Firewall Rate Limiting 或外部限流服务，避免 API 额度被滥用。
6. 触发部署，Vercel 会构建前端并提供 `/api/chat` 和 `/api/health`。

## 隐私说明

- 对话历史默认只保存在用户浏览器的 `localStorage` 中。
- 服务端 API 不应记录完整心理健康对话内容。
- DeepSeek Key 不会发送到浏览器，也不应提交进 Git。

## 目录概览

```text
api/          Vercel Serverless API
knowledge/    内置 Markdown 科普资料
scripts/      构建期知识索引生成
server/       RAG、Prompt、安全层和模型适配
src/          React 页面、Context 和浏览器服务
tests/        自动化测试
```
