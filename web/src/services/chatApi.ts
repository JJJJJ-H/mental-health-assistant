import type {
  ChatStreamEvent,
  ConversationSummary
} from "../types/chat";
import { parseSseStream } from "./sseParser";

const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");

function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

async function readStream(
  response: Response,
  onEvent: (event: ChatStreamEvent) => void
): Promise<void> {
  if (!response.ok) {
    throw new Error(`请求失败 (${response.status})`);
  }
  if (!response.body) {
    throw new Error("响应没有数据流");
  }
  for await (const event of parseSseStream(response.body)) {
    onEvent(event);
  }
}

export async function streamChat(
  body: { user_id: string; message: string; conversation_id: number | null },
  signal: AbortSignal,
  onEvent: (event: ChatStreamEvent) => void
): Promise<void> {
  const response = await fetch(apiUrl("/api/chat"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream"
    },
    body: JSON.stringify({
      user_id: body.user_id,
      message: body.message,
      conversation_id: body.conversation_id
    }),
    signal
  });
  await readStream(response, onEvent);
}

export async function streamResume(
  body: { conversation_id: number; order_id?: string; confirmed?: boolean },
  signal: AbortSignal,
  onEvent: (event: ChatStreamEvent) => void
): Promise<void> {
  const response = await fetch(apiUrl("/api/actions/resume"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream"
    },
    body: JSON.stringify(body),
    signal
  });
  await readStream(response, onEvent);
}

export async function listConversations(userId: string): Promise<ConversationSummary[]> {
  const response = await fetch(
    apiUrl(`/api/conversations?user_id=${encodeURIComponent(userId)}`)
  );
  if (!response.ok) return [];
  const data = (await response.json()) as { items?: ConversationSummary[] };
  return data.items ?? [];
}

export async function listMessages(
  conversationId: number
): Promise<Array<{ role: string; content: string; created_at: string | null }>> {
  const response = await fetch(apiUrl(`/api/conversations/${conversationId}/messages`));
  if (!response.ok) throw new Error("加载消息失败");
  const data = (await response.json()) as {
    items?: Array<{ role: string; content: string; created_at: string | null }>;
  };
  return data.items ?? [];
}

export async function createTicket(body: {
  conversation_id: number;
  description: string;
  ticket_type: "售后" | "投诉" | "咨询";
}): Promise<{ ticket_no: string }> {
  const response = await fetch(apiUrl("/api/actions/create-ticket"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error("建工单失败");
  return response.json() as Promise<{ ticket_no: string }>;
}

export async function createRefund(body: {
  conversation_id: number;
  order_id: string;
  reason: "七天无理由" | "质量问题" | "发错货" | "不想要了" | "其他";
}): Promise<{ ticket_no: string }> {
  const response = await fetch(apiUrl("/api/actions/create-refund"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error("退款申请失败");
  return response.json() as Promise<{ ticket_no: string }>;
}

export async function sendFeedback(body: {
  conversation_id: number;
  rating: "up" | "down";
  question: string;
}): Promise<void> {
  await fetch(apiUrl("/api/feedback"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }).catch(() => undefined);
}
