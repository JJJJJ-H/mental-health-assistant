import type {
  ChatStreamEvent,
  CitationSource,
  InterruptPayload,
  SuggestedAction
} from "../types/chat";

function parseFrame(frame: string): ChatStreamEvent | undefined {
  let isErrorEvent = false;
  const dataLines: string[] = [];

  for (const line of frame.split(/\r?\n/)) {
    if (line.startsWith("event:")) {
      isErrorEvent = line.slice("event:".length).trim() === "error";
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trimStart());
    }
  }

  const payload = dataLines.join("\n");
  if (!payload || payload === "[DONE]") return undefined;

  try {
    const data = JSON.parse(payload) as Record<string, unknown>;
    if (isErrorEvent) {
      return { event: "error", message: String(data.message ?? "流式错误") };
    }
    if (data.event === "tool") {
      return { event: "tool", name: String(data.name ?? "") };
    }
    if (data.event === "citations") {
      return { event: "citations", items: (data.items as CitationSource[]) ?? [] };
    }
    if (data.event === "actions") {
      return { event: "actions", items: (data.items as SuggestedAction[]) ?? [] };
    }
    if (data.event === "interrupt") {
      const rest = { ...data };
      delete rest.event;
      return { event: "interrupt", data: rest as InterruptPayload };
    }
    if (data.event === "done") {
      return { event: "done", conversation_id: Number(data.conversation_id) };
    }
    if (typeof data.delta === "string") {
      return { event: "delta", text: data.delta };
    }
    if (typeof data.message === "string" && data.event === undefined) {
      return { event: "error", message: data.message };
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export async function* parseSseStream(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<ChatStreamEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        buffer += decoder.decode();
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        const event = parseFrame(frame);
        if (event) yield event;
      }
    }
    if (buffer.trim()) {
      const event = parseFrame(buffer);
      if (event) yield event;
    }
  } finally {
    reader.releaseLock();
  }
}
