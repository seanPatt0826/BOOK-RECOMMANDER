import { describe, it, expect } from "vitest";
import { getAllCases } from "./cases";

describe("UAP dataset integrity", () => {
  const cases = getAllCases();

  it("has at least 10 cases", () => {
    expect(cases.length).toBeGreaterThanOrEqual(10);
  });

  it("has unique slugs", () => {
    const slugs = cases.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("uses kebab-case slugs", () => {
    for (const c of cases) {
      expect(c.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("fills every required prose field", () => {
    for (const c of cases) {
      expect(c.name.trim()).not.toBe("");
      expect(c.dateLabel.trim()).not.toBe("");
      expect(c.location.trim()).not.toBe("");
      expect(c.summary.trim()).not.toBe("");
      expect(c.reported.trim()).not.toBe("");
      expect(c.evidence.trim()).not.toBe("");
    }
  });

  it("has at least one tag, skeptical explanation, open question, and source each", () => {
    for (const c of cases) {
      expect(c.tags.length).toBeGreaterThan(0);
      expect(c.skepticalExplanations.length).toBeGreaterThan(0);
      expect(c.openQuestions.length).toBeGreaterThan(0);
      expect(c.sources.length).toBeGreaterThan(0);
    }
  });

  it("has well-formed source URLs", () => {
    for (const c of cases) {
      for (const s of c.sources) {
        expect(s.label.trim()).not.toBe("");
        expect(() => new URL(s.url)).not.toThrow();
        expect(s.url).toMatch(/^https?:\/\//);
      }
    }
  });
});
