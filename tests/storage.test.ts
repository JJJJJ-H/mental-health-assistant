import { beforeEach, describe, expect, it } from "vitest";

import type { Conversation } from "../src/types/chat";
import {
  APP_STATE_VERSION,
  STORAGE_KEY,
  clearConversations,
  deleteConversation,
  loadAppState,
  saveAppState,
  searchConversations
} from "../src/services/storage";

const conversation: Conversation = {
  id: "conversation-1",
  title: "改善睡眠",
  createdAt: "2026-05-31T08:00:00.000Z",
  updatedAt: "2026-05-31T08:01:00.000Z",
  messages: [
    {
      id: "message-1",
      role: "user",
      content: "最近睡不好，有什么温和的方法？",
      createdAt: "2026-05-31T08:00:00.000Z"
    }
  ]
};

describe("storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns an empty default state when storage is empty", () => {
    expect(loadAppState(localStorage)).toEqual({
      version: APP_STATE_VERSION,
      conversations: [],
      theme: "system",
      sidebarCollapsed: false
    });
  });

  it("round-trips versioned state", () => {
    const state = {
      version: APP_STATE_VERSION,
      conversations: [conversation],
      theme: "dark" as const,
      sidebarCollapsed: true
    };

    saveAppState(state, localStorage);

    expect(loadAppState(localStorage)).toEqual(state);
  });

  it("recovers from malformed JSON", () => {
    localStorage.setItem(STORAGE_KEY, "{broken");

    expect(loadAppState(localStorage).conversations).toEqual([]);
  });

  it("recovers from malformed nested conversation data", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: APP_STATE_VERSION,
        conversations: [{}],
        theme: "system",
        sidebarCollapsed: false
      })
    );

    expect(loadAppState(localStorage).conversations).toEqual([]);
  });

  it("recovers when the stored schema version is unsupported", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 999, conversations: [conversation] })
    );

    expect(loadAppState(localStorage).conversations).toEqual([]);
  });

  it("searches titles and message content case-insensitively", () => {
    const englishConversation: Conversation = {
      ...conversation,
      id: "conversation-2",
      title: "Stress Notes",
      messages: [{ ...conversation.messages[0], content: "Try a gentle break" }]
    };

    expect(searchConversations([conversation, englishConversation], "睡眠")).toEqual([
      conversation
    ]);
    expect(searchConversations([conversation, englishConversation], "GENTLE")).toEqual([
      englishConversation
    ]);
  });

  it("deletes one conversation without mutating the original list", () => {
    const conversations = [conversation, { ...conversation, id: "conversation-2" }];

    expect(deleteConversation(conversations, "conversation-1")).toEqual([
      { ...conversation, id: "conversation-2" }
    ]);
    expect(conversations).toHaveLength(2);
  });

  it("clears all conversations", () => {
    expect(clearConversations([conversation])).toEqual([]);
  });
});
