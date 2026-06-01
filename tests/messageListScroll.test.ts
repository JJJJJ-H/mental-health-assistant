import { describe, expect, it } from "vitest";
import {
  findFirstChangedMessageIndex,
  isNearListBottom
} from "../src/components/chat/messageListScroll";
import type { ChatMessage } from "../src/types/chat";

function message(id: string, content: string): ChatMessage {
  return {
    id,
    role: "assistant",
    content,
    createdAt: "2026-06-01T00:00:00.000Z",
    status: "streaming"
  };
}

describe("message list scrolling", () => {
  it("treats a small distance from the bottom as eligible for output following", () => {
    expect(
      isNearListBottom({
        clientHeight: 600,
        scrollHeight: 1200,
        scrollTop: 550
      })
    ).toBe(true);
    expect(
      isNearListBottom({
        clientHeight: 600,
        scrollHeight: 1200,
        scrollTop: 400
      })
    ).toBe(false);
  });

  it("finds the first row whose measured height may have changed", () => {
    const previous = [message("one", "first"), message("two", "second")];
    const current = [previous[0]!, message("two", "second and growing")];

    expect(findFirstChangedMessageIndex(previous, current)).toBe(1);
  });

  it("returns the appended row when a message is added", () => {
    const previous = [message("one", "first")];
    const current = [...previous, message("two", "")];

    expect(findFirstChangedMessageIndex(previous, current)).toBe(1);
  });
});
