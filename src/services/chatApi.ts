import type { ChatRequestMessage, ChatStreamEvent } from "../types/chat";
import { parseSseStream } from "./sseParser";

export async function streamChat(
  messages: ChatRequestMessage[],
  signal: AbortSignal,
  onEvent: (event: ChatStreamEvent) => void
): Promise<void> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream"
    },
    body: JSON.stringify({ messages }),
    signal
  });

  if (!response.ok) {
    throw new Error(`聊天请求失败 (${response.status})`);
  }

  if (!response.body) {
    throw new Error("聊天响应没有可读取的数据流");
  }

  for await (const event of parseSseStream(response.body)) {
    onEvent(event);
  }
}
