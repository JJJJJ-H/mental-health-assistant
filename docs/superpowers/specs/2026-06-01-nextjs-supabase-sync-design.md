# Next.js Supabase Sync Migration Design

## 1. Goal

Migrate the existing mental health education chat assistant from React 18 + Vite to
Next.js App Router while preserving its current chat behavior. Add optional email OTP
login, Supabase-backed cloud history for signed-in users, cross-device synchronization,
and a restrained visual refresh.

Guest access remains the default. Mental health conversations are sensitive data, so
guest history must never be uploaded silently.

## 2. Scope

### Included

- Next.js App Router migration in the existing project directory.
- Reuse of the existing chat interface, RAG retrieval, DeepSeek SSE stream, cancellation
  flow, crisis guidance, citations, local history operations, theme support, and
  virtual-list scrolling behavior.
- Supabase Auth with email OTP only.
- Supabase Postgres storage for signed-in users.
- Row Level Security (RLS) for user-owned cloud history.
- Explicit guest-history merge confirmation after login.
- Cloud history refresh when a signed-in user enters or reloads the application.
- Last-write-wins conflict handling.
- Cloud deletion for a single conversation and clear-all history.
- Capacity limits: 100 conversations per account and 200 messages per conversation.
- A calm, professional visual refresh with low-saturation blue-green colors.
- Preview deployment and verification before replacing the existing production version.

### Excluded

- Password login.
- Magic Link login.
- Social login.
- Real-time push synchronization.
- Complex merge conflict resolution.
- Offline access to account history after logout.
- Self-service account deletion.
- Automatic deletion of older cloud conversations.
- Changes to the RAG knowledge source model.
- Complex animation.

## 3. Migration Strategy

Use an in-place migration to Next.js App Router. Keep the existing production
deployment available while the Next.js version is validated in a Vercel Preview
deployment.

Reuse the existing frontend components and server modules wherever their boundaries
remain appropriate. Replace Vite entry points and Vercel Function handlers with
Next.js equivalents. Avoid introducing a temporary second application or adding
Supabase to the Vite application before migration.

## 4. Architecture

```text
Next.js App Router
├─ Chat interface and local guest mode
├─ Route Handler: /api/chat
│  ├─ request validation and crisis detection
│  ├─ local RAG retrieval and citations
│  └─ DeepSeek SSE streaming and cancellation
├─ Supabase Auth
│  └─ email OTP login
├─ Supabase Postgres
│  ├─ conversations
│  └─ messages
├─ Supabase RLS
│  └─ per-user cloud history isolation
└─ localStorage
   ├─ guest conversations only
   └─ theme and sidebar preferences
```

Account history is held in application memory while a user is signed in. It must not
be persisted to `localStorage`. Logging out clears account history from memory and
returns the interface to any unmerged guest history still stored locally.

## 5. Authentication

Supabase Auth provides email OTP login only.

The interface uses a two-step dialog:

1. The user enters an email address and requests an OTP.
2. The user enters the six-digit OTP to complete login.

Authentication errors must leave guest mode fully usable. The first release does not
include passwords, Magic Links, social identity providers, or self-service account
deletion.

## 6. Cloud Data Model

### `conversations`

```text
id          uuid primary key
user_id     uuid not null references auth.users(id)
title       text not null
created_at  timestamptz not null
updated_at  timestamptz not null
```

Add an index for `user_id` and an index suitable for listing a user's conversations
by `updated_at`.

### `messages`

```text
id               uuid primary key
conversation_id  uuid not null references conversations(id) on delete cascade
user_id          uuid not null references auth.users(id)
role             text not null check (role in ('user', 'assistant'))
content          text not null
sources          jsonb
warning          text
status           text not null check (status in ('complete', 'stopped', 'error'))
created_at       timestamptz not null
```

Add indexes for `conversation_id` and `user_id`.

### RLS Requirements

Enable RLS on both tables.

- Users may select, insert, update, and delete only rows where `auth.uid() = user_id`.
- Message writes must also validate that the parent conversation belongs to the same
  authenticated user.
- Anonymous users must not read or write cloud history.

The schema migration must include SQL verification or automated checks for these
policies.

## 7. Guest And Account History

Guest conversations continue to use the existing versioned `localStorage` service.

After OTP login:

1. Load the user's cloud history.
2. If local guest conversations exist, show a merge-confirmation dialog.
3. Do not upload guest data until the user explicitly chooses an action.

The dialog provides three choices:

- **Sync to account:** upload local guest conversations and messages. Clear the local
  guest copy only after the complete batch succeeds.
- **Keep local only:** leave guest history in `localStorage`. During the signed-in
  session, show account history only.
- **Cancel login:** sign out and return to guest mode.

If upload fails partially or completely, keep the entire local guest copy and offer a
retry. The client must not treat a partial upload as a completed merge.

On logout:

- Clear cloud conversations from application memory.
- Do not write cloud conversations to `localStorage`.
- Display any guest conversations that remain in `localStorage`.

## 8. Synchronization Rules

The first release uses last-write-wins conflict handling.

- Signed-in users load the latest cloud history on application entry and browser
  refresh.
- Conversation updates and deletes are written to Supabase.
- Clear-all deletes the signed-in user's cloud conversations.
- Another device observes changes after refreshing or re-entering the application.
- Real-time subscriptions and field-level conflict merging are deferred.

Cloud limits:

- Maximum 100 conversations per account.
- Maximum 200 messages per conversation.
- When a limit is reached, reject the new cloud write and ask the user to remove old
  records manually.
- Never auto-delete sensitive conversation history.

## 9. Interface Changes

Preserve the existing sidebar and main chat layout. Add:

- A `Login` or account entry in the sidebar.
- The email and OTP dialog.
- The guest-history merge dialog.
- Compact synchronization states: `Syncing`, `Synced`, and `Sync failed, retry`.
- A clear capacity-limit prompt when cloud storage limits are reached.

Existing chat behavior remains intact:

- Direct guest chat.
- Streaming response updates and stop-generation.
- Citation display and highlighting.
- Crisis guidance.
- Search, delete, clear, theme selection, and conversation persistence.
- Virtual-list bottom following while respecting deliberate historical scrolling.

## 10. Visual Direction

Use a calm, professional style with restrained low-saturation blue-green colors. The
interface should feel trustworthy and readable without implying diagnosis or clinical
authority.

- Use a soft gray-green or warm off-white background in light mode.
- Use a low-contrast deep blue-gray background in dark mode.
- Apply the accent color to primary actions, focus states, selected conversations, and
  citation highlighting.
- Render user messages as subtle blue-green bubbles.
- Render assistant messages as lightweight cards with improved line spacing and
  controlled reading width.
- Reduce sidebar border weight and strengthen the active-conversation state.
- Use a fixed-bottom card-style composer with clear send and stop actions.
- Keep sync feedback lightweight and avoid disruptive success dialogs.
- Keep crisis guidance visually prominent with calm, action-oriented wording.
- Limit motion to subtle transitions and loading feedback.
- Respect `prefers-reduced-motion`.
- Use a drawer-style sidebar on narrow screens.

## 11. Error Handling

- OTP request failure, invalid OTP, and expired OTP: show a clear error and remain in
  usable guest mode.
- Cloud-history load failure: preserve the authenticated session, avoid showing stale
  account cache, and provide a retry action.
- Guest merge failure: retain the full local guest copy and provide a retry action.
- Cloud write failure: mark the operation as failed instead of claiming synchronization.
- Capacity-limit failure: explain the relevant limit and ask the user to remove records.
- DeepSeek, RAG, crisis guidance, SSE errors, and cancellation retain their existing
  behavior.

## 12. Verification

Run:

```text
npm test
npm run typecheck
npm run lint
npm run build
```

Add coverage for:

- OTP state transitions and failures.
- RLS policies and parent-conversation ownership checks.
- The three guest-history merge choices.
- Full retention of guest data after merge failure.
- Clearing account history from memory on logout.
- Refresh-based cross-device synchronization.
- Last-write-wins behavior.
- Cloud single deletion and clear-all.
- Capacity limits.
- Existing SSE, cancellation, RAG, crisis guidance, and virtual-list scrolling
  regressions.

Verify the Vercel Preview deployment in a real browser:

- Guest chat works without login.
- OTP login works.
- Guest history is never uploaded before explicit confirmation.
- Merge, keep-local-only, and cancel-login behaviors work.
- Logout removes account history from the browser session.
- Account history appears on another device after refresh.
- Light mode, dark mode, and mobile layout are usable.
- Long streamed answers preserve deliberate historical scrolling and resume bottom
  following correctly.
- Sync failure, capacity limit, citation, and crisis-guidance states are readable.
- Supabase RLS prevents cross-account reads and writes.

After Preview verification succeeds, promote the verified deployment to production
while retaining the existing production URL.

