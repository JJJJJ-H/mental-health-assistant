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
