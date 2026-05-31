import { describe, expect, it } from "vitest";
import {
  detectCrisisRisk,
  limitHistory,
  validateChatRequest
} from "../server/safety/guardrails";

describe("validateChatRequest", () => {
  it("accepts user and assistant messages", () => {
    expect(
      validateChatRequest({
        messages: [
          { role: "user", content: "最近压力有点大" },
          { role: "assistant", content: "我们可以先梳理压力来源。" }
        ]
      })
    ).toHaveLength(2);
  });

  it("rejects unsupported message roles", () => {
    expect(() =>
      validateChatRequest({ messages: [{ role: "tool", content: "x" }] })
    ).toThrow("消息角色");
  });

  it("rejects oversized messages", () => {
    expect(() =>
      validateChatRequest({ messages: [{ role: "user", content: "x".repeat(4001) }] })
    ).toThrow("4000");
  });
});

describe("limitHistory", () => {
  it("keeps the most recent messages", () => {
    const history = Array.from({ length: 18 }, (_, index) => ({
      role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
      content: String(index)
    }));

    expect(limitHistory(history, 12)).toHaveLength(12);
    expect(limitHistory(history, 12)[0]?.content).toBe("6");
  });
});

describe("detectCrisisRisk", () => {
  it("detects explicit self-harm language", () => {
    expect(detectCrisisRisk("我有伤害自己的想法")).toBe(true);
  });

  it("does not classify ordinary stress as crisis risk", () => {
    expect(detectCrisisRisk("最近工作压力比较大")).toBe(false);
  });
});
