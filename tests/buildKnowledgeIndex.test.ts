import { describe, expect, it } from "vitest";
import {
  buildIndex,
  chunkText,
  parseKnowledgeDocument,
  tokenize
} from "../scripts/build-knowledge-index";

describe("parseKnowledgeDocument", () => {
  it("reads required front matter and trims the markdown body", () => {
    const document = parseKnowledgeDocument(`---
id: anxiety-basics
title: 理解焦虑
source: 内置知识库
---

## 正文

焦虑是一种常见反应。
`);

    expect(document).toEqual({
      id: "anxiety-basics",
      title: "理解焦虑",
      source: "内置知识库",
      content: "## 正文\n\n焦虑是一种常见反应。"
    });
  });

  it("rejects a document with missing required front matter", () => {
    expect(() =>
      parseKnowledgeDocument(`---
id: incomplete
title: 缺少来源
---

正文`)
    ).toThrow(/source/);
  });
});

describe("chunkText", () => {
  it("splits long text deterministically and keeps overlap", () => {
    expect(chunkText("abcdefghij", 6, 2)).toEqual(["abcdef", "efghij"]);
  });

  it("returns a short trimmed text as one chunk", () => {
    expect(chunkText("  short text  ", 20, 4)).toEqual(["short text"]);
  });
});

describe("tokenize", () => {
  it("normalizes English and emits Chinese single-character and bigram tokens", () => {
    const tokens = tokenize("Stress 管理焦虑 STRESS");

    expect(tokens).toContain("stress");
    expect(tokens).toContain("管");
    expect(tokens).toContain("管理");
    expect(tokens).toContain("焦虑");
  });
});

describe("buildIndex", () => {
  it("builds deterministic documents, chunks and TF-IDF vectors", () => {
    const index = buildIndex([
      {
        id: "stress",
        title: "压力",
        source: "内置知识库",
        content: "压力管理 stress"
      },
      {
        id: "sleep",
        title: "睡眠",
        source: "内置知识库",
        content: "睡眠规律 sleep"
      }
    ]);

    expect(index.documents.map((document) => document.id)).toEqual(["sleep", "stress"]);
    expect(index.chunks.map((chunk) => chunk.documentId)).toEqual(["sleep", "stress"]);
    expect(index.chunks[0]?.vector["sleep"]).toBeGreaterThan(0);
    expect(index.chunks[1]?.vector["stress"]).toBeGreaterThan(0);
    expect(index.idf["sleep"]).toBeGreaterThan(0);
  });
});
