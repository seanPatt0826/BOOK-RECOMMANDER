import { describe, it, expect } from "vitest";
import { yearFromDate } from "./openLibrary";

describe("yearFromDate", () => {
  it("extracts the year from Open Library's varied date formats", () => {
    expect(yearFromDate("1937")).toBe("1937");
    expect(yearFromDate("September 3, 1954")).toBe("1954");
    expect(yearFromDate("1988-10")).toBe("1988");
    expect(yearFromDate("2021-03-15")).toBe("2021");
  });

  it("returns null for missing or yearless input", () => {
    expect(yearFromDate(undefined)).toBeNull();
    expect(yearFromDate("")).toBeNull();
    expect(yearFromDate("no year here")).toBeNull();
  });
});
