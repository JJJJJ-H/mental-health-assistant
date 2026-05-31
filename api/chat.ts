import { streamDeepSeek } from "../server/llm/deepseek";
import { buildPrompt } from "../server/prompt/buildPrompt";
import { retrieveSources } from "../server/rag/retriever";
import {
  detectCrisisRisk,
  limitHistory,
  validateChatRequest
} from "../server/safety/guardrails";
import { serializeSse } from "../server/stream/sse";
import type { ChatMessage, PromptPayload, RetrievedSource } from "../server/types";

const CRISIS_WARNING =
  "如果你有伤害自己或他人的想法、计划或行为，请立即联系当地急救服务、前往附近医疗机构急诊，或请可信赖的人陪伴你并协助联系专业机构。";

interface RequestLike {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  on?: (event: "aborted" | "error", listener: () => void) => void;
  off?: (event: "aborted" | "error", listener: () => void) => void;
}

interface ResponseLike {
  status?: (code: number) => ResponseLike;
  setHeader: (name: string, value: string) => void;
  write: (chunk: string) => void;
  end: (chunk?: string) => void;
}

interface ChatDependencies {
  validate: (body: unknown) => ChatMessage[];
  limit: (messages: ChatMessage[], limit?: number) => ChatMessage[];
  retrieve: (query: string) => RetrievedSource[];
  detectCrisis: (text: string) => boolean;
  build: (
    messages: ChatMessage[],
    sources: RetrievedSource[],
    crisisRisk: boolean
  ) => PromptPayload;
  streamLlm: (
    prompt: PromptPayload,
    signal?: AbortSignal
  ) => AsyncIterable<string>;
}

const defaultDependencies: ChatDependencies = {
  validate: validateChatRequest,
  limit: limitHistory,
  retrieve: retrieveSources,
  detectCrisis: detectCrisisRisk,
  build: buildPrompt,
  streamLlm: (prompt, signal) => streamDeepSeek(prompt, { signal })
};

function setStatus(response: ResponseLike, status: number): void {
  response.status?.(status);
}

function startSse(response: ResponseLike): void {
  response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  response.setHeader("Cache-Control", "no-cache, no-transform");
  response.setHeader("Connection", "keep-alive");
}

function sendJsonError(
  response: ResponseLike,
  status: number,
  error: string
): void {
  setStatus(response, status);
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify({ error }));
}

function truncateRawMessages(body: unknown, limit = 24): unknown {
  if (!body || typeof body !== "object" || !("messages" in body)) {
    return body;
  }

  const messages = (body as { messages?: unknown }).messages;
  if (!Array.isArray(messages)) {
    return body;
  }

  return { ...body, messages: messages.slice(-limit) };
}

function getRequestSignal(request: RequestLike): {
  signal?: AbortSignal;
  dispose: () => void;
} {
  if (request.signal) {
    return { signal: request.signal, dispose: () => undefined };
  }
  if (!request.on) {
    return { dispose: () => undefined };
  }

  const controller = new AbortController();
  const abort = () => controller.abort();
  request.on("aborted", abort);
  request.on("error", abort);
  return {
    signal: controller.signal,
    dispose: () => {
      request.off?.("aborted", abort);
      request.off?.("error", abort);
    }
  };
}

export function createChatHandler(
  overrides: Partial<ChatDependencies> = {}
): (request: RequestLike, response: ResponseLike) => Promise<void> {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async (request, response) => {
    if (request.method !== "POST") {
      response.setHeader("Allow", "POST");
      sendJsonError(response, 405, "Method not allowed");
      return;
    }

    let messages: ChatMessage[];
    try {
      messages = dependencies.validate(truncateRawMessages(request.body));
    } catch {
      sendJsonError(response, 400, "Invalid request");
      return;
    }

    const latestUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === "user");
    if (!latestUserMessage) {
      sendJsonError(response, 400, "Invalid request");
      return;
    }

    const { signal, dispose } = getRequestSignal(request);
    startSse(response);
    try {
      const limitedMessages = dependencies.limit(messages, 12);
      const sources = dependencies.retrieve(latestUserMessage.content);
      const crisisRisk = dependencies.detectCrisis(latestUserMessage.content);
      const prompt = dependencies.build(limitedMessages, sources, crisisRisk);

      response.write(serializeSse("sources", { sources }));
      if (crisisRisk) {
        response.write(serializeSse("warning", { message: CRISIS_WARNING }));
      }
      for await (const content of dependencies.streamLlm(prompt, signal)) {
        response.write(serializeSse("delta", { content }));
      }
      response.write(serializeSse("done", {}));
    } catch {
      response.write(
        serializeSse("error", { message: "Unable to complete the request" })
      );
    } finally {
      dispose();
      response.end();
    }
  };
}

export default createChatHandler();
