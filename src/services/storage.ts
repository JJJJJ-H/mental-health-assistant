import type { AppState, ChatMessage, Conversation, Theme } from "../types/chat";

export const APP_STATE_VERSION = 1;
export const STORAGE_KEY = "mental-health-assistant:state";

function createDefaultState(): AppState {
  return {
    version: APP_STATE_VERSION,
    conversations: [],
    theme: "system",
    sidebarCollapsed: typeof window !== "undefined" && window.innerWidth <= 760
  };
}

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function isMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<ChatMessage>;
  return (
    typeof message.id === "string" &&
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string" &&
    typeof message.createdAt === "string"
  );
}

function isConversation(value: unknown): value is Conversation {
  if (!value || typeof value !== "object") return false;
  const conversation = value as Partial<Conversation>;
  return (
    typeof conversation.id === "string" &&
    typeof conversation.title === "string" &&
    typeof conversation.createdAt === "string" &&
    typeof conversation.updatedAt === "string" &&
    Array.isArray(conversation.messages) &&
    conversation.messages.every(isMessage)
  );
}

function isAppState(value: unknown): value is AppState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<AppState>;
  return (
    candidate.version === APP_STATE_VERSION &&
    Array.isArray(candidate.conversations) &&
    candidate.conversations.every(isConversation) &&
    isTheme(candidate.theme) &&
    typeof candidate.sidebarCollapsed === "boolean"
  );
}

export function loadAppState(storage: Storage = localStorage): AppState {
  const serialized = storage.getItem(STORAGE_KEY);
  if (!serialized) {
    return createDefaultState();
  }

  try {
    const parsed: unknown = JSON.parse(serialized);
    return isAppState(parsed) ? parsed : createDefaultState();
  } catch {
    return createDefaultState();
  }
}

export function saveAppState(state: AppState, storage: Storage = localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function searchConversations(
  conversations: Conversation[],
  keyword: string
): Conversation[] {
  const normalizedKeyword = keyword.trim().toLocaleLowerCase();
  if (!normalizedKeyword) {
    return conversations;
  }

  return conversations.filter((conversation) => {
    const searchableText = [
      conversation.title,
      ...conversation.messages.map((message) => message.content)
    ]
      .join("\n")
      .toLocaleLowerCase();

    return searchableText.includes(normalizedKeyword);
  });
}

export function deleteConversation(
  conversations: Conversation[],
  conversationId: string
): Conversation[] {
  return conversations.filter((conversation) => conversation.id !== conversationId);
}

export function clearConversations(conversations: Conversation[] = []): Conversation[] {
  void conversations;
  return [];
}
