import { describe, it, expect } from "vitest";
import { buildSuggestions } from "./history";

describe("buildSuggestions", () => {
  it("dedupes case-insensitively, preserving newest-first order", () => {
    const rows = [
      { query: "Dune" },
      { query: "dune" },
      { query: "Matrix" },
      { query: "DUNE" },
    ];
    expect(buildSuggestions(rows)).toEqual(["Dune", "Matrix"]);
  });

  it("caps the list at the limit", () => {
    const rows = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ query: `q${n}` }));
    expect(buildSuggestions(rows, 3)).toEqual(["q1", "q2", "q3"]);
  });

  it("returns an empty array for no rows", () => {
    expect(buildSuggestions([])).toEqual([]);
  });
});
