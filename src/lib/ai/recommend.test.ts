import { describe, it, expect } from "vitest";
import { buildHistorySummary, parseSeeds } from "./recommend";

describe("buildHistorySummary", () => {
  it("formats queries as a bulleted recent-searches list", () => {
    expect(buildHistorySummary(["Dune", "The Matrix"])).toBe(
      "Recent searches:\n- Dune\n- The Matrix",
    );
  });
});

describe("parseSeeds", () => {
  const valid = JSON.stringify({
    recommendations: [
      { title: "Neuromancer", type: "book", reason: "Cyberpunk like Dune." },
      { title: "Blade Runner", type: "movie", reason: "Dystopian sci-fi." },
    ],
  });

  it("parses a clean JSON object", () => {
    const seeds = parseSeeds(valid);
    expect(seeds).toHaveLength(2);
    expect(seeds[0]).toEqual({
      title: "Neuromancer",
      type: "book",
      reason: "Cyberpunk like Dune.",
    });
  });

  it("strips ```json fences before parsing", () => {
    const fenced = "```json\n" + valid + "\n```";
    expect(parseSeeds(fenced)).toHaveLength(2);
  });

  it("drops entries with an invalid type or missing fields", () => {
    const messy = JSON.stringify({
      recommendations: [
        { title: "Good", type: "book", reason: "ok" },
        { title: "Bad type", type: "album", reason: "nope" },
        { title: "No reason", type: "movie" },
      ],
    });
    const seeds = parseSeeds(messy);
    expect(seeds).toEqual([{ title: "Good", type: "book", reason: "ok" }]);
  });

  it("returns [] for unparseable text", () => {
    expect(parseSeeds("the model rambled, no json here")).toEqual([]);
  });

  it("caps at 6 seeds", () => {
    const many = JSON.stringify({
      recommendations: Array.from({ length: 9 }, (_, i) => ({
        title: `T${i}`,
        type: "book",
        reason: "r",
      })),
    });
    expect(parseSeeds(many)).toHaveLength(6);
  });
});
