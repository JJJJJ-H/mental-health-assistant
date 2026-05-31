import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const runtimeFiles = [
  "api/chat.ts",
  "server/llm/deepseek.ts",
  "server/prompt/buildPrompt.ts",
  "server/rag/index.generated.ts",
  "server/rag/retriever.ts",
  "server/safety/guardrails.ts",
  "scripts/build-knowledge-index.ts"
];

describe("server ESM imports", () => {
  it("uses explicit .js extensions for relative runtime imports", () => {
    for (const file of runtimeFiles) {
      const source = readFileSync(file, "utf8");
      const relativeImports = [
        ...source.matchAll(/from\s+["'](\.\.?\/[^"']+)["']/g)
      ].map((match) => match[1]);

      expect(relativeImports, file).toEqual(
        relativeImports.map((specifier) =>
          specifier.endsWith(".js") ? specifier : `${specifier}.js`
        )
      );
    }
  });
});
