import { describe, expect, it } from "vitest";
import { retrieveSources } from "../server/rag/retriever";

describe("retrieveSources", () => {
  it("retrieves sleep education for a sleep query", () => {
    expect(retrieveSources("最近总是睡不好，怎么调整作息？", 3)[0]?.documentId).toBe(
      "sleep-hygiene"
    );
  });

  it("returns no sources for an empty query", () => {
    expect(retrieveSources("", 3)).toEqual([]);
  });

  it("deduplicates results by document", () => {
    const results = retrieveSources("压力 焦虑", 4);

    expect(new Set(results.map((item) => item.documentId)).size).toBe(results.length);
  });
});
