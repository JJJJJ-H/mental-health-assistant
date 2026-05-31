import { describe, expect, it } from "vitest";
import { buildPrompt } from "../server/prompt/buildPrompt";
import type { ChatMessage, RetrievedSource } from "../server/types";

const messages: ChatMessage[] = [{ role: "user", content: "怎样改善睡眠？" }];

const source: RetrievedSource = {
  id: "sleep-hygiene-0",
  documentId: "sleep-hygiene",
  index: 1,
  title: "睡眠卫生与日常调整",
  source: "内置心理健康科普知识库",
  excerpt: "保持稳定的起床时间，有助于建立睡眠节律。",
  score: 0.82
};

describe("buildPrompt", () => {
  it("sets educational boundaries and formats retrieved citations", () => {
    const prompt = buildPrompt(messages, [source], false);

    expect(prompt.system).toContain("不能替代专业诊断");
    expect(prompt.system).toContain("[1]");
    expect(prompt.system).toContain("保持稳定的起床时间");
    expect(prompt.sources).toEqual([source]);
  });

  it("explains how to respond when retrieval is empty", () => {
    expect(buildPrompt(messages, [], false).system).toContain("没有足够相关的知识库资料");
  });

  it("adds urgent escalation guidance for crisis risk", () => {
    expect(buildPrompt(messages, [], true).system).toContain("立即联系当地急救服务");
  });
});
