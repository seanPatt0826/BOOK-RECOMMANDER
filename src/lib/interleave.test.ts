import { describe, it, expect } from "vitest";
import { interleave } from "./interleave";

describe("interleave", () => {
  it("alternates two equal-length lists", () => {
    expect(interleave([1, 3], [2, 4])).toEqual([1, 2, 3, 4]);
  });
  it("appends leftovers from the longer list in order", () => {
    expect(interleave(["a"], ["b", "c", "d"])).toEqual(["a", "b", "c", "d"]);
  });
  it("handles empty inputs", () => {
    expect(interleave([], [])).toEqual([]);
    expect(interleave([1], [])).toEqual([1]);
  });
});
