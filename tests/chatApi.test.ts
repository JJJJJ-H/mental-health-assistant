import { describe, expect, it } from "vitest";
import { createChatHandler } from "../api/chat";
import { getHealth } from "../api/health";
import { streamDeepSeek } from "../server/llm/deepseek";
import type { PromptPayload, RetrievedSource } from "../server/types";

function createResponse() {
  const headers = new Map<string, string>();
  let body = "";
  let statusCode = 200;

  return {
    get body() {
      return body;
    },
    get statusCode() {
      return statusCode;
    },
    headers,
    status(code: number) {
      statusCode = code;
      return this;
    },
    setHeader(name: string, value: string) {
      headers.set(name, value);
    },
    write(chunk: string) {
      body += chunk;
    },
    end(chunk = "") {
      body += chunk;
    }
  };
}

const source: RetrievedSource = {
  id: "sleep-1",
  documentId: "sleep",
  index: 1,
  title: "Sleep hygiene",
  source: "Built-in guide",
  excerpt: "Keep a consistent schedule.",
  score: 0.8
};

const prompt: PromptPayload = {
  system: "Educational assistant",
  messages: [{ role: "user", content: "I cannot sleep" }],
  sources: [source]
};

describe("chat serverless handler", () => {
  it("rejects non-POST requests", async () => {
    const response = createResponse();
    await createChatHandler()({ method: "GET" }, response);

    expect(response.statusCode).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
  });

  it("retrieves from the last user message and streams named events", async () => {
    const response = createResponse();
    let query = "";
    let upstreamMessages = 0;
    const handler = createChatHandler({
      validate: () =>
        Array.from({ length: 14 }, (_, index) => ({
          role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
          content: index === 12 ? "last user query" : String(index)
        })),
      retrieve: (value) => {
        query = value;
        return [source];
      },
      detectCrisis: () => true,
      build: (messages, sources) => {
        upstreamMessages = messages.length;
        return { system: "prompt", messages, sources };
      },
      streamLlm: async function* () {
        yield "hello";
        yield " world";
      }
    });

    await handler({ method: "POST", body: { messages: [] } }, response);

    expect(query).toBe("last user query");
    expect(upstreamMessages).toBe(12);
    expect(response.headers.get("Content-Type")).toContain("text/event-stream");
    expect(response.body).toContain("event: sources");
    expect(response.body).toContain("event: warning");
    expect(response.body).toContain('event: delta\ndata: {"content":"hello"}');
    expect(response.body).toContain("event: done");
  });
});

describe("DeepSeek adapter", () => {
  it("does not silently mock when the API key is missing", async () => {
    const consume = async () => {
      for await (const chunk of streamDeepSeek(prompt, { env: {} })) {
        void chunk;
      }
    };

    await expect(consume()).rejects.toThrow("DEEPSEEK_API_KEY");
  });

  it("allows a deterministic mock only when explicitly enabled", async () => {
    const read = async () => {
      const chunks: string[] = [];
      for await (const chunk of streamDeepSeek(prompt, {
        env: { ALLOW_MOCK_LLM: "true" }
      })) {
        chunks.push(chunk);
      }
      return chunks.join("");
    };

    await expect(read()).resolves.toContain("demo");
    await expect(read()).resolves.toBe(await read());
  });

  it("parses OpenAI-compatible data events from DeepSeek", async () => {
    const encoder = new TextEncoder();
    let requestInit: RequestInit | undefined;
    const fetchImpl: typeof fetch = async (_input, init) => {
      requestInit = init;
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode('data: {"choices":[{"delta":{"content":"你"}}]}\n\n')
            );
            controller.enqueue(
              encoder.encode('data: {"choices":[{"delta":{"content":"好"}}]}\n\ndata: [DONE]\n\n')
            );
            controller.close();
          }
        }),
        { status: 200 }
      );
    };

    const chunks: string[] = [];
    for await (const chunk of streamDeepSeek(prompt, {
      env: { DEEPSEEK_API_KEY: "server-secret" },
      fetchImpl
    })) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(["你", "好"]);
    expect(requestInit?.headers).toMatchObject({
      Authorization: "Bearer server-secret"
    });
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({ stream: true });
  });
});

describe("health endpoint", () => {
  it("reports configuration flags without exposing the key", () => {
    const result = getHealth({
      DEEPSEEK_API_KEY: "server-secret",
      ALLOW_MOCK_LLM: "true"
    });

    expect(result).toEqual({
      status: "ok",
      configured: true,
      mockAllowed: true
    });
    expect(JSON.stringify(result)).not.toContain("server-secret");
  });
});
