import { act, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatProvider, useChat } from "../src/context/ChatContext";
import type { ChatStreamEvent } from "../src/types/chat";

const streamChatMock = vi.fn();

vi.mock("../src/services/chatApi", () => ({
  streamChat: (...args: unknown[]) => streamChatMock(...args)
}));

function wrapper({ children }: PropsWithChildren) {
  return <ChatProvider>{children}</ChatProvider>;
}

describe("ChatProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    streamChatMock.mockReset();
  });

  it("creates an empty conversation", () => {
    const { result } = renderHook(() => useChat(), { wrapper });

    act(() => result.current.createConversation());

    expect(result.current.conversations).toHaveLength(1);
    expect(result.current.activeConversation?.messages).toEqual([]);
  });

  it("applies streamed deltas and sources to the assistant answer", async () => {
    streamChatMock.mockImplementation(
      async (
        _messages: unknown,
        _signal: AbortSignal,
        onEvent: (event: ChatStreamEvent) => void
      ) => {
        onEvent({
          event: "sources",
          data: {
            sources: [
              {
                id: "sleep-hygiene-1",
                documentId: "sleep-hygiene",
                index: 1,
                title: "睡眠卫生与日常调整",
                source: "内置心理健康科普知识库",
                excerpt: "固定起床时间。",
                score: 0.8
              }
            ]
          }
        });
        onEvent({ event: "delta", data: { content: "可以先固定起床时间。[1]" } });
        onEvent({ event: "done", data: {} });
      }
    );
    const { result } = renderHook(() => useChat(), { wrapper });

    await act(async () => {
      await result.current.sendMessage("最近睡不好");
    });

    expect(result.current.activeConversation?.messages).toHaveLength(2);
    expect(result.current.activeConversation?.messages[1]).toMatchObject({
      role: "assistant",
      content: "可以先固定起床时间。[1]",
      status: "complete",
      sources: [{ documentId: "sleep-hygiene" }]
    });
  });

  it("batches streamed deltas before updating the assistant answer", async () => {
    vi.useFakeTimers();
    let releaseStream!: () => void;
    streamChatMock.mockImplementation(
      async (
        _messages: unknown,
        _signal: AbortSignal,
        onEvent: (event: ChatStreamEvent) => void
      ) => {
        onEvent({ event: "delta", data: { content: "第一段" } });
        onEvent({ event: "delta", data: { content: "第二段" } });
        await new Promise<void>((resolve) => {
          releaseStream = resolve;
        });
        onEvent({ event: "done", data: {} });
      }
    );
    const { result } = renderHook(() => useChat(), { wrapper });

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.sendMessage("测试流式缓冲");
    });
    await act(async () => Promise.resolve());
    expect(result.current.activeConversation?.messages[1]?.content).toBe("");

    act(() => vi.advanceTimersByTime(40));
    expect(result.current.activeConversation?.messages[1]?.content).toBe("第一段第二段");

    await act(async () => {
      releaseStream();
      await pending;
    });
    vi.useRealTimers();
  });

  it("preserves a partial answer when generation is stopped", async () => {
    streamChatMock.mockImplementation(
      async (
        _messages: unknown,
        signal: AbortSignal,
        onEvent: (event: ChatStreamEvent) => void
      ) => {
        onEvent({ event: "delta", data: { content: "部分回答" } });
        await new Promise<void>((resolve) => {
          signal.addEventListener("abort", () => resolve(), { once: true });
        });
      }
    );
    const { result } = renderHook(() => useChat(), { wrapper });

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.sendMessage("测试停止");
    });
    await act(async () => Promise.resolve());
    act(() => result.current.stopGeneration());
    await act(async () => pending);

    expect(result.current.activeConversation?.messages[1]).toMatchObject({
      content: "部分回答",
      status: "stopped"
    });
  });

  it("marks an answer as failed when the stream closes without a terminal event", async () => {
    streamChatMock.mockImplementation(
      async (
        _messages: unknown,
        _signal: AbortSignal,
        onEvent: (event: ChatStreamEvent) => void
      ) => {
        onEvent({ event: "delta", data: { content: "未完成回答" } });
      }
    );
    const { result } = renderHook(() => useChat(), { wrapper });

    await act(async () => {
      await result.current.sendMessage("测试断流");
    });

    expect(result.current.activeConversation?.messages[1]).toMatchObject({
      content: "未完成回答",
      status: "error"
    });
  });

  it("updates preferences and removes conversations", () => {
    const { result } = renderHook(() => useChat(), { wrapper });

    act(() => {
      result.current.createConversation();
      result.current.setTheme("dark");
      result.current.toggleSidebar();
    });

    expect(result.current.theme).toBe("dark");
    expect(result.current.sidebarCollapsed).toBe(true);

    act(() => result.current.deleteConversation(result.current.conversations[0]!.id));
    expect(result.current.conversations).toEqual([]);
  });
});
