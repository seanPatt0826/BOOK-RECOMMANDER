import type { SearchResult } from "@/lib/sources/types";

// The three shelves a saved item can live on. Ordered the way they're shown.
export type ReadingStatus = "want_to_read" | "reading" | "finished";

export interface ReadingStatusMeta {
  value: ReadingStatus;
  label: string;
}

export const READING_STATUSES: ReadingStatusMeta[] = [
  { value: "want_to_read", label: "Want to read" },
  { value: "reading", label: "Reading" },
  { value: "finished", label: "Finished" },
];

/** Status a freshly saved item starts on (matches the DB column default). */
export const DEFAULT_READING_STATUS: ReadingStatus = "want_to_read";

export function isReadingStatus(value: unknown): value is ReadingStatus {
  return (
    value === "want_to_read" || value === "reading" || value === "finished"
  );
}

/** Human label for a status, e.g. "want_to_read" → "Want to read". */
export function readingStatusLabel(value: ReadingStatus): string {
  return READING_STATUSES.find((s) => s.value === value)?.label ?? value;
}

/** A saved item carries which shelf it's on alongside the media fields. */
export interface SavedItem extends SearchResult {
  status: ReadingStatus;
}

export interface ShelfGroup {
  status: ReadingStatus;
  label: string;
  items: SavedItem[];
}

/**
 * Split saved items into the three shelves, in canonical order. Empty shelves
 * are included so callers can decide whether to show or hide them.
 */
export function groupByStatus(items: SavedItem[]): ShelfGroup[] {
  return READING_STATUSES.map(({ value, label }) => ({
    status: value,
    label,
    items: items.filter((item) => item.status === value),
  }));
}
