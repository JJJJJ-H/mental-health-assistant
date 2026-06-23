# Low-Cost Production Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare the mental health assistant for low-cost public delivery on GitHub and Vercel.

**Architecture:** Keep the existing Vite React frontend and Vercel Serverless Functions. Add delivery polish around CI, production verification, README presentation, and deployment checklists without migrating frameworks or adding paid infrastructure.

**Tech Stack:** React 18, Vite, TypeScript, Vitest, ESLint, Vercel Functions, DeepSeek API, GitHub Actions.

---

## File Structure

```text
.github/workflows/ci.yml                     GitHub Actions validation pipeline
README.md                                    public-facing project and deployment guide
docs/deployment/vercel-checklist.md          step-by-step production deployment checklist
docs/superpowers/specs/2026-06-23-*.md       approved design input, read-only
tests/chatApi.test.ts                        health and guardrail regression coverage
api/health.ts                                configuration-safe health response
```

The implementation keeps the runtime architecture unchanged. CI and documentation are the primary changes; tests only lock down existing behavior needed for public delivery.

## Task 1: Add GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create the workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: ["**"]
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Typecheck
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build
```

- [ ] **Step 2: Run the same checks locally**

Run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all commands pass without requiring `DEEPSEEK_API_KEY`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add production validation workflow"
```

## Task 2: Lock Down Public Health And Guardrail Behavior

**Files:**
- Modify: `tests/chatApi.test.ts`
- Review: `api/health.ts`
- Review: `server/safety/guardrails.ts`

- [ ] **Step 1: Add regression tests for public delivery constraints**

Append these tests to the existing `describe("health endpoint", ...)` block or nearby server API tests:

```ts
it("reports unconfigured production safely", () => {
  const result = getHealth({});

  expect(result).toEqual({
    status: "ok",
    configured: false,
    mockAllowed: false
  });
});

it("does not expose extra environment values", () => {
  const result = getHealth({
    DEEPSEEK_API_KEY: "server-secret",
    ALLOW_MOCK_LLM: "false",
    INTERNAL_DEPLOY_TOKEN: "private-token"
  });

  expect(Object.keys(result).sort()).toEqual([
    "configured",
    "mockAllowed",
    "status"
  ]);
  expect(JSON.stringify(result)).not.toContain("private-token");
});
```

- [ ] **Step 2: Run the targeted tests**

Run:

```bash
npm test -- tests/chatApi.test.ts
```

Expected: tests pass. If they fail because the health shape changed, update `api/health.ts` to return only `status`, `configured`, and `mockAllowed`.

- [ ] **Step 3: Commit**

```bash
git add tests/chatApi.test.ts api/health.ts
git commit -m "test: cover production health response"
```

## Task 3: Add Vercel Deployment Checklist

**Files:**
- Create: `docs/deployment/vercel-checklist.md`

- [ ] **Step 1: Create the deployment docs folder and checklist**

Create `docs/deployment/vercel-checklist.md`:

```markdown
# Vercel Production Deployment Checklist

## 1. GitHub

- Create a public GitHub repository.
- Push the current branch.
- Confirm the `CI` workflow passes.

## 2. Vercel Project

- Import the GitHub repository into Vercel.
- Framework preset: Vite.
- Build command: `npm run build`.
- Output directory: `dist`.
- Install command: `npm ci`.

## 3. Environment Variables

| Name | Production value |
| --- | --- |
| `DEEPSEEK_API_KEY` | Your server-side DeepSeek key |
| `ALLOW_MOCK_LLM` | Leave unset or set to `false` |

Never expose `DEEPSEEK_API_KEY` as a Vite variable.

## 4. Verification

Replace `<domain>` with the production Vercel domain:

```bash
curl https://<domain>/api/health
```

Expected:

- HTTP 200.
- `configured` is `true`.
- The response does not contain the API key.

Manual browser checks:

- Open the homepage.
- Ask a normal mental health education question.
- Ask a crisis-risk question such as `我有自残想法怎么办`.
- Confirm the crisis warning is visible.
- Open DevTools Network and confirm no DeepSeek key is sent to the browser.

## 5. Abuse Controls

- Keep request history and message length limits enabled.
- In Vercel, enable available Firewall or Rate Limiting protection for `/api/chat`.
- Do not enable `ALLOW_MOCK_LLM=true` in production.
```

- [ ] **Step 2: Commit**

```bash
git add docs/deployment/vercel-checklist.md
git commit -m "docs: add vercel deployment checklist"
```

## Task 4: Refresh The Public README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a project status block near the top**

Add this block after the opening description:

```markdown
## 在线体验

- Production: `https://<your-vercel-domain>`
- Health Check: `https://<your-vercel-domain>/api/health`
- Deployment Guide: [`docs/deployment/vercel-checklist.md`](docs/deployment/vercel-checklist.md)

> 部署完成前，将 `<your-vercel-domain>` 替换为实际 Vercel Production 域名。
```

- [ ] **Step 2: Add an architecture section**

Add this section before `## 技术栈`:

```markdown
## 架构

```text
Browser
  -> Vercel Static Frontend
  -> /api/chat Vercel Function
  -> RAG Prompt Builder
  -> DeepSeek Streaming API
```

前端只负责展示、SSE 解析和浏览器本地历史；DeepSeek Key、RAG 检索和 Prompt 拼接全部留在服务端。
```

- [ ] **Step 3: Add resume-focused highlights**

Add this section before `## 本地启动`:

```markdown
## 项目亮点

- 使用 SSE 实现大模型回答流式输出，并支持中途停止生成。
- 使用构建期 Markdown 知识库索引实现轻量 RAG 和来源引用。
- 服务端统一处理 Prompt 拼接、危机风险提示和 DeepSeek API Key。
- 对话历史默认保存在浏览器 `localStorage`，降低敏感数据服务端留存风险。
- 使用 Vitest、ESLint、TypeScript 和 GitHub Actions 做基础质量门禁。
```

- [ ] **Step 4: Run docs-adjacent verification**

Run:

```bash
npm run lint
npm run build
```

Expected: both commands pass. README changes should not affect build output except normal generated artifacts.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: refresh public project readme"
```

## Task 5: Final Local Verification

**Files:**
- Review: `package.json`
- Review: `vercel.json`
- Review: `.env.example`

- [ ] **Step 1: Run the full validation suite**

Run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all commands pass.

- [ ] **Step 2: Inspect the final diff**

Run:

```bash
git status --short
git log --oneline -5
```

Expected: only intentional files changed or committed. Existing unrelated local files such as `.playwright-mcp/` must remain outside the delivery commits.

- [ ] **Step 3: Record deployment handoff**

Update the final delivery note to include:

```text
GitHub repository:
Vercel production URL:
Health check URL:
CI status:
```

Do not commit placeholder URLs. Fill these only after the user creates the GitHub and Vercel resources.

## Self-Review

- Spec coverage: CI, Vercel deployment docs, health verification, README presentation, and abuse-control guidance are covered.
- Placeholder scan: URL placeholders are explicitly marked as post-deployment values and must not be committed as final production claims.
- Type consistency: no runtime API shape changes are planned except health tests preserving the existing `status`, `configured`, and `mockAllowed` shape.
