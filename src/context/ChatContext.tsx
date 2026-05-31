import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren
} from "react";
import { streamChat } from "../services/chatApi";
import {
  APP_STATE_VERSION,
  clearConversations,
  deleteConversation as removeConversation,
  loadAppState,
  saveAppState,
  searchConversations
} from "../services/storage";
import type {
  AppState,
  ChatMessage,
  CitationSource,
  Conversation,
  Theme
} from "../types/chat";

interface ChatContextValue {
  conversations: Conversation[];
  visibleConversations: Conversation[];
  activeConversation?: Conversation;
  activeConversationId?: string;
  isGenerating: boolean;
  searchQuery: string;
  theme: Theme;
  sidebarCollapsed: boolean;
  createConversation: () => string;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  clearAllConversations: () => void;
  setSearchQuery: (query: string) => void;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  sendMessage: (content: string) => Promise<void>;
  stopGeneration: () => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function now(): string {
  return new Date().toISOString();
}

function createEmptyConversation(): Conversation {
  const timestamp = now();
  return {
    id: newId("conversation"),
    title: "新对话",
    createdAt: timestamp,
    updatedAt: timestamp,
    messages: []
  };
}

function createMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: newId("message"),
    role,
    content,
    createdAt: now(),
    status: role === "assistant" ? "streaming" : "complete"
  };
}

function updateConversation(
  conversations: Conversation[],
  conversationId: string,
  update: (conversation: Conversation) => Conversation
): Conversation[] {
  return conversations.map((conversation) =>
    conversation.id === conversationId ? update(conversation) : conversation
  );
}

export function ChatProvider({ children }: PropsWithChildren) {
  const [initialState] = useState<AppState>(() => loadAppState());
  const [conversations, setConversations] = useState(initialState.conversations);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(
    initialState.conversations[0]?.id
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [theme, setTheme] = useState<Theme>(initialState.theme);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    initialState.sidebarCollapsed
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const assistantIdRef = useRef<string>();

  useEffect(() => {
    saveAppState({
      version: APP_STATE_VERSION,
      conversations,
      theme,
      sidebarCollapsed
    });
  }, [conversations, sidebarCollapsed, theme]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId),
    [activeConversationId, conversations]
  );

  const visibleConversations = useMemo(
    () => searchConversations(conversations, searchQuery),
    [conversations, searchQuery]
  );

  const createConversation = useCallback(() => {
    const conversation = createEmptyConversation();
    setConversations((current) => [conversation, ...current]);
    setActiveConversationId(conversation.id);
    return conversation.id;
  }, []);

  const selectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations((current) => {
      const next = removeConversation(current, id);
      setActiveConversationId((activeId) =>
        activeId === id ? next[0]?.id : activeId
      );
      return next;
    });
  }, []);

  const clearAllConversations = useCallback(() => {
    setConversations((current) => clearConversations(current));
    setActiveConversationId(undefined);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((current) => !current);
  }, []);

  const updateAssistant = useCallback(
    (
      conversationId: string,
      assistantId: string,
      update: (message: ChatMessage) => ChatMessage
    ) => {
      setConversations((current) =>
        updateConversation(current, conversationId, (conversation) => ({
          ...conversation,
          updatedAt: now(),
          messages: conversation.messages.map((message) =>
            message.id === assistantId ? update(message) : message
          )
        }))
      );
    },
    []
  );

  const sendMessage = useCallback(
    async (rawContent: string) => {
      const content = rawContent.trim();
      if (!content || isGenerating) {
        return;
      }

      const conversationId = activeConversationId ?? createConversation();
      const userMessage = createMessage("user", content);
      const assistantMessage = createMessage("assistant", "");
      assistantIdRef.current = assistantMessage.id;
      const existingMessages =
        conversations.find((conversation) => conversation.id === conversationId)
          ?.messages ?? [];
      const requestMessages = [...existingMessages, userMessage].map(
        ({ role, content: messageContent }) => ({ role, content: messageContent })
      );

      setConversations((current) =>
        updateConversation(current, conversationId, (conversation) => ({
          ...conversation,
          title: conversation.messages.length === 0 ? content.slice(0, 24) : conversation.title,
          updatedAt: now(),
          messages: [...conversation.messages, userMessage, assistantMessage]
        }))
      );
      setIsGenerating(true);

      const controller = new AbortController();
      abortRef.current = controller;
      let sources: CitationSource[] = [];

      try {
        await streamChat(requestMessages, controller.signal, (event) => {
          if (event.event === "sources") {
            sources = event.data.sources;
            updateAssistant(conversationId, assistantMessage.id, (message) => ({
              ...message,
              sources
            }));
          } else if (event.event === "delta") {
            updateAssistant(conversationId, assistantMessage.id, (message) => ({
              ...message,
              content: `${message.content}${event.data.content}`,
              sources
            }));
          } else if (event.event === "warning") {
            updateAssistant(conversationId, assistantMessage.id, (message) => ({
              ...message,
              warning: event.data.message
            }));
          } else if (event.event === "done") {
            updateAssistant(conversationId, assistantMessage.id, (message) => ({
              ...message,
              status: "complete"
            }));
          } else if (event.event === "error") {
            updateAssistant(conversationId, assistantMessage.id, (message) => ({
              ...message,
              content: message.content || event.data.message,
              status: "error"
            }));
          }
        });
      } catch {
        if (!controller.signal.aborted) {
          updateAssistant(conversationId, assistantMessage.id, (message) => ({
            ...message,
            content: message.content || "暂时无法获得回答，请稍后重试。",
            status: "error"
          }));
        }
      } finally {
        if (controller.signal.aborted) {
          updateAssistant(conversationId, assistantMessage.id, (message) => ({
            ...message,
            status: "stopped"
          }));
        }
        abortRef.current = null;
        assistantIdRef.current = undefined;
        setIsGenerating(false);
      }
    },
    [
      activeConversationId,
      conversations,
      createConversation,
      isGenerating,
      updateAssistant
    ]
  );

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const value = useMemo<ChatContextValue>(
    () => ({
      conversations,
      visibleConversations,
      activeConversation,
      activeConversationId,
      isGenerating,
      searchQuery,
      theme,
      sidebarCollapsed,
      createConversation,
      selectConversation,
      deleteConversation,
      clearAllConversations,
      setSearchQuery,
      setTheme,
      toggleSidebar,
      sendMessage,
      stopGeneration
    }),
    [
      activeConversation,
      activeConversationId,
      clearAllConversations,
      conversations,
      createConversation,
      deleteConversation,
      isGenerating,
      searchQuery,
      selectConversation,
      sendMessage,
      sidebarCollapsed,
      stopGeneration,
      theme,
      toggleSidebar,
      visibleConversations
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat 必须在 ChatProvider 内使用");
  }
  return context;
}
