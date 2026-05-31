# Mental Health Assistant MVP Design

## 1. Goal

Build an original, deployable mental health AI assistant from an empty project directory. The product is a guest-accessible web application for mental health education and conversational guidance. It must support real LLM responses, multi-turn conversations, streaming output, built-in RAG retrieval, source citations, and browser-local conversation history.

The product is informational only. It must not claim to diagnose, prescribe treatment, or replace professional care.

## 2. Scope

### Included in MVP

- Guest access without registration.
- React 18 + Vite + TypeScript frontend.
- Vercel deployment with TypeScript Serverless Functions.
- DeepSeek API integration through a server-side environment variable.
- SSE streaming with incremental rendering and stop-generation support.
- Multi-turn conversations with bounded recent context.
- Built-in, reviewable mental health education documents stored as Markdown.
- Build-time generation of a read-only TF-IDF retrieval index.
- RAG context retrieval and prompt construction on the server.
- Citation markers such as `[1]` in assistant messages.
- Expandable source cards and click-to-highlight citation behavior.
- Markdown rendering with GFM and code highlighting.
- Conversation persistence, search, deletion, and clearing through `localStorage`.
- Light and dark themes.
- Responsive layout with a collapsible sidebar.
- Virtualized message list using `react-virtualized`.
- Lazy-loaded non-critical panels using `React.lazy` and `Suspense`.
- Health-check endpoint.
- README instructions for local development, environment variables, knowledge-base updates, and Vercel deployment.

### Excluded from MVP

- Login, registration, and cross-device synchronization.
- User document uploads.
- Admin dashboard.
- Dynamic knowledge-base editing at runtime.
- Database storage.
- External vector database.
- Automated diagnosis or treatment planning.
- Complex animations.

## 3. Deployment Model

The application is deployed as one Vercel project:

- The Vite frontend is served as static assets.
- `/api/chat` and `/api/health` run as Vercel Serverless Functions.
- `DEEPSEEK_API_KEY` is stored only in Vercel environment variables.
- The knowledge base and generated TF-IDF index are read-only deployment artifacts.

Serverless functions must not rely on mutable in-memory state between requests. Updating knowledge documents requires regenerating the index and redeploying.

## 4. Project Layout

```text
mental-health-assistant/
  api/
    chat.ts
    health.ts
  knowledge/
    *.md
  scripts/
    build-knowledge-index.ts
  server/
    llm/
      deepseek.ts
    prompt/
      buildPrompt.ts
    rag/
      index.generated.ts
      retriever.ts
    safety/
      guardrails.ts
    stream/
      sse.ts
    types.ts
  src/
    components/
    context/
    services/
    types/
    utils/
  docs/
    superpowers/specs/
```

## 5. Frontend Experience

The application uses a single-page chat layout.

### Sidebar

- Create a new conversation.
- Search conversation history by keyword.
- List conversations with their titles and update times.
- Delete one conversation.
- Clear all conversations after confirmation.
- Toggle light and dark themes.
- Collapse on desktop and default to closed on narrow screens.

### Main Chat Area

- Show a welcome state with preset mental health education questions when no messages exist.
- Render user and assistant messages in a virtualized list.
- Render assistant Markdown with GFM and `highlight.js`.
- Show streaming output incrementally.
- Keep scrolling pinned to the bottom only while the user remains near the bottom.
- Provide send and stop-generation actions.
- Show clear loading, completed, stopped, and failed states.

### Citations

- Render citation markers such as `[1]` within assistant Markdown.
- Show an expandable source panel below an assistant answer when retrieval sources exist.
- Each source card includes title, source label, excerpt, and relevance score.
- Clicking a citation marker highlights the matching source card.

### Safety Notice

The UI includes a visible notice that responses are educational references only and do not replace professional diagnosis or treatment. For urgent risk, users are instructed to contact local emergency services or a trusted qualified professional immediately.

## 6. Backend Design

### Endpoints

#### `POST /api/chat`

Request:

```json
{
  "messages": [
    {
      "role": "user",
      "content": "How can I improve my sleep routine?"
    }
  ]
}
```

Responsibilities:

1. Validate the request schema and enforce limits.
2. Keep only bounded recent conversation context.
3. Detect safety-related crisis keywords.
4. Retrieve relevant knowledge chunks.
5. Build a system prompt containing safety guidance and retrieved context.
6. Stream a DeepSeek response.
7. Translate the upstream stream into the application's SSE protocol.
8. Avoid logging full user conversations.

#### `GET /api/health`

Returns service status and whether required production configuration is present. It must not expose secrets.

### Environment Variables

```env
DEEPSEEK_API_KEY=
ALLOW_MOCK_LLM=false
```

`DEEPSEEK_API_KEY` is mandatory in production. Local mock responses are available only when `ALLOW_MOCK_LLM=true` is explicitly configured.

## 7. SSE Protocol

The backend emits named SSE events:

```text
event: sources
data: {"sources":[{"id":"sleep-basics-1","index":1,"title":"Sleep Hygiene Basics","source":"Built-in knowledge base","excerpt":"...","score":0.82}]}

event: delta
data: {"content":"A consistent sleep schedule"}

event: warning
data: {"message":"If you may harm yourself or someone else, contact local emergency services immediately."}

event: done
data: {}

event: error
data: {"message":"The assistant is temporarily unavailable. Please try again later."}
```

The frontend parses bytes with `ReadableStream` and `TextDecoder`, keeps an SSE frame buffer, and handles split UTF-8 characters and split event frames correctly.

## 8. RAG Retrieval

### Knowledge Source

The repository contains a small, curated set of Markdown documents covering general mental health education topics. Documents include metadata such as stable ID, title, and source label.

### Build-Time Index

The index build script:

1. Reads Markdown documents.
2. Parses metadata and content.
3. Splits content into overlapping chunks.
4. Tokenizes Chinese and English text.
5. Generates TF-IDF metadata and chunk vectors.
6. Writes a deterministic TypeScript index artifact.

### Runtime Retrieval

The retriever:

- Accepts a query string and configurable result limit.
- Scores chunks with cosine similarity.
- Applies a minimum relevance threshold.
- Deduplicates results by document where appropriate.
- Returns stable citation metadata for prompt construction and UI display.

The retriever is hidden behind an interface so it can later be replaced by an external vector database without changing the frontend protocol.

## 9. Prompt Construction And Safety

The prompt builder adds:

- A clear mental health education role.
- A prohibition against diagnosis and treatment claims.
- Retrieved excerpts with stable numeric citation indices.
- Instructions to annotate claims derived from knowledge sources with `[n]`.
- A requirement to acknowledge when the knowledge base does not contain relevant material.
- Crisis-response guidance when keywords indicate urgent risk.

Safety keyword matching is a supplemental guardrail, not a diagnostic system. The application must avoid claiming certainty about a user's mental state.

## 10. Local Persistence

Frontend persistence is encapsulated in a storage service with a versioned schema.

Stored data:

- Conversations and messages.
- Conversation titles and timestamps.
- Theme preference.
- Sidebar preference.

The service must:

- Recover gracefully from malformed or outdated stored JSON.
- Avoid storing API keys.
- Provide create, update, search, delete, and clear operations.

## 11. Performance

- Use `react-virtualized` for long message histories.
- Load citation and settings panels lazily.
- Memoize message rows where useful.
- Split vendor bundles through Vite configuration.
- Import only required icons and libraries.
- Use compressed local assets and avoid unnecessary images.
- Throttle streaming render updates to avoid one React render per upstream token.

## 12. Error Handling

- Invalid request: return a structured `400` response.
- Missing production API key: return a structured configuration error.
- Upstream timeout or network failure: emit an SSE `error` event and close the stream.
- User stop-generation action: abort the frontend request and preserve the partial response with a stopped status.
- Empty or irrelevant retrieval results: continue without citations and state limitations when appropriate.
- Corrupted local storage: recover to an empty valid state without breaking the UI.

## 13. Verification

The MVP is accepted when:

- A deployed URL opens without registration.
- A user can create a conversation and receive a real streamed DeepSeek response.
- A user can stop an in-progress generation.
- Recent multi-turn context affects subsequent responses.
- Relevant built-in knowledge produces inline citations and expandable source cards.
- Clicking `[1]` highlights the matching source card.
- Refreshing the page preserves conversations.
- History search, single deletion, and clear-all behavior work.
- Light and dark themes work.
- The mobile layout is usable.
- Production does not expose the DeepSeek API key.
- Production does not silently fall back to mock responses.
- `npm run build`, type checking, and automated tests pass.
- README instructions are complete enough for a fresh setup and Vercel deployment.

## 14. Future Extension Points

Possible later iterations:

- External vector database and semantic embeddings.
- Login and cross-device synchronization.
- User-specific knowledge collections.
- Admin knowledge management.
- Rate limiting backed by an external store.
- Analytics that preserve conversation privacy.

