import { describe, it, expect } from "vitest";
import { buildChatSystem, sanitizeMessages } from "./chat";

describe("buildChatSystem", () => {
  it("includes recent searches as context when present", () => {
    const sys = buildChatSystem(["Dune", "Matrix"]);
    expect(sys).toContain("Dune");
    expect(sys).toContain("Matrix");
  });
  it("omits the context line when there is no history", () => {
    const sys = buildChatSystem([]);
    expect(sys).not.toContain("recently searched");
  });
});

describe("sanitizeMessages", () => {
  it("keeps only valid user/assistant string messages", () => {
    const out = sanitizeMessages([
      { role: "user", content: "hi" },
      { role: "system", content: "nope" },
      { role: "assistant", content: "hello" },
      { role: "user", content: 42 },
    ]);
    expect(out).toEqual([
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello" },
    ]);
  });

  it("returns [] for non-array input", () => {
    expect(sanitizeMessages("nope")).toEqual([]);
    expect(sanitizeMessages(undefined)).toEqual([]);
  });

  it("keeps only the last 20 messages", () => {
    const many = Array.from({ length: 25 }, (_, i) => ({
      role: "user" as const,
      content: `m${i}`,
    }));
    const out = sanitizeMessages(many);
    expect(out).toHaveLength(20);
    expect(out[0].content).toBe("m5");
  });

  it("clamps very long content to 4000 chars", () => {
    const out = sanitizeMessages([{ role: "user", content: "x".repeat(5000) }]);
    expect(out[0].content).toHaveLength(4000);
  });
});
