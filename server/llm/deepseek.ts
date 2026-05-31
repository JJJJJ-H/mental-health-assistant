import type { PromptPayload } from "../types";

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const DEFAULT_TIMEOUT_MS = 30_000;

type Environment = Record<string, string | undefined>;

interface DeepSeekOptions {
  env?: Environment;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

function parseDelta(frame: string): string | undefined {
  const data = frame
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");

  if (!data || data === "[DONE]") {
    return undefined;
  }

  const payload = JSON.parse(data) as {
    choices?: Array<{ delta?: { content?: unknown } }>;
  };
  const content = payload.choices?.[0]?.delta?.content;
  return typeof content === "string" ? content : undefined;
}

async function* readOpenAiStream(response: Response): AsyncGenerator<string> {
  if (!response.body) {
    throw new Error("DeepSeek returned an empty stream");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });

    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const delta = parseDelta(frame);
      if (delta) {
        yield delta;
      }
    }

    if (done) {
      break;
    }
  }

  if (buffer.trim()) {
    const delta = parseDelta(buffer);
    if (delta) {
      yield delta;
    }
  }
}

export async function* streamDeepSeek(
  prompt: PromptPayload,
  options: DeepSeekOptions = {}
): AsyncGenerator<string> {
  const env = options.env ?? process.env;
  const apiKey = env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    if (env.ALLOW_MOCK_LLM === "true") {
      yield "This is a deterministic demo response. Configure DEEPSEEK_API_KEY for real AI answers.";
      return;
    }
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  );

  try {
    const response = await (options.fetchImpl ?? fetch)(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: prompt.system },
          ...prompt.messages
        ],
        stream: true
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`DeepSeek request failed with status ${response.status}`);
    }

    yield* readOpenAiStream(response);
  } finally {
    clearTimeout(timeout);
  }
}
