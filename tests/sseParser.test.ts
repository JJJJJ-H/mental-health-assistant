import { afterEach, describe, expect, it, vi } from "vitest";

import { streamChat } from "../src/services/chatApi";
import { parseSseStream } from "../src/services/sseParser";
import type { ChatStreamEvent } from "../src/types/chat";

function streamFromChunks(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(chunk));
      controller.close();
    }
  });
}

describe("parseSseStream", () => {
  it("parses named events when UTF-8 bytes and SSE frames are split across chunks", async () => {
    const encoded = new TextEncoder().encode(
      'event: delta\ndata: {"content":"你好"}\n\nevent: done\ndata: {}\n\n'
    );
    const firstChineseByte = encoded.indexOf(0xe4);
    const chunks = [
      encoded.slice(0, firstChineseByte + 1),
      encoded.slice(firstChineseByte + 1, firstChineseByte + 4),
      encoded.slice(firstChineseByte + 4, encoded.length - 5),
      encoded.slice(encoded.length - 5)
    ];

    const events: ChatStreamEvent[] = [];
    for await (const event of parseSseStream(streamFromChunks(chunks))) {
      events.push(event);
    }

    expect(events).toEqual([
      { event: "delta", data: { content: "你好" } },
      { event: "done", data: {} }
    ]);
  });

  it("joins multiple data lines and skips malformed frames", async () => {
    const encoded = new TextEncoder().encode(
      "data: ignored without a named event\n\n" +
        "event: delta\n" +
        'data: {"content":\n' +
        'data: "hello"}\n\n' +
        "event: delta\n" +
        "data: not-json\n\n"
    );

    const events: ChatStreamEvent[] = [];
    for await (const event of parseSseStream(streamFromChunks([encoded]))) {
      events.push(event);
    }

    expect(events).toEqual([{ event: "delta", data: { content: "hello" } }]);
  });
});

describe("streamChat", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts messages to the chat endpoint and forwards parsed events", async () => {
    const signal = new AbortController().signal;
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        streamFromChunks([
          new TextEncoder().encode(
            'event: delta\ndata: {"content":"你好"}\n\nevent: done\ndata: {}\n\n'
          )
        ]),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    const events: ChatStreamEvent[] = [];

    await streamChat([{ role: "user", content: "你好" }], signal, (event) => {
      events.push(event);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ messages: [{ role: "user", content: "你好" }] }),
        signal
      })
    );
    expect(events).toEqual([
      { event: "delta", data: { content: "你好" } },
      { event: "done", data: {} }
    ]);
  });
});
