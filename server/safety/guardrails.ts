import type { ChatMessage } from "../types";

const MAX_MESSAGES = 24;
const MAX_MESSAGE_LENGTH = 4000;

const CRISIS_KEYWORDS = [
  "伤害自己",
  "伤害他人",
  "自杀",
  "自残",
  "不想活",
  "结束生命",
  "轻生"
];

export function validateChatRequest(body: unknown): ChatMessage[] {
  if (!body || typeof body !== "object" || !("messages" in body)) {
    throw new Error("请求中缺少消息列表");
  }

  const { messages } = body as { messages: unknown };
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("消息列表不能为空");
  }
  if (messages.length > MAX_MESSAGES) {
    throw new Error(`消息数量不能超过 ${MAX_MESSAGES} 条`);
  }

  return messages.map((message) => {
    if (!message || typeof message !== "object") {
      throw new Error("消息格式错误");
    }

    const { role, content } = message as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") {
      throw new Error("消息角色仅支持 user 和 assistant");
    }
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("消息内容不能为空");
    }
    if (content.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`单条消息不能超过 ${MAX_MESSAGE_LENGTH} 个字符`);
    }

    return { role, content: content.trim() };
  });
}

export function limitHistory(messages: ChatMessage[], limit = 12): ChatMessage[] {
  return messages.slice(-limit);
}

export function detectCrisisRisk(text: string): boolean {
  return CRISIS_KEYWORDS.some((keyword) => text.includes(keyword));
}
