export type ChatRole = "user" | "assistant";
export type Theme = "light" | "dark" | "system";

export interface CitationSource {
  n: number;
  id: string | number;
  section_path?: string;
  question: string;
  answer: string;
  content_type?: string;
}

export interface ToolCall {
  name: string;
}

export type SuggestedAction =
  | { type: "transfer_human" }
  | { type: "create_ticket"; draft?: Record<string, unknown> }
  | { type: "refund_form"; draft?: { order_id?: string; reason?: string } }
  | { type: "select_order"; orders?: OrderOption[] };

export interface OrderOption {
  order_id: string;
  status?: string;
  summary?: string;
  [key: string]: unknown;
}

export interface TicketPreview {
  ticket_type?: string;
  description?: string;
  [key: string]: unknown;
}

export type InterruptPayload =
  | { kind: "select_order"; orders: OrderOption[]; conversation_id?: number }
  | { kind: "confirm_ticket"; preview: TicketPreview; conversation_id?: number }
  | { kind: string; conversation_id?: number; [key: string]: unknown };

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  tools?: ToolCall[];
  sources?: CitationSource[];
  actions?: SuggestedAction[];
  interrupt?: InterruptPayload;
  status?: "streaming" | "complete" | "stopped" | "error" | "interrupted";
}

export interface ConversationSummary {
  id: number;
  preview: string;
  has_summary: boolean;
  updated_at: string | null;
  status?: string;
}

export interface Conversation {
  id: string;
  serverId: number | null;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface PrefsState {
  version: number;
  userId: string;
  theme: Theme;
  sidebarCollapsed: boolean;
}

export type ChatStreamEvent =
  | { event: "delta"; text: string }
  | { event: "tool"; name: string }
  | { event: "citations"; items: CitationSource[] }
  | { event: "actions"; items: SuggestedAction[] }
  | { event: "interrupt"; data: InterruptPayload }
  | { event: "done"; conversation_id: number }
  | { event: "error"; message: string };
