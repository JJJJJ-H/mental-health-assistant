# 心理健康助手低成本上线交付设计

## 1. 目标

将现有心理健康助手整理成一个可公开访问、可被面试官直接体验、可从 GitHub 复现的轻量企业级项目。上线策略保持低成本：代码托管在 GitHub，生产环境部署到 Vercel，AI 密钥只保存在 Vercel 服务端环境变量中。

交付完成后，项目应具备：

- 公开 GitHub 仓库，README 能说明业务价值、架构、技术亮点、本地启动、部署方式和验收方式。
- 公开 Vercel 访问地址，访客无需注册即可体验对话。
- GitHub Actions 在推送和 Pull Request 时运行测试、类型检查、lint 和生产构建。
- 生产环境有明确的环境变量、健康检查、免责声明、隐私说明和接口滥用防护策略。
- 简历中可以准确描述为：基于 Vite、React、TypeScript、Vercel Functions、SSE、DeepSeek 和本地 RAG 的心理健康科普对话应用。

## 2. 当前基础

项目已经具备主要产品能力：

- Vite + React + TypeScript 前端。
- Vercel Serverless Functions：`/api/chat` 和 `/api/health`。
- DeepSeek SSE 流式输出。
- 构建期 Markdown 知识库索引和 TF-IDF RAG 检索。
- 来源引用、Markdown 渲染、本地历史记录、主题切换、虚拟列表。
- Vitest、typecheck、ESLint、生产构建脚本。
- README 已包含本地启动、知识库更新、环境变量和 Vercel 部署说明。

本次交付不迁移到 Next.js，不引入数据库账号系统，不做复杂用户体系。这样可以避免范围膨胀，把重点放在稳定上线和作品展示。

## 3. 推荐部署架构

生产环境使用一个 Vercel 项目：

```text
Browser
  |
  | HTTPS
  v
Vercel Static Frontend
  |
  | /api/chat, /api/health
  v
Vercel Serverless Functions
  |
  | HTTPS streaming request
  v
DeepSeek API
```

Vercel 构建步骤执行 `npm run build`，该命令会先生成知识库索引，再进行 TypeScript 构建和 Vite 打包。部署产物中包含静态前端、Serverless API 和只读知识库索引。

环境变量：

- `DEEPSEEK_API_KEY`：生产必填，只配置在 Vercel 服务端。
- `ALLOW_MOCK_LLM`：生产环境不配置或设置为 `false`。

## 4. 企业级轻量增强

### 4.1 GitHub Actions

新增 CI 工作流，在 `push` 和 `pull_request` 时运行：

```bash
npm ci
npm test
npm run typecheck
npm run lint
npm run build
```

CI 不读取真实 DeepSeek Key。测试继续使用 mock adapter 或本地 mock 模式，确保仓库对外公开时不会暴露密钥。

### 4.2 生产健康检查

保留 `/api/health`，并在 README 中记录部署后验收命令：

```bash
curl https://<vercel-domain>/api/health
```

健康检查只返回配置状态，不返回任何密钥值。验收标准是接口返回 200，响应中能看出服务已配置真实模型能力或明确处于 mock 状态。

### 4.3 滥用防护

低成本阶段优先采用平台级和应用级组合：

- README 要求在 Vercel 控制台开启基础防护能力，例如 Firewall 或 Rate Limiting。
- 应用继续限制请求历史长度，避免单次请求过大。
- 生产说明中明确不要打开 `ALLOW_MOCK_LLM=true`。
- 可增加轻量请求大小限制和错误提示，避免异常 body 消耗资源。

不在当前阶段引入 Redis、Upstash、登录鉴权或付费限流服务。若后续线上被刷，再把外部限流服务作为二期增强。

### 4.4 README 展示化

README 应新增面向招聘方的内容：

- 在线体验地址。
- 项目截图或动图，图片文件放入 `public/` 或 README 引用的固定文档目录。
- 一段简洁架构说明。
- 核心亮点：SSE、RAG、引用、危机风险提示、隐私本地存储、Vercel Serverless。
- 本地启动、测试、部署、环境变量。
- 安全和隐私说明。

### 4.5 部署验收清单

新增部署清单文档或 README 小节，覆盖：

1. GitHub 新建公开仓库并推送。
2. Vercel 导入仓库。
3. 配置 `DEEPSEEK_API_KEY`。
4. 触发 Production Deployment。
5. 打开首页。
6. 调用 `/api/health`。
7. 发送一条普通心理健康科普问题。
8. 发送一条危机风险相关问题，确认出现安全提示。
9. 确认浏览器 Network 中 Key 没有下发到客户端。

## 5. 非目标

本次不做：

- 用户注册和云端历史同步。
- Supabase 或其他数据库。
- 多租户管理。
- 后台运营系统。
- 医疗诊断能力。
- 专业咨询预约或支付。

这些能力会增加成本和合规风险，不适合当前“低成本简历项目上线”的目标。

## 6. 测试策略

本地和 CI 均运行：

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

上线后手动验收：

- 首页可访问。
- `/api/health` 可访问且不泄露密钥。
- `/api/chat` 能流式返回。
- 来源引用能展示。
- 危机风险输入会出现安全提示。
- 刷新页面后本地历史仍存在。

## 7. 成功标准

- GitHub 仓库公开可读，CI 通过。
- Vercel 生产地址可访问。
- README 能让陌生开发者在 10 分钟内理解、启动和部署项目。
- 面试官打开在线地址可以完成一次真实对话体验。
- 项目说明不会夸大医疗能力，免责声明清晰。
