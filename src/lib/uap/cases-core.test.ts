import { describe, it, expect } from "vitest";
import { getCase, casesByTag, allTags } from "./cases-core";
import type { UapCase } from "./types";

const fixtures: UapCase[] = [
  {
    slug: "alpha",
    name: "Alpha Case",
    dateLabel: "1947",
    location: "Place A",
    tags: ["Military", "1940s"],
    summary: "s",
    reported: "r",
    evidence: "e",
    skepticalExplanations: ["x"],
    openQuestions: ["q"],
    sources: [{ label: "L", url: "https://example.com" }],
  },
  {
    slug: "beta",
    name: "Beta Case",
    dateLabel: "1997",
    location: "Place B",
    tags: ["Mass sighting", "1990s", "Military"],
    summary: "s",
    reported: "r",
    evidence: "e",
    skepticalExplanations: ["x"],
    openQuestions: ["q"],
    sources: [{ label: "L", url: "https://example.com" }],
  },
];

describe("getCase", () => {
  it("returns the matching case", () => {
    expect(getCase(fixtures, "beta")?.name).toBe("Beta Case");
  });
  it("returns null when no slug matches", () => {
    expect(getCase(fixtures, "missing")).toBeNull();
  });
});

describe("casesByTag", () => {
  it("returns every case carrying the tag", () => {
    expect(casesByTag(fixtures, "Military").map((c) => c.slug)).toEqual([
      "alpha",
      "beta",
    ]);
  });
  it("returns an empty array for an unknown tag", () => {
    expect(casesByTag(fixtures, "Nope")).toEqual([]);
  });
});

describe("allTags", () => {
  it("returns distinct tags sorted alphabetically", () => {
    expect(allTags(fixtures)).toEqual([
      "1940s",
      "1990s",
      "Mass sighting",
      "Military",
    ]);
  });
});
