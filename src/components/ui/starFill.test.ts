import { describe, it, expect } from "vitest";
import { starFill } from "./starFill";

describe("starFill", () => {
  it("returns all empty for 0", () => {
    expect(starFill(0)).toEqual(["empty", "empty", "empty", "empty", "empty"]);
  });
  it("returns all full for 5", () => {
    expect(starFill(5)).toEqual(["full", "full", "full", "full", "full"]);
  });
  it("rounds 4.2 down to 4 full + 1 empty (nearest half is 4.0)", () => {
    expect(starFill(4.2)).toEqual(["full", "full", "full", "full", "empty"]);
  });
  it("rounds 4.3 up to 4 full + 1 half (nearest half is 4.5)", () => {
    expect(starFill(4.3)).toEqual(["full", "full", "full", "full", "half"]);
  });
  it("renders 3.7 as 3 full + 1 half + 1 empty (nearest half is 3.5)", () => {
    expect(starFill(3.7)).toEqual(["full", "full", "full", "half", "empty"]);
  });
  it("clamps values above the max to all full", () => {
    expect(starFill(6)).toEqual(["full", "full", "full", "full", "full"]);
  });
  it("clamps negative values to all empty", () => {
    expect(starFill(-1)).toEqual(["empty", "empty", "empty", "empty", "empty"]);
  });
  it("honors a custom outOf", () => {
    expect(starFill(2, 3)).toEqual(["full", "full", "empty"]);
  });
});
