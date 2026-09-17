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
import {
  createRefund,
  createTicket,
  listConversations,
  listMessages,
  streamChat,
  streamResume
} from "../services/chatApi";
import { loadPrefs, PREFS_VERSION, savePrefs } from "../services/storage";
import type {
  ChatMessage,
  ChatStreamEvent,
  Conversation,
  ConversationSummary,
  Theme
} from "../types/chat";

interface ChatContextValue {
  userId: string;
  conversations: Conversation[];
  serverList: ConversationSummary[];
  activeConversation?: Conversation;
  activeConversationId?: string;
  isGenerating: boolean;
  searchQuery: string;
  theme: Theme;
  sidebarCollapsed: boolean;
  createConversation: () => string;
  selectConversation: (id: string) => Promise<void>;
  selectServerConversation: (serverId: number) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  sendMessage: (content: string) => Promise<void>;
  stopGeneration: () => void;
  resumeWithOrder: (orderId: string) => Promise<void>;
  resumeWithConfirm: (confirmed: boolean) => Promise<void>;
  submitTicket: (ticketType: "售后" | "投诉" | "咨询", description: string) => Promise<string>;
  submitRefund: (
    orderId: string,
    reason: "七天无理由" | "质量问题" | "发错货" | "不想要了" | "其他"
  ) => Promise<string>;
  transferHuman: () => void;
  refreshServerList: () => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);
const STREAM_RENDER_INTERVAL_MS = 32;

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function now(): string {
  return new Date().toISOString();
}

function createEmptyConversation(): Conversation {
  const timestamp = now();
  return {
    id: newId("local"),
    serverId: null,
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
  const [prefs] = useState(() => loadPrefs());
  const [userId] = useState(prefs.userId);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [serverList, setServerList] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [theme, setTheme] = useState<Theme>(prefs.theme);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(prefs.sidebarCollapsed);
  const [isGenerating, setIsGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const activeRef = useRef<{ localId: string; serverId: number | null }>({
    localId: "",
    serverId: null
  });

  useEffect(() => {
    savePrefs({
      version: PREFS_VERSION,
      userId,
      theme,
      sidebarCollapsed
    });
  }, [sidebarCollapsed, theme, userId]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const refreshServerList = useCallback(async () => {
    const items = await listConversations(userId);
    setServerList(items);
  }, [userId]);

  useEffect(() => {
    void refreshServerList();
  }, [refreshServerList]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId),
    [activeConversationId, conversations]
  );

  const createConversation = useCallback(() => {
    const conversation = createEmptyConversation();
    setConversations((current) => [conversation, ...current]);
    setActiveConversationId(conversation.id);
    activeRef.current = { localId: conversation.id, serverId: null };
    return conversation.id;
  }, []);

  const selectConversation = useCallback(async (id: string) => {
    setActiveConversationId(id);
    const found = conversations.find((c) => c.id === id);
    activeRef.current = { localId: id, serverId: found?.serverId ?? null };
  }, [conversations]);

  const selectServerConversation = useCallback(
    async (serverId: number) => {
      const existing = conversations.find((c) => c.serverId === serverId);
      if (existing) {
        setActiveConversationId(existing.id);
        activeRef.current = { localId: existing.id, serverId };
        return;
      }
      const items = await listMessages(serverId);
      const summary = serverList.find((s) => s.id === serverId);
      const conversation: Conversation = {
        id: `server-${serverId}`,
        serverId,
        title: summary?.preview?.slice(0, 24) || `会话 #${serverId}`,
        createdAt: summary?.updated_at || now(),
        updatedAt: summary?.updated_at || now(),
        messages: items.map((m) => ({
          id: newId("message"),
          role: m.role === "user" ? "user" : "assistant",
          content: m.content,
          createdAt: m.created_at || now(),
          status: "complete" as const
        }))
      };
      setConversations((current) => [conversation, ...current.filter((c) => c.serverId !== serverId)]);
      setActiveConversationId(conversation.id);
      activeRef.current = { localId: conversation.id, serverId };
    },
    [conversations, serverList]
  );

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

  const bindServerId = useCallback((localId: string, serverId: number) => {
    activeRef.current = { localId, serverId };
    setConversations((current) =>
      updateConversation(current, localId, (conversation) => ({
        ...conversation,
        serverId,
        id: conversation.id.startsWith("server-") ? conversation.id : conversation.id
      }))
    );
  }, []);

  const handleStreamEvents = useCallback(
    (
      conversationId: string,
      assistantId: string,
      onEvent: ChatStreamEvent,
      ctx: {
        bufferedDelta: { value: string };
        scheduleFlush: () => void;
        flush: () => void;
        setTerminal: () => void;
      }
    ) => {
      if (onEvent.event === "tool") {
        updateAssistant(conversationId, assistantId, (message) => ({
          ...message,
          tools: [...(message.tools ?? []), { name: onEvent.name }]
        }));
      } else if (onEvent.event === "delta") {
        ctx.bufferedDelta.value += onEvent.text;
        ctx.scheduleFlush();
      } else if (onEvent.event === "citations") {
        updateAssistant(conversationId, assistantId, (message) => ({
          ...message,
          sources: onEvent.items
        }));
      } else if (onEvent.event === "actions") {
        updateAssistant(conversationId, assistantId, (message) => ({
          ...message,
          actions: onEvent.items
        }));
      } else if (onEvent.event === "interrupt") {
        ctx.flush();
        ctx.setTerminal();
        if (onEvent.data.conversation_id) {
          bindServerId(conversationId, onEvent.data.conversation_id);
        }
        updateAssistant(conversationId, assistantId, (message) => ({
          ...message,
          interrupt: onEvent.data,
          status: "interrupted"
        }));
      } else if (onEvent.event === "done") {
        ctx.flush();
        ctx.setTerminal();
        bindServerId(conversationId, onEvent.conversation_id);
        updateAssistant(conversationId, assistantId, (message) => ({
          ...message,
          status: "complete"
        }));
      } else if (onEvent.event === "error") {
        ctx.flush();
        ctx.setTerminal();
        updateAssistant(conversationId, assistantId, (message) => ({
          ...message,
          content: message.content || onEvent.message,
          status: "error"
        }));
      }
    },
    [bindServerId, updateAssistant]
  );

  const runStream = useCallback(
    async (
      conversationId: string,
      assistantMessage: ChatMessage,
      starter: (signal: AbortSignal, onEvent: (e: ChatStreamEvent) => void) => Promise<void>
    ) => {
      setIsGenerating(true);
      const controller = new AbortController();
      abortRef.current = controller;
      let terminalReceived = false;
      const bufferedDelta = { value: "" };
      let renderTimer: ReturnType<typeof setTimeout> | undefined;

      const flush = () => {
        if (!bufferedDelta.value) return;
        const chunk = bufferedDelta.value;
        bufferedDelta.value = "";
        updateAssistant(conversationId, assistantMessage.id, (message) => ({
          ...message,
          content: `${message.content}${chunk}`
        }));
      };

      const scheduleFlush = () => {
        if (renderTimer !== undefined) return;
        renderTimer = setTimeout(() => {
          renderTimer = undefined;
          flush();
        }, STREAM_RENDER_INTERVAL_MS);
      };

      try {
        await starter(controller.signal, (event) => {
          handleStreamEvents(conversationId, assistantMessage.id, event, {
            bufferedDelta,
            scheduleFlush,
            flush,
            setTerminal: () => {
              terminalReceived = true;
            }
          });
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
        if (renderTimer !== undefined) clearTimeout(renderTimer);
        flush();
        if (controller.signal.aborted) {
          updateAssistant(conversationId, assistantMessage.id, (message) => ({
            ...message,
            status: "stopped"
          }));
        } else if (!terminalReceived) {
          updateAssistant(conversationId, assistantMessage.id, (message) => ({
            ...message,
            status: message.status === "interrupted" ? "interrupted" : "error"
          }));
        }
        abortRef.current = null;
        setIsGenerating(false);
        void refreshServerList();
      }
    },
    [handleStreamEvents, refreshServerList, updateAssistant]
  );

  const sendMessage = useCallback(
    async (rawContent: string) => {
      const content = rawContent.trim();
      if (!content || isGenerating) return;

      const conversationId = activeConversationId ?? createConversation();
      const serverId =
        conversations.find((c) => c.id === conversationId)?.serverId ??
        activeRef.current.serverId;
      const userMessage = createMessage("user", content);
      const assistantMessage = createMessage("assistant", "");

      setConversations((current) => {
        const exists = current.some((c) => c.id === conversationId);
        if (!exists) {
          const conversation = createEmptyConversation();
          conversation.id = conversationId;
          return [
            {
              ...conversation,
              title: content.slice(0, 24),
              messages: [userMessage, assistantMessage]
            },
            ...current
          ];
        }
        return updateConversation(current, conversationId, (conversation) => ({
          ...conversation,
          title:
            conversation.messages.length === 0 ? content.slice(0, 24) : conversation.title,
          updatedAt: now(),
          messages: [...conversation.messages, userMessage, assistantMessage]
        }));
      });
      setActiveConversationId(conversationId);
      activeRef.current = { localId: conversationId, serverId };

      await runStream(conversationId, assistantMessage, (signal, onEvent) =>
        streamChat(
          { user_id: userId, message: content, conversation_id: serverId },
          signal,
          onEvent
        )
      );
    },
    [
      activeConversationId,
      conversations,
      createConversation,
      isGenerating,
      runStream,
      userId
    ]
  );

  const resumeWithOrder = useCallback(
    async (orderId: string) => {
      const serverId = activeRef.current.serverId;
      const conversationId = activeRef.current.localId || activeConversationId;
      if (!serverId || !conversationId || isGenerating) return;
      const assistantMessage = createMessage("assistant", "");
      setConversations((current) =>
        updateConversation(current, conversationId, (conversation) => ({
          ...conversation,
          updatedAt: now(),
          messages: [...conversation.messages, assistantMessage]
        }))
      );
      await runStream(conversationId, assistantMessage, (signal, onEvent) =>
        streamResume({ conversation_id: serverId, order_id: orderId }, signal, onEvent)
      );
    },
    [activeConversationId, isGenerating, runStream]
  );

  const resumeWithConfirm = useCallback(
    async (confirmed: boolean) => {
      const serverId = activeRef.current.serverId;
      const conversationId = activeRef.current.localId || activeConversationId;
      if (!serverId || !conversationId || isGenerating) return;
      const assistantMessage = createMessage("assistant", "");
      setConversations((current) =>
        updateConversation(current, conversationId, (conversation) => ({
          ...conversation,
          updatedAt: now(),
          messages: [...conversation.messages, assistantMessage]
        }))
      );
      await runStream(conversationId, assistantMessage, (signal, onEvent) =>
        streamResume({ conversation_id: serverId, confirmed }, signal, onEvent)
      );
    },
    [activeConversationId, isGenerating, runStream]
  );

  const submitTicket = useCallback(
    async (ticketType: "售后" | "投诉" | "咨询", description: string) => {
      const serverId = activeRef.current.serverId;
      if (!serverId) throw new Error("无会话");
      const result = await createTicket({
        conversation_id: serverId,
        ticket_type: ticketType,
        description
      });
      const conversationId = activeRef.current.localId;
      if (conversationId) {
        const msg = createMessage("assistant", `工单已创建: ${result.ticket_no}`);
        msg.status = "complete";
        setConversations((current) =>
          updateConversation(current, conversationId, (conversation) => ({
            ...conversation,
            messages: [...conversation.messages, msg]
          }))
        );
      }
      return result.ticket_no;
    },
    []
  );

  const submitRefund = useCallback(
    async (
      orderId: string,
      reason: "七天无理由" | "质量问题" | "发错货" | "不想要了" | "其他"
    ) => {
      const serverId = activeRef.current.serverId;
      if (!serverId) throw new Error("无会话");
      const result = await createRefund({
        conversation_id: serverId,
        order_id: orderId,
        reason
      });
      const conversationId = activeRef.current.localId;
      if (conversationId) {
        const msg = createMessage("assistant", `退款申请已提交: ${result.ticket_no}`);
        msg.status = "complete";
        setConversations((current) =>
          updateConversation(current, conversationId, (conversation) => ({
            ...conversation,
            messages: [...conversation.messages, msg]
          }))
        );
      }
      return result.ticket_no;
    },
    []
  );

  const transferHuman = useCallback(() => {
    const conversationId = activeRef.current.localId || activeConversationId;
    if (!conversationId) return;
    const sys = createMessage("assistant", "已转接人工客服");
    sys.status = "complete";
    const greet = createMessage("assistant", "您好,我是客服小猫,请问有什么可以帮您的");
    greet.status = "complete";
    setConversations((current) =>
      updateConversation(current, conversationId, (conversation) => ({
        ...conversation,
        messages: [...conversation.messages, sys, greet]
      }))
    );
  }, [activeConversationId]);

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const value = useMemo<ChatContextValue>(
    () => ({
      userId,
      conversations,
      serverList: serverList.filter((item) => {
        const q = searchQuery.trim().toLocaleLowerCase();
        if (!q) return true;
        return `#${item.id} ${item.preview}`.toLocaleLowerCase().includes(q);
      }),
      activeConversation,
      activeConversationId,
      isGenerating,
      searchQuery,
      theme,
      sidebarCollapsed,
      createConversation,
      selectConversation,
      selectServerConversation,
      setSearchQuery,
      setTheme,
      toggleSidebar,
      sendMessage,
      stopGeneration,
      resumeWithOrder,
      resumeWithConfirm,
      submitTicket,
      submitRefund,
      transferHuman,
      refreshServerList
    }),
    [
      activeConversation,
      activeConversationId,
      conversations,
      createConversation,
      isGenerating,
      refreshServerList,
      resumeWithConfirm,
      resumeWithOrder,
      searchQuery,
      selectConversation,
      selectServerConversation,
      sendMessage,
      serverList,
      sidebarCollapsed,
      stopGeneration,
      submitRefund,
      submitTicket,
      theme,
      toggleSidebar,
      transferHuman,
      userId
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
