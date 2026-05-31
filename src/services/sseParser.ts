import type { ChatStreamEvent } from "../types/chat";

const EVENT_NAMES = new Set<ChatStreamEvent["event"]>([
  "sources",
  "delta",
  "warning",
  "done",
  "error"
]);

function parseFrame(frame: string): ChatStreamEvent | undefined {
  let eventName: string | undefined;
  const dataLines: string[] = [];

  for (const line of frame.split(/\r?\n/)) {
    if (line.startsWith("event:")) {
      eventName = line.slice("event:".length).trimStart();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trimStart());
    }
  }

  if (!eventName || !EVENT_NAMES.has(eventName as ChatStreamEvent["event"])) {
    return undefined;
  }

  try {
    return {
      event: eventName,
      data: JSON.parse(dataLines.join("\n"))
    } as ChatStreamEvent;
  } catch {
    return undefined;
  }
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
        if (event) {
          yield event;
        }
      }
    }

    if (buffer.trim()) {
      const event = parseFrame(buffer);
      if (event) {
        yield event;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
