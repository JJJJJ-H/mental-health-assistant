export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface RetrievedSource {
  id: string;
  documentId: string;
  index: number;
  title: string;
  source: string;
  excerpt: string;
  score: number;
}

export interface PromptPayload {
  system: string;
  messages: ChatMessage[];
  sources: RetrievedSource[];
}
