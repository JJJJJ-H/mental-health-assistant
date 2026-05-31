import { describe, expect, it } from "vitest";
import { serializeSse } from "../server/stream/sse";

describe("serializeSse", () => {
  it("serializes named JSON events", () => {
    expect(serializeSse("delta", { content: "你好" })).toBe(
      'event: delta\ndata: {"content":"你好"}\n\n'
    );
  });

  it("escapes line breaks through JSON serialization", () => {
    expect(serializeSse("error", { message: "第一行\n第二行" })).toContain(
      '{"message":"第一行\\n第二行"}'
    );
  });
});
