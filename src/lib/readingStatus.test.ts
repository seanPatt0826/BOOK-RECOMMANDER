import { describe, it, expect } from "vitest";
import {
  isReadingStatus,
  readingStatusLabel,
  groupByStatus,
  type SavedItem,
} from "./readingStatus";

describe("isReadingStatus", () => {
  it("accepts the three known statuses", () => {
    expect(isReadingStatus("want_to_read")).toBe(true);
    expect(isReadingStatus("reading")).toBe(true);
    expect(isReadingStatus("finished")).toBe(true);
  });
  it("rejects anything else", () => {
    expect(isReadingStatus("done")).toBe(false);
    expect(isReadingStatus(null)).toBe(false);
    expect(isReadingStatus(undefined)).toBe(false);
    expect(isReadingStatus(3)).toBe(false);
  });
});

describe("readingStatusLabel", () => {
  it("maps a status to its display label", () => {
    expect(readingStatusLabel("want_to_read")).toBe("Want to read");
    expect(readingStatusLabel("reading")).toBe("Reading");
    expect(readingStatusLabel("finished")).toBe("Finished");
  });
});

describe("groupByStatus", () => {
  const item = (id: string, status: SavedItem["status"]): SavedItem => ({
    id,
    type: "book",
    title: id,
    coverUrl: null,
    year: null,
    rating: null,
    status,
  });

  it("returns the three shelves in canonical order, even when empty", () => {
    expect(groupByStatus([]).map((s) => s.status)).toEqual([
      "want_to_read",
      "reading",
      "finished",
    ]);
  });

  it("places each item on its matching shelf", () => {
    const groups = groupByStatus([
      item("a", "reading"),
      item("b", "want_to_read"),
      item("c", "finished"),
      item("d", "reading"),
    ]);
    const byStatus = Object.fromEntries(
      groups.map((g) => [g.status, g.items.map((i) => i.id)]),
    );
    expect(byStatus.want_to_read).toEqual(["b"]);
    expect(byStatus.reading).toEqual(["a", "d"]);
    expect(byStatus.finished).toEqual(["c"]);
  });
});
