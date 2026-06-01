# Mental Health Assistant MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an original, deployable mental health AI assistant with Vercel Serverless APIs, DeepSeek SSE streaming, built-in RAG citations, and a React guest chat experience.

**Architecture:** A Vite React frontend calls TypeScript Vercel Functions under `/api`. The chat function validates bounded history, retrieves from a generated read-only TF-IDF index, constructs a safety-aware prompt, and proxies DeepSeek output through a stable named-event SSE protocol. The browser parses the stream, persists sessions in `localStorage`, and renders virtualized Markdown messages with citation panels.

**Tech Stack:** React 18, Vite, TypeScript, Vitest, Testing Library, Vercel Functions, SSE, ReactMarkdown, remark-gfm, rehype-highlight, highlight.js, react-virtualized, localStorage

---

## File Map

```text
package.json                     scripts and dependencies
vite.config.ts                   frontend build and vendor chunking
vercel.json                      Vercel SPA routing and function config
api/chat.ts                      POST streaming chat endpoint
api/health.ts                    GET configuration health endpoint
knowledge/*.md                   curated educational source documents
scripts/build-knowledge-index.ts deterministic index generator
server/rag/index.generated.ts    generated read-only TF-IDF index
server/rag/retriever.ts          runtime cosine-similarity retrieval
server/prompt/buildPrompt.ts     safety-aware RAG prompt construction
server/safety/guardrails.ts      schema validation and crisis detection
server/llm/deepseek.ts           real and explicit mock LLM stream adapters
server/stream/sse.ts             named SSE event serialization
src/context/ChatContext.tsx      session, generation, theme, sidebar state
src/services/chatApi.ts          browser stream request and abort support
src/services/sseParser.ts        split-frame-safe SSE parser
src/services/storage.ts          versioned localStorage persistence
src/components/*                 sidebar, composer, messages, citations
src/styles/*                     responsive themes and component styles
tests/*                          unit and component behavior tests
README.md                        setup, knowledge update, and deploy guide
```

## Task 1: Bootstrap The TypeScript Workspace

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `vercel.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/vite-env.d.ts`
- Create: `tests/setup.ts`

- [ ] **Step 1: Create workspace configuration**

Define scripts:

```json
{
  "dev": "vite",
  "build:index": "tsx scripts/build-knowledge-index.ts",
  "build": "npm run build:index && tsc -b && vite build",
  "typecheck": "tsc -b --pretty false",
  "test": "vitest run",
  "test:watch": "vitest",
  "lint": "eslint ."
}
```

Use React 18, `react-markdown`, `remark-gfm`, `rehype-highlight`, `highlight.js`, and `react-virtualized`. Add Vite, TypeScript, Vitest, Testing Library, ESLint, `tsx`, Node types, and React types as development dependencies.

- [ ] **Step 2: Configure Vite and Vercel**

Configure `vite.config.ts` with React, Vitest `jsdom`, `tests/setup.ts`, and vendor chunks for React, Markdown, and virtualization libraries. Configure `vercel.json` so SPA routes fall back to `index.html` while `/api/*` stays handled by functions.

- [ ] **Step 3: Install dependencies**

Run: `npm install`

Expected: dependencies install and `package-lock.json` is created.

- [ ] **Step 4: Verify the empty shell**

Run: `npm run typecheck`

Expected: exit code `0`.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: bootstrap TypeScript workspace"
```

## Task 2: Build The Curated Knowledge Index

**Files:**
- Create: `knowledge/sleep-hygiene.md`
- Create: `knowledge/anxiety-basics.md`
- Create: `knowledge/stress-management.md`
- Create: `knowledge/help-seeking.md`
- Create: `scripts/build-knowledge-index.ts`
- Create: `server/rag/types.ts`
- Create: `server/rag/index.generated.ts`
- Create: `tests/buildKnowledgeIndex.test.ts`

- [ ] **Step 1: Write failing index-generator tests**

Test exported pure helpers:

```ts
expect(parseKnowledgeDocument(source).meta.id).toBe("sleep-hygiene");
expect(chunkText("a".repeat(700), 320, 40).length).toBeGreaterThan(1);
expect(tokenize("睡眠 sleep")).toContain("睡眠");
expect(buildIndex([doc])).toMatchObject({ documents: expect.any(Array), chunks: expect.any(Array) });
```

- [ ] **Step 2: Verify the tests fail**

Run: `npm test -- tests/buildKnowledgeIndex.test.ts`

Expected: FAIL because `scripts/build-knowledge-index.ts` does not exist.

- [ ] **Step 3: Implement deterministic index generation**

Use Markdown front matter with `id`, `title`, and `source`. Export `parseKnowledgeDocument`, `chunkText`, `tokenize`, and `buildIndex` for tests. Make the CLI read `knowledge/*.md`, sort by path, and write a deterministic `server/rag/index.generated.ts`.

- [ ] **Step 4: Add original curated Markdown documents**

Write concise educational content for sleep hygiene, anxiety basics, stress management, and seeking professional help. Include a visible educational-only disclaimer in each document where appropriate.

- [ ] **Step 5: Verify generation**

Run: `npm run build:index`

Expected: `server/rag/index.generated.ts` is regenerated without errors.

Run: `npm test -- tests/buildKnowledgeIndex.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add knowledge scripts server/rag tests/buildKnowledgeIndex.test.ts
git commit -m "feat: add curated knowledge index"
```

## Task 3: Implement Retrieval, Guardrails, And Prompt Building

**Files:**
- Create: `server/rag/retriever.ts`
- Create: `server/safety/guardrails.ts`
- Create: `server/prompt/buildPrompt.ts`
- Create: `server/types.ts`
- Create: `tests/retriever.test.ts`
- Create: `tests/guardrails.test.ts`
- Create: `tests/buildPrompt.test.ts`

- [ ] **Step 1: Write failing retrieval tests**

Cover:

```ts
expect(retrieveSources("最近总是睡不好", 3)[0]?.documentId).toBe("sleep-hygiene");
expect(retrieveSources("", 3)).toEqual([]);
expect(new Set(retrieveSources("压力 焦虑", 4).map((item) => item.documentId)).size)
  .toBe(retrieveSources("压力 焦虑", 4).length);
```

- [ ] **Step 2: Verify retrieval tests fail**

Run: `npm test -- tests/retriever.test.ts`

Expected: FAIL because `retrieveSources` is missing.

- [ ] **Step 3: Implement retrieval**

Implement cosine similarity against generated TF-IDF vectors, minimum-score filtering, top-k selection, and per-document deduplication. Return stable UI metadata: `id`, `index`, `documentId`, `title`, `source`, `excerpt`, and `score`.

- [ ] **Step 4: Write failing validation and safety tests**

Cover valid messages, invalid roles, excessive content length, bounded recent context, and Chinese crisis keyword detection:

```ts
expect(detectCrisisRisk("我有伤害自己的想法")).toBe(true);
expect(() => validateChatRequest({ messages: [{ role: "tool", content: "x" }] })).toThrow();
expect(limitHistory(longHistory, 12)).toHaveLength(12);
```

- [ ] **Step 5: Verify guardrail tests fail**

Run: `npm test -- tests/guardrails.test.ts`

Expected: FAIL because guardrail functions are missing.

- [ ] **Step 6: Implement guardrails**

Allow only `user` and `assistant` roles, require non-empty content, cap one message at 4,000 characters, cap request history at 24 messages, send only the most recent 12 messages upstream, and detect a small explicit crisis-keyword list.

- [ ] **Step 7: Write failing prompt tests**

Cover citation formatting, education-only boundaries, no-source behavior, and crisis guidance:

```ts
expect(prompt.system).toContain("不能替代专业诊断");
expect(prompt.system).toContain("[1]");
expect(buildPrompt(messages, [], true).system).toContain("立即联系当地急救服务");
```

- [ ] **Step 8: Verify prompt tests fail**

Run: `npm test -- tests/buildPrompt.test.ts`

Expected: FAIL because `buildPrompt` is missing.

- [ ] **Step 9: Implement prompt building**

Return `{ system, messages, sources }`. Keep source numbers stable, ask the model to cite retrieved evidence with `[n]`, state uncertainty when retrieval is empty, and add urgent escalation language when crisis risk is detected.

- [ ] **Step 10: Verify server-core tests**

Run: `npm test -- tests/retriever.test.ts tests/guardrails.test.ts tests/buildPrompt.test.ts`

Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add server tests
git commit -m "feat: add RAG retrieval and safety prompt"
```

## Task 4: Implement SSE And DeepSeek Serverless APIs

**Files:**
- Create: `server/stream/sse.ts`
- Create: `server/llm/deepseek.ts`
- Create: `api/chat.ts`
- Create: `api/health.ts`
- Create: `tests/sse.test.ts`
- Create: `tests/chatApi.test.ts`

- [ ] **Step 1: Write failing SSE serializer tests**

```ts
expect(serializeSse("delta", { content: "你好" }))
  .toBe('event: delta\ndata: {"content":"你好"}\n\n');
```

- [ ] **Step 2: Verify SSE serializer test fails**

Run: `npm test -- tests/sse.test.ts`

Expected: FAIL because `serializeSse` is missing.

- [ ] **Step 3: Implement SSE serialization**

Provide serializers for `sources`, `delta`, `warning`, `done`, and `error`. Use JSON for all event payloads.

- [ ] **Step 4: Write failing API tests**

Test `POST /api/chat` with an explicit mock adapter and `GET /api/health` without exposing a secret:

```ts
expect(response.status).toBe(200);
expect(await response.text()).toContain("event: sources");
expect(await health.json()).not.toHaveProperty("apiKey");
```

- [ ] **Step 5: Verify API tests fail**

Run: `npm test -- tests/chatApi.test.ts`

Expected: FAIL because API handlers are missing.

- [ ] **Step 6: Implement DeepSeek adapter**

Call `https://api.deepseek.com/chat/completions` with `stream: true`, server-side `DEEPSEEK_API_KEY`, and an abort timeout. Parse upstream SSE, yield text deltas, and surface upstream errors. Permit deterministic mock text only when `ALLOW_MOCK_LLM=true`.

- [ ] **Step 7: Implement Serverless handlers**

`api/chat.ts` validates input, retrieves sources, builds the prompt, emits `sources`, optional `warning`, `delta`, `done`, and structured `error` events. `api/health.ts` returns `{ status, configured, mockAllowed }` without secrets.

- [ ] **Step 8: Verify API behavior**

Run: `npm test -- tests/sse.test.ts tests/chatApi.test.ts`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add api server tests
git commit -m "feat: add streaming DeepSeek API"
```

## Task 5: Implement Browser SSE Parsing And Local Storage

**Files:**
- Create: `src/types/chat.ts`
- Create: `src/services/sseParser.ts`
- Create: `src/services/chatApi.ts`
- Create: `src/services/storage.ts`
- Create: `tests/sseParser.test.ts`
- Create: `tests/storage.test.ts`

- [ ] **Step 1: Write failing browser parser tests**

Feed split UTF-8 byte chunks and split SSE frames:

```ts
expect(events).toEqual([
  { event: "delta", data: { content: "你好" } },
  { event: "done", data: {} }
]);
```

- [ ] **Step 2: Verify parser tests fail**

Run: `npm test -- tests/sseParser.test.ts`

Expected: FAIL because parser is missing.

- [ ] **Step 3: Implement stream parsing**

Use `TextDecoder("utf-8", { fatal: false })`, preserve partial frames between reads, split frames on blank lines, parse `event:` and `data:` fields, and return typed events.

- [ ] **Step 4: Write failing storage tests**

Cover empty startup, versioned round-trip, malformed JSON recovery, keyword search, delete, and clear:

```ts
expect(loadAppState(storage).conversations).toEqual([]);
storage.setItem(STORAGE_KEY, "{broken");
expect(loadAppState(storage).conversations).toEqual([]);
```

- [ ] **Step 5: Verify storage tests fail**

Run: `npm test -- tests/storage.test.ts`

Expected: FAIL because storage service is missing.

- [ ] **Step 6: Implement storage and chat request adapter**

Create a versioned schema. Store conversations, theme, and sidebar preference only. Implement `streamChat(messages, signal, onEvent)` against `/api/chat`.

- [ ] **Step 7: Verify frontend service tests**

Run: `npm test -- tests/sseParser.test.ts tests/storage.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/types src/services tests
git commit -m "feat: add browser stream and storage services"
```

## Task 6: Build Context State And The Chat Interface

**Files:**
- Modify: `src/App.tsx`
- Create: `src/context/ChatContext.tsx`
- Create: `src/components/layout/AppShell.tsx`
- Create: `src/components/sidebar/Sidebar.tsx`
- Create: `src/components/chat/WelcomePanel.tsx`
- Create: `src/components/chat/MessageList.tsx`
- Create: `src/components/chat/MessageRow.tsx`
- Create: `src/components/chat/Composer.tsx`
- Create: `src/components/chat/CitationPanel.tsx`
- Create: `src/components/chat/MarkdownMessage.tsx`
- Create: `src/styles/global.css`
- Create: `src/styles/app.css`
- Create: `tests/ChatContext.test.tsx`
- Create: `tests/App.test.tsx`

- [ ] **Step 1: Write failing context tests**

Cover create session, append user message, streamed assistant delta, stop status, persisted theme, session deletion, and keyword search.

- [ ] **Step 2: Verify context tests fail**

Run: `npm test -- tests/ChatContext.test.tsx`

Expected: FAIL because `ChatProvider` is missing.

- [ ] **Step 3: Implement `ChatProvider`**

Load initial browser state, expose session operations, persist mutations, call `streamChat`, append throttled deltas, attach sources to the in-progress assistant message, abort via `AbortController`, and preserve partial stopped responses.

- [ ] **Step 4: Write failing UI tests**

Cover welcome prompts, sending input, history search, delete and clear actions, theme toggle, citation expansion, and stop generation.

- [ ] **Step 5: Verify UI tests fail**

Run: `npm test -- tests/App.test.tsx`

Expected: FAIL because UI components are missing.

- [ ] **Step 6: Implement UI components**

Use `react-virtualized` for messages, `ReactMarkdown` with GFM and code highlighting, lazy-load `CitationPanel`, and render citation markers as React elements with click handlers rather than raw HTML event attributes.

- [ ] **Step 7: Implement responsive styling**

Add light and dark CSS variables, desktop sidebar collapse, mobile overlay sidebar, clear focus states, readable message width, compact source cards, and visible educational disclaimer.

- [ ] **Step 8: Verify UI tests**

Run: `npm test -- tests/ChatContext.test.tsx tests/App.test.tsx`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src tests
git commit -m "feat: build guest chat interface"
```

## Task 7: Document, Validate, And Prepare Deployment

**Files:**
- Create: `README.md`
- Create: `LICENSE`
- Modify: `.env.example`
- Modify: `vercel.json`

- [ ] **Step 1: Write the README**

Document:

- Product purpose and educational-only boundary.
- Feature list and architecture overview.
- `npm install`, `.env.local`, `npm run dev`, `npm test`, and `npm run build`.
- Explicit local mock mode with `ALLOW_MOCK_LLM=true`.
- DeepSeek environment-variable setup.
- Knowledge document format and `npm run build:index`.
- Vercel deployment steps and production environment variables.
- Privacy notes: conversations stay in browser storage; API key stays server-side.

- [ ] **Step 2: Add an MIT license**

Create `LICENSE` for the newly written original project.

- [ ] **Step 3: Run the full automated verification**

Run:

```bash
npm test
npm run typecheck
npm run build
```

Expected: all commands exit `0`.

- [ ] **Step 4: Run local API smoke verification**

Start Vercel local development with explicit mock mode and request:

```text
GET /api/health
POST /api/chat
```

Expected: health reports mock mode, chat emits `sources`, `delta`, and `done`, and no secret is returned.

- [ ] **Step 5: Run browser verification**

Open the local app and verify:

- Welcome screen renders.
- A preset prompt produces a streamed answer.
- A cited response shows expandable source cards.
- Clicking `[1]` highlights a card.
- Refresh preserves history.
- Search, delete, clear, theme toggle, mobile sidebar, and stop generation work.
- Browser console has no application errors.

- [ ] **Step 6: Review repository status**

Run: `git status -sb`

Expected: only intentional project files are present; `.env.local`, `node_modules`, and `dist` are ignored.

- [ ] **Step 7: Commit**

```bash
git add README.md LICENSE .env.example vercel.json
git commit -m "docs: add setup and deployment guide"
```

## Final Release Checklist

- [x] Run `npm test`.
- [x] Run `npm run typecheck`.
- [x] Run `npm run build`.
- [x] Verify local mock-mode API stream at the handler boundary.
- [x] Verify browser flow end to end with injected mock SSE.
- [x] Confirm `DEEPSEEK_API_KEY` is not committed.
- [x] Confirm production cannot silently use mock mode.
- [x] Confirm the implementation is independent from the old `yuan-Chat` source tree.
- [x] Create a new GitHub repository only after the local release checklist passes.

Remaining deployment verification:

- [x] Authenticate Vercel CLI and run `npx vercel dev`.
- [x] Verify `/api/health` and `/api/chat` through the Vercel local runtime.
- [x] Configure a real `DEEPSEEK_API_KEY` and verify a streamed DeepSeek response.
- [x] Connect the Vercel project to a Git repository.
- [ ] Add Preview environment variables.
- [ ] Verify the production `/api/chat` SSE flow after the Serverless ESM hotfix.
