# Next.js Supabase Sync Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the existing Vite chat assistant to Next.js App Router, add optional Supabase email OTP login and RLS-protected cloud history, and refresh the UI without regressing the deployed chat experience.

**Architecture:** Preserve the existing chat components, local RAG modules, DeepSeek SSE adapter, and virtual-list scrolling logic. Replace the Vite shell and Vercel Function handlers with Next.js App Router files, keep guest history in `localStorage`, and use Supabase Auth plus Postgres RLS for signed-in cloud history. Signed-in history lives in memory and is loaded from Supabase on entry or refresh.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, Testing Library, Supabase Auth, Supabase Postgres, `@supabase/supabase-js`, `@supabase/ssr`, DeepSeek SSE, local RAG, `react-virtualized`

---

## File Map

```text
app/layout.tsx                              Next.js root layout and metadata
app/page.tsx                                server entry that renders the client app
app/api/chat/route.ts                       Next.js SSE chat Route Handler
app/api/health/route.ts                     Next.js health Route Handler
src/App.tsx                                 client provider composition
src/context/AuthContext.tsx                 OTP login, logout, session state
src/context/ChatContext.tsx                 guest or cloud conversation state
src/services/storage.ts                     guest history and UI preferences only
src/services/cloudHistory.ts                Supabase history CRUD and limits
src/services/guestMerge.ts                  explicit all-or-nothing guest merge
src/lib/supabase/browser.ts                 browser Supabase client
src/lib/supabase/server.ts                  server Supabase client
src/lib/supabase/proxy.ts                   cookie refresh helper
proxy.ts                                    Next.js request proxy for auth cookies
src/components/auth/AuthDialog.tsx          email OTP dialog
src/components/auth/GuestMergeDialog.tsx    three-choice merge confirmation
src/components/auth/SyncStatus.tsx          compact sync feedback
src/styles/global.css                       global Next.js styles
src/styles/app.css                          calm professional visual refresh
supabase/migrations/202606010001_history.sql schema, limits, and RLS policies
tests/*.test.ts(x)                          regression and feature coverage
```

## Task 1: Commit The Deployed Scroll Fix Baseline

**Files:**
- Modify: `src/components/chat/MessageList.tsx`
- Create: `src/components/chat/messageListScroll.ts`
- Create: `tests/messageListScroll.test.ts`

- [ ] **Step 1: Verify only the intended scrolling files are selected**

Run:

```bash
git diff -- src/components/chat/MessageList.tsx
git diff -- src/components/chat/messageListScroll.ts tests/messageListScroll.test.ts
git status --short
```

Expected: scrolling changes are limited to the three files above. Keep the existing modification in `docs/superpowers/plans/2026-05-31-mental-health-assistant-mvp.md` out of this commit.

- [ ] **Step 2: Run the scrolling regression tests**

Run:

```bash
npm test -- tests/messageListScroll.test.ts
```

Expected: PASS.

- [ ] **Step 3: Commit the deployed baseline**

```bash
git add src/components/chat/MessageList.tsx src/components/chat/messageListScroll.ts tests/messageListScroll.test.ts
git commit -m "fix: preserve virtual list position during streaming"
```

## Task 2: Replace The Vite Shell With Next.js App Router

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Modify: `eslint.config.js`
- Create: `next.config.ts`
- Create: `next-env.d.ts`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Modify: `src/App.tsx`
- Delete: `index.html`
- Delete: `src/main.tsx`
- Delete: `vite.config.ts`
- Delete: `tsconfig.app.json`
- Delete: `tsconfig.node.json`
- Test: `tests/App.test.tsx`

- [ ] **Step 1: Add a failing Next.js shell assertion**

Add to `tests/App.test.tsx`:

```tsx
it("renders the preserved guest chat shell", () => {
  render(<App />);
  expect(screen.getByRole("heading", { name: "心理健康小助手" })).toBeInTheDocument();
  expect(screen.getByLabelText("消息输入框")).toBeInTheDocument();
});
```

- [ ] **Step 2: Install the Next.js packages**

Run:

```bash
npm install next@latest react@latest react-dom@latest @supabase/supabase-js @supabase/ssr
npm uninstall vite @vitejs/plugin-react
```

Expected: `package.json` and `package-lock.json` update successfully.

- [ ] **Step 3: Replace scripts and TypeScript configuration**

Set the relevant `package.json` scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build:index": "tsx scripts/build-knowledge-index.ts",
    "build": "npm run build:index && next build",
    "start": "next start",
    "typecheck": "tsc --noEmit --pretty false",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint ."
  }
}
```

Replace `tsconfig.json` with:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create the App Router shell**

Create `next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

Create `next-env.d.ts`:

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

Create `app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "../src/styles/global.css";
import "../src/styles/app.css";

export const metadata: Metadata = {
  title: "心理健康小助手",
  description: "提供可追溯来源的心理健康科普对话"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
```

Create `app/page.tsx`:

```tsx
import App from "../src/App";

export default function Page() {
  return <App />;
}
```

Add `"use client";` as the first line of `src/App.tsx` and remove its CSS imports because global CSS now belongs to the root layout.

- [ ] **Step 5: Remove Vite-only files and keep Vitest configuration**

Delete `index.html`, `src/main.tsx`, `vite.config.ts`, `tsconfig.app.json`, and `tsconfig.node.json`.

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    restoreMocks: true
  }
});
```

Update `eslint.config.js` ignores:

```ts
{ ignores: [".next", "node_modules", "server/rag/index.generated.ts"] }
```

- [ ] **Step 6: Verify the shell**

Run:

```bash
npm test -- tests/App.test.tsx
npm run typecheck
npm run lint
npm run build
```

Expected: all commands PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json eslint.config.js next.config.ts next-env.d.ts app src/App.tsx vitest.config.ts index.html src/main.tsx vite.config.ts tsconfig.app.json tsconfig.node.json
git commit -m "feat: migrate frontend shell to Next.js"
```

## Task 3: Convert Vercel Functions Into Next.js Route Handlers

**Files:**
- Create: `app/api/chat/route.ts`
- Create: `app/api/health/route.ts`
- Delete: `api/chat.ts`
- Delete: `api/health.ts`
- Delete: `vercel.json`
- Modify: `tests/chatApi.test.ts`
- Modify: `tests/serverEsmImports.test.ts`

- [ ] **Step 1: Rewrite API tests against Web `Request` and `Response`**

In `tests/chatApi.test.ts`, cover:

```ts
const response = await POST(
  new Request("http://localhost/api/chat", {
    method: "POST",
    body: JSON.stringify({ messages: [{ role: "user", content: "如何缓解压力？" }] })
  }),
  {
    streamLlm: async function* () {
      yield "可以先做一次缓慢呼吸。";
    }
  }
);

expect(response.status).toBe(200);
expect(await response.text()).toContain("event: done");
```

Also assert that `GET()` from `app/api/health/route.ts` returns configuration status without returning an API key.

- [ ] **Step 2: Run the route tests to verify failure**

Run:

```bash
npm test -- tests/chatApi.test.ts tests/serverEsmImports.test.ts
```

Expected: FAIL because the App Router Route Handlers do not exist.

- [ ] **Step 3: Implement the health Route Handler**

Create `app/api/health/route.ts`:

```ts
export function getHealth(env: NodeJS.ProcessEnv = process.env) {
  return {
    status: "ok",
    configured: Boolean(env.DEEPSEEK_API_KEY),
    mockAllowed: env.ALLOW_MOCK_LLM === "true"
  };
}

export function GET() {
  return Response.json(getHealth());
}
```

- [ ] **Step 4: Implement the SSE chat Route Handler**

Move the existing validation, retrieval, prompt, and `streamDeepSeek` dependency flow
into `app/api/chat/route.ts`. Export:

```ts
import { streamDeepSeek } from "../../../server/llm/deepseek";
import { buildPrompt } from "../../../server/prompt/buildPrompt";
import { retrieveSources } from "../../../server/rag/retriever";
import {
  detectCrisisRisk,
  limitHistory,
  validateChatRequest
} from "../../../server/safety/guardrails";
import { serializeSse } from "../../../server/stream/sse";
import type { PromptPayload } from "../../../server/types";

const encoder = new TextEncoder();
const crisisWarning = "如果你有伤害自己或他人的想法、计划或行为，请立即联系当地急救服务、前往附近医疗机构急诊，或请可信赖的人陪伴你并协助联系专业机构。";

export interface ChatRouteDependencies {
  streamLlm: (prompt: PromptPayload, signal?: AbortSignal) => AsyncIterable<string>;
}

export function createChatPost(overrides: Partial<ChatRouteDependencies> = {}) {
  return async function POST(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }
    let messages;
    try {
      const body = await request.json();
      messages = validateChatRequest({
        ...body,
        messages: Array.isArray(body.messages) ? body.messages.slice(-24) : body.messages
      });
    } catch {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
    const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
    if (!latestUserMessage) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
    const streamLlm = overrides.streamLlm ?? ((prompt, signal) => streamDeepSeek(prompt, { signal }));
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const sources = retrieveSources(latestUserMessage.content);
          const crisisRisk = detectCrisisRisk(latestUserMessage.content);
          const prompt = buildPrompt(limitHistory(messages, 12), sources, crisisRisk);
          controller.enqueue(encoder.encode(serializeSse("sources", { sources })));
          if (crisisRisk) {
            controller.enqueue(encoder.encode(serializeSse("warning", { message: crisisWarning })));
          }
          for await (const content of streamLlm(prompt, request.signal)) {
            controller.enqueue(encoder.encode(serializeSse("delta", { content })));
          }
          controller.enqueue(encoder.encode(serializeSse("done", {})));
        } catch {
          controller.enqueue(encoder.encode(serializeSse("error", { message: "Unable to complete the request" })));
        } finally {
          controller.close();
        }
      }
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive"
      }
    });
  };
}

export const POST = createChatPost();
```

Keep the existing named event order: `sources`, optional `warning`, one or more
`delta`, then `done`; emit `error` if streaming fails.

- [ ] **Step 5: Remove Vercel SPA configuration and update import regression checks**

Delete `api/chat.ts`, `api/health.ts`, and `vercel.json`. Update
`tests/serverEsmImports.test.ts` to inspect the Route Handler imports instead of the
removed Vercel Functions.

- [ ] **Step 6: Verify and commit**

Run:

```bash
npm test -- tests/chatApi.test.ts tests/serverEsmImports.test.ts tests/sse.test.ts tests/sseParser.test.ts
npm run typecheck
```

Expected: PASS.

```bash
git add app/api api vercel.json tests/chatApi.test.ts tests/serverEsmImports.test.ts
git commit -m "feat: migrate streaming APIs to Next.js route handlers"
```

## Task 4: Add Supabase Schema, Capacity Limits, And RLS

**Files:**
- Create: `supabase/migrations/202606010001_history.sql`
- Create: `tests/supabaseMigration.test.ts`

- [ ] **Step 1: Write a failing SQL contract test**

Create `tests/supabaseMigration.test.ts` that reads the SQL file and asserts:

```ts
expect(sql).toContain("alter table public.conversations enable row level security");
expect(sql).toContain("alter table public.messages enable row level security");
expect(sql).toContain("(select auth.uid()) = user_id");
expect(sql).toContain("conversation_limit");
expect(sql).toContain("message_limit");
expect(sql).toContain("belongs to authenticated user");
```

- [ ] **Step 2: Run the contract test to verify failure**

Run:

```bash
npm test -- tests/supabaseMigration.test.ts
```

Expected: FAIL because the migration file does not exist.

- [ ] **Step 3: Create the migration**

Create `supabase/migrations/202606010001_history.sql` with:

```sql
create table public.conversations (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index conversations_user_updated_idx
  on public.conversations (user_id, updated_at desc);

create table public.messages (
  id uuid primary key,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb,
  warning text,
  status text not null check (status in ('complete', 'stopped', 'error')),
  created_at timestamptz not null
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index messages_user_idx on public.messages (user_id);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "users manage own conversations"
  on public.conversations for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "users read own messages"
  on public.messages for select
  using ((select auth.uid()) = user_id);

create policy "users insert messages when parent conversation belongs to authenticated user"
  on public.messages for insert
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.conversations
      where conversations.id = messages.conversation_id
        and conversations.user_id = (select auth.uid())
    )
  );

create policy "users update own messages"
  on public.messages for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "users delete own messages"
  on public.messages for delete
  using ((select auth.uid()) = user_id);

create or replace function public.enforce_history_limits()
returns trigger language plpgsql security invoker as $$
begin
  if tg_table_name = 'conversations' and (
    select count(*) from public.conversations where user_id = new.user_id
  ) >= 100 then
    raise exception 'conversation_limit';
  end if;
  if tg_table_name = 'messages' and (
    select count(*) from public.messages where conversation_id = new.conversation_id
  ) >= 200 then
    raise exception 'message_limit';
  end if;
  return new;
end;
$$;

create trigger enforce_conversation_limit
  before insert on public.conversations
  for each row execute function public.enforce_history_limits();

create trigger enforce_message_limit
  before insert on public.messages
  for each row execute function public.enforce_history_limits();
```

- [ ] **Step 4: Verify and commit**

Run:

```bash
npm test -- tests/supabaseMigration.test.ts
```

Expected: PASS.

```bash
git add supabase/migrations/202606010001_history.sql tests/supabaseMigration.test.ts
git commit -m "feat: add RLS-protected cloud history schema"
```

## Task 5: Add Supabase Clients And Email OTP Authentication

**Files:**
- Create: `src/lib/supabase/browser.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/proxy.ts`
- Create: `proxy.ts`
- Create: `src/context/AuthContext.tsx`
- Create: `tests/AuthContext.test.tsx`
- Modify: `.env.example`

- [ ] **Step 1: Write failing OTP provider tests**

Create `tests/AuthContext.test.tsx` with an injected auth client and cover:

```ts
await result.current.requestOtp("person@example.com");
expect(auth.signInWithOtp).toHaveBeenCalledWith({
  email: "person@example.com",
  options: { shouldCreateUser: true }
});

await result.current.verifyOtp("123456");
expect(auth.verifyOtp).toHaveBeenCalledWith({
  email: "person@example.com",
  token: "123456",
  type: "email"
});
```

Also cover invalid email, OTP request failure, OTP verification failure, and logout.

- [ ] **Step 2: Run the auth tests to verify failure**

Run:

```bash
npm test -- tests/AuthContext.test.tsx
```

Expected: FAIL because `AuthProvider` does not exist.

- [ ] **Step 3: Add browser, server, and proxy Supabase clients**

Create `src/lib/supabase/browser.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
```

Create server and proxy helpers using `createServerClient` from `@supabase/ssr` and
Next.js cookies.

Create `src/lib/supabase/server.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (items) => items.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        })
      }
    }
  );
}
```

Create `src/lib/supabase/proxy.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function refreshSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (items) => {
          items.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        }
      }
    }
  );
  await supabase.auth.getUser();
  return response;
}
```

Create root `proxy.ts`:

```ts
import type { NextRequest } from "next/server";
import { refreshSupabaseSession } from "./src/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return refreshSupabaseSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
```

- [ ] **Step 4: Implement `AuthProvider`**

Create `src/context/AuthContext.tsx` with:

```ts
type AuthStatus = "guest" | "loading" | "authenticated";
type OtpStep = "closed" | "email" | "code";

interface AuthContextValue {
  status: AuthStatus;
  otpStep: OtpStep;
  email: string;
  error?: string;
  openLogin: () => void;
  closeLogin: () => void;
  requestOtp: (email: string) => Promise<void>;
  verifyOtp: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}
```

Use `signInWithOtp`, `verifyOtp({ type: "email" })`, `getSession`, `onAuthStateChange`,
and `signOut`. Export an optional client prop for deterministic tests.

- [ ] **Step 5: Add environment variables**

Append to `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

- [ ] **Step 6: Verify and commit**

Run:

```bash
npm test -- tests/AuthContext.test.tsx
npm run typecheck
```

Expected: PASS.

```bash
git add src/lib/supabase src/context/AuthContext.tsx proxy.ts tests/AuthContext.test.tsx .env.example
git commit -m "feat: add Supabase email OTP authentication"
```

## Task 6: Implement Cloud History CRUD And Guest Merge

**Files:**
- Create: `src/services/cloudHistory.ts`
- Create: `src/services/guestMerge.ts`
- Create: `tests/cloudHistory.test.ts`
- Create: `tests/guestMerge.test.ts`

- [ ] **Step 1: Write failing cloud CRUD tests**

Use a fake Supabase query client and cover:

```ts
expect(await loadCloudConversations(client, "user-1")).toEqual([conversation]);
await saveCloudConversation(client, "user-1", conversation);
expect(client.upsertedConversation.user_id).toBe("user-1");
await deleteCloudConversation(client, "conversation-1");
await clearCloudConversations(client, "user-1");
```

Also assert that database errors containing `conversation_limit` and `message_limit`
map to typed capacity errors.

- [ ] **Step 2: Write failing all-or-nothing merge tests**

Cover:

```ts
await mergeGuestConversations({
  guestConversations: [conversation],
  upload: vi.fn().mockResolvedValue(undefined),
  clearGuest: clearGuestMock
});
expect(clearGuestMock).toHaveBeenCalledOnce();
```

When upload rejects, assert `clearGuestMock` is not called.

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
npm test -- tests/cloudHistory.test.ts tests/guestMerge.test.ts
```

Expected: FAIL because the services do not exist.

- [ ] **Step 4: Implement cloud CRUD**

Create `src/services/cloudHistory.ts` exporting:

```ts
export class CloudCapacityError extends Error {
  constructor(readonly code: "conversation_limit" | "message_limit") {
    super(code);
  }
}

export async function loadCloudConversations(client: SupabaseClient, userId: string): Promise<Conversation[]>;
export async function saveCloudConversation(client: SupabaseClient, userId: string, conversation: Conversation): Promise<void>;
export async function deleteCloudConversation(client: SupabaseClient, conversationId: string): Promise<void>;
export async function clearCloudConversations(client: SupabaseClient, userId: string): Promise<void>;
```

Load conversations ordered by `updated_at desc` and nested messages ordered by
`created_at asc`. Map camelCase browser models to snake_case database rows. Upsert the
conversation first, then messages. Throw `CloudCapacityError` for the two trigger
messages.

- [ ] **Step 5: Implement merge**

Create `src/services/guestMerge.ts`:

```ts
export async function mergeGuestConversations({
  guestConversations,
  upload,
  clearGuest
}: {
  guestConversations: Conversation[];
  upload: (conversation: Conversation) => Promise<void>;
  clearGuest: () => void;
}) {
  for (const conversation of guestConversations) {
    await upload(conversation);
  }
  clearGuest();
}
```

- [ ] **Step 6: Verify and commit**

Run:

```bash
npm test -- tests/cloudHistory.test.ts tests/guestMerge.test.ts
npm run typecheck
```

Expected: PASS.

```bash
git add src/services/cloudHistory.ts src/services/guestMerge.ts tests/cloudHistory.test.ts tests/guestMerge.test.ts
git commit -m "feat: add cloud history persistence and guest merge"
```

## Task 7: Integrate Guest And Account Modes Into Chat State

**Files:**
- Modify: `src/context/ChatContext.tsx`
- Modify: `src/services/storage.ts`
- Modify: `src/App.tsx`
- Modify: `tests/storage.test.ts`
- Modify: `tests/ChatContext.test.tsx`

- [ ] **Step 1: Add failing guest/account boundary tests**

Extend `tests/ChatContext.test.tsx` to cover:

```ts
expect(result.current.historyMode).toBe("guest");
await act(() => result.current.refreshCloudHistory());
expect(result.current.conversations).toEqual(cloudConversations);
await act(() => result.current.logoutToGuest());
expect(result.current.conversations).toEqual(localGuestConversations);
```

Assert that signed-in cloud conversations are not passed to `saveAppState`, that cloud
single-delete and clear-all call Supabase CRUD, and that stopped or complete streamed
answers are persisted to the active repository.

- [ ] **Step 2: Run the context tests to verify failure**

Run:

```bash
npm test -- tests/storage.test.ts tests/ChatContext.test.tsx
```

Expected: FAIL because account mode is not implemented.

- [ ] **Step 3: Restrict browser persistence to guest data and preferences**

Keep the existing versioned local state but treat `conversations` as guest-only
conversations. Rename internal variables where needed so cloud conversations cannot be
written accidentally. Add a `clearGuestConversations()` helper that saves an empty
guest list while retaining theme and sidebar preferences.

- [ ] **Step 4: Add history mode and cloud actions to `ChatProvider`**

Expose:

```ts
type HistoryMode = "guest" | "account";
type SyncState = "idle" | "syncing" | "synced" | "error";

interface ChatContextValue {
  historyMode: HistoryMode;
  syncState: SyncState;
  mergePromptOpen: boolean;
  refreshCloudHistory: () => Promise<void>;
  mergeGuestHistory: () => Promise<void>;
  keepGuestHistoryLocal: () => void;
  cancelLoginAndReturnToGuest: () => Promise<void>;
  logoutToGuest: () => Promise<void>;
}
```

When authentication changes to signed-in, load cloud history and open the merge prompt
if local guest history is non-empty. In account mode route create, update, delete, and
clear operations through `cloudHistory.ts`. In guest mode continue to use
`localStorage`. Preserve the existing streaming, abort, and scroll-sensitive update
behavior.

- [ ] **Step 5: Compose providers**

Update `src/App.tsx`:

```tsx
"use client";

export default function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <AppShell />
      </ChatProvider>
    </AuthProvider>
  );
}
```

- [ ] **Step 6: Verify and commit**

Run:

```bash
npm test -- tests/storage.test.ts tests/ChatContext.test.tsx
npm run typecheck
```

Expected: PASS.

```bash
git add src/context/ChatContext.tsx src/services/storage.ts src/App.tsx tests/storage.test.ts tests/ChatContext.test.tsx
git commit -m "feat: switch between guest and cloud chat history"
```

## Task 8: Add Login, Merge, And Sync Interfaces

**Files:**
- Create: `src/components/auth/AuthDialog.tsx`
- Create: `src/components/auth/GuestMergeDialog.tsx`
- Create: `src/components/auth/SyncStatus.tsx`
- Modify: `src/components/sidebar/Sidebar.tsx`
- Modify: `src/components/layout/AppShell.tsx`
- Modify: `tests/App.test.tsx`

- [ ] **Step 1: Write failing UI flow tests**

Extend `tests/App.test.tsx` to cover:

```tsx
fireEvent.click(screen.getByRole("button", { name: "登录" }));
expect(screen.getByRole("dialog", { name: "邮箱验证码登录" })).toBeInTheDocument();
fireEvent.change(screen.getByLabelText("邮箱"), { target: { value: "person@example.com" } });
fireEvent.click(screen.getByRole("button", { name: "发送验证码" }));
expect(await screen.findByLabelText("六位验证码")).toBeInTheDocument();
```

Add tests for the three merge buttons, `同步中`, `已同步`, `同步失败，请重试`, logout,
and cloud-capacity feedback.

- [ ] **Step 2: Run UI tests to verify failure**

Run:

```bash
npm test -- tests/App.test.tsx
```

Expected: FAIL because auth UI components do not exist.

- [ ] **Step 3: Implement auth dialogs**

`AuthDialog.tsx` renders a semantic `role="dialog"` with separate email and six-digit
OTP steps. `GuestMergeDialog.tsx` explains that local guest conversations contain
sensitive content and renders:

```tsx
<button onClick={mergeGuestHistory}>同步到账号</button>
<button onClick={keepGuestHistoryLocal}>暂不同步</button>
<button onClick={cancelLoginAndReturnToGuest}>取消登录</button>
```

- [ ] **Step 4: Implement compact sync state**

Create `SyncStatus.tsx`:

```tsx
const labels = {
  idle: "",
  syncing: "同步中",
  synced: "已同步",
  error: "同步失败，请重试"
} as const;
```

Render the label with `aria-live="polite"`.

- [ ] **Step 5: Add account entry to the sidebar and dialogs to the shell**

Add login, logout, account email, and sync-state controls without moving the existing
conversation search or history actions. Render dialogs once near the end of
`AppShell`.

- [ ] **Step 6: Verify and commit**

Run:

```bash
npm test -- tests/App.test.tsx tests/ChatContext.test.tsx
npm run typecheck
```

Expected: PASS.

```bash
git add src/components/auth src/components/sidebar/Sidebar.tsx src/components/layout/AppShell.tsx tests/App.test.tsx
git commit -m "feat: add OTP and cloud sync interfaces"
```

## Task 9: Apply The Calm Professional Visual Refresh

**Files:**
- Modify: `src/styles/global.css`
- Modify: `src/styles/app.css`
- Modify: `src/components/chat/Composer.tsx`
- Modify: `src/components/chat/MessageRow.tsx`
- Modify: `src/components/sidebar/Sidebar.tsx`
- Test: `tests/App.test.tsx`

- [ ] **Step 1: Add semantic style hooks**

Add stable classes for:

```text
account-panel
sync-status
auth-dialog
merge-dialog
composer-card
message-card
message-card-user
message-card-assistant
crisis-warning
```

Keep labels and accessible roles intact.

- [ ] **Step 2: Replace the palette and component surfaces**

Define light-mode variables in `src/styles/global.css`:

```css
:root {
  --page: #f5f8f6;
  --surface: #ffffff;
  --surface-soft: #edf5f2;
  --text: #243532;
  --muted: #647773;
  --line: #dce8e4;
  --accent: #3f8178;
  --accent-strong: #2f6c64;
  --danger: #a94f56;
  --shadow: 0 14px 34px rgba(49, 83, 77, 0.1);
}
```

Define a dark palette under `[data-theme="dark"]`, improve message line height and
reading width, soften sidebar borders, strengthen selected conversation contrast, and
use a fixed-bottom card composer.

- [ ] **Step 3: Add motion and responsive rules**

Add:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

@media (max-width: 760px) {
  .sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 20;
  }
}
```

Keep the existing virtualized list height and scrolling behavior unchanged.

- [ ] **Step 4: Verify the visual implementation mechanically**

Run:

```bash
npm test -- tests/App.test.tsx tests/messageListScroll.test.ts
npm run lint
npm run typecheck
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/styles src/components/chat/Composer.tsx src/components/chat/MessageRow.tsx src/components/sidebar/Sidebar.tsx tests/App.test.tsx
git commit -m "feat: refresh calm professional chat interface"
```

## Task 10: Document Configuration And Verify Preview Release

**Files:**
- Modify: `README.md`
- Modify: `.env.example`
- Modify: `docs/superpowers/plans/2026-06-01-nextjs-supabase-sync-migration.md`

- [ ] **Step 1: Update README**

Document:

```text
Next.js App Router local startup
Supabase project creation
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
running supabase/migrations/202606010001_history.sql
email OTP template with {{ .Token }}
guest history privacy behavior
cloud history limits
Preview-first Vercel release flow
```

- [ ] **Step 2: Run the full automated suite**

Run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all commands PASS.

- [ ] **Step 3: Deploy to Vercel Preview**

Run:

```bash
npx vercel
```

Expected: Vercel returns a Preview URL. Do not promote it to production yet.

- [ ] **Step 4: Verify the Preview deployment in a real browser**

Check:

```text
guest chat without login
DeepSeek streamed answer and stop button
citations and crisis guidance
manual scrolling during a long streamed answer
email OTP login
all three guest merge choices
logout removes account history from browser memory
cloud history appears after refresh on another browser session
single delete and clear-all synchronize
capacity errors are readable
light theme, dark theme, and narrow mobile layout
browser console has no application errors
```

- [ ] **Step 5: Verify RLS with two accounts**

Create data for account A. Sign in as account B and confirm account B cannot read,
update, or delete account A rows. Confirm unauthenticated requests cannot read cloud
history.

- [ ] **Step 6: Record verification and commit docs**

Mark completed checks in this plan and update README with any verified operational
notes.

```bash
git add README.md .env.example docs/superpowers/plans/2026-06-01-nextjs-supabase-sync-migration.md
git commit -m "docs: add Next.js Supabase release guide"
```

- [ ] **Step 7: Promote the verified Preview deployment**

Run only after every Preview check passes:

```bash
npx vercel --prod
```

Expected: the production alias remains `https://mental-health-assistant-gamma.vercel.app`.

## Final Acceptance Checklist

- [ ] Existing guest chat, RAG, citations, crisis warning, stop-generation, and scroll behavior pass regression tests.
- [ ] Next.js App Router serves the chat shell and both API Route Handlers.
- [ ] Email OTP login works without password, Magic Link, or social login.
- [ ] Guest history is never uploaded without explicit confirmation.
- [ ] Signed-in history is never persisted to `localStorage`.
- [ ] Logout removes account history from browser memory.
- [ ] Supabase RLS prevents cross-account and anonymous cloud-history access.
- [ ] Cloud limits reject excess history without automatic deletion.
- [ ] Refresh-based cross-device synchronization works.
- [ ] The calm professional visual refresh works in light, dark, and narrow layouts.
- [ ] Full automated verification passes.
- [ ] Preview browser verification passes before production promotion.
