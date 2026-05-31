export type ChatRole = "user" | "assistant";
export type Theme = "light" | "dark" | "system";

export interface CitationSource {
  id: string;
  index: number;
  documentId: string;
  title: string;
  source: string;
  excerpt: string;
  score: number;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  sources?: CitationSource[];
  warning?: string;
  status?: "streaming" | "complete" | "stopped" | "error";
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface AppState {
  version: number;
  conversations: Conversation[];
  theme: Theme;
  sidebarCollapsed: boolean;
}

export interface ChatRequestMessage {
  role: ChatRole;
  content: string;
}

export type ChatStreamEvent =
  | { event: "sources"; data: { sources: CitationSource[] } }
  | { event: "delta"; data: { content: string } }
  | { event: "warning"; data: { message: string } }
  | { event: "done"; data: Record<string, never> }
  | { event: "error"; data: { message: string } };
