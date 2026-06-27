import { fetchJson } from "@/lib/sources/http";
import { OPEN_LIBRARY_ID } from "@/lib/sources/openLibrary";
import { getBooksBySubject } from "@/lib/sources/googleBooks";
import type { SearchResult } from "@/lib/sources/types";

// --- Taste inference -------------------------------------------------------
//
// `saved_items` stores no genre, but Open Library's search index exposes each
// work's freeform `subject` array. We map those (messy, hundreds-deep) subjects
// onto our curated genre shelves by keyword. Matching against a known genre
// list is naturally robust to subject junk ("Accessible book", "Protected
// DAISY", place/person/time tags) — none of it matches a real genre keyword.
//
// This is the seam for a smarter recommender later: swap `tallyGenres` for a
// Claude taste-profile call behind the same `GenreVote[]` shape and the rest of
// the pipeline (fetch shelves, exclude saved, render) stays put.

interface GenreMatcher {
  label: string;
  /** Open Library subject token used to fetch the shelf. */
  subject: string;
  /** Lowercase substrings that, if found in a saved subject, vote this genre. */
  keywords: string[];
}

const GENRE_MATCHERS: GenreMatcher[] = [
  { label: "Fantasy", subject: "fantasy", keywords: ["fantasy"] },
  {
    label: "Mystery & Thriller",
    subject: "thriller",
    keywords: ["thriller", "mystery", "detective", "crime", "suspense"],
  },
  {
    label: "Science Fiction",
    subject: "science_fiction",
    keywords: ["science fiction", "dystopia"],
  },
  { label: "Romance", subject: "romance", keywords: ["romance", "love stor"] },
  { label: "Horror", subject: "horror", keywords: ["horror"] },
  { label: "History", subject: "history", keywords: ["history", "historical"] },
  {
    label: "Young Adult",
    subject: "young_adult_fiction",
    keywords: ["young adult"],
  },
  {
    label: "Biography",
    subject: "biography",
    keywords: ["biography", "autobiography", "memoir"],
  },
  {
    label: "Comics & Graphic Novels",
    subject: "comics_and_graphic_novels",
    keywords: ["comic", "graphic novel", "manga"],
  },
  { label: "Poetry", subject: "poetry", keywords: ["poetry", "poems"] },
  { label: "Adventure", subject: "adventure", keywords: ["adventure"] },
  { label: "Classics", subject: "classics", keywords: ["classic"] },
  {
    label: "Cooking",
    subject: "cooking",
    keywords: ["cooking", "cookery", "recipes"],
  },
  {
    label: "Self-Help",
    subject: "self-help",
    keywords: ["self-help", "self help", "personal development"],
  },
  { label: "Travel", subject: "travel", keywords: ["travel"] },
  {
    label: "Business",
    subject: "business",
    keywords: ["business", "economics", "entrepreneur"],
  },
  {
    label: "Kids' Books",
    subject: "juvenile_fiction",
    keywords: ["juvenile", "picture book", "children's"],
  },
];

/** A saved book paired with the subjects we pulled for it. */
export interface SavedSubjects {
  title: string;
  subjects: string[];
}

/** A genre the user leans toward, with how many saved books support it. */
export interface GenreVote {
  label: string;
  subject: string;
  count: number;
  /** Title of the first saved book that voted this genre — the "why". */
  reason: string;
}

/**
 * Rank curated genres by how many of the user's saved books match each.
 * Pure and network-free so it's unit-testable. Sorted by vote count desc,
 * ties broken by the genre's listed order (stable, predictable shelves).
 */
export function tallyGenres(saved: SavedSubjects[]): GenreVote[] {
  const votes = new Map<
    string,
    { label: string; count: number; reason: string; order: number }
  >();

  for (const book of saved) {
    const normalized = book.subjects.map((s) => s.toLowerCase());
    GENRE_MATCHERS.forEach((genre, order) => {
      const matched = genre.keywords.some((kw) =>
        normalized.some((subject) => subject.includes(kw)),
      );
      if (!matched) return;
      const existing = votes.get(genre.subject);
      if (existing) {
        existing.count += 1;
      } else {
        votes.set(genre.subject, {
          label: genre.label,
          count: 1,
          reason: book.title,
          order,
        });
      }
    });
  }

  return [...votes.entries()]
    .map(([subject, v]) => ({
      subject,
      label: v.label,
      count: v.count,
      reason: v.reason,
      order: v.order,
    }))
    .sort((a, b) => b.count - a.count || a.order - b.order)
    .map((v) => ({
      label: v.label,
      subject: v.subject,
      count: v.count,
      reason: v.reason,
    }));
}

// --- Orchestration ---------------------------------------------------------

/** One "Recommended for you" row: a genre shelf with the reason it's shown. */
export interface RecommendedRow {
  /** e.g. "Because you saved Dune". */
  reason: string;
  /** Genre label, e.g. "Science Fiction". */
  label: string;
  subject: string;
  items: SearchResult[];
}

/** Pull a saved book's Open Library subjects; [] for non-OL ids or on error. */
export async function fetchBookSubjects(
  id: string,
  title: string,
): Promise<SavedSubjects> {
  // Only Open Library work ids (OL…W) carry subjects. Read them from the work
  // endpoint (the same one getBook uses, so it's reliably reachable) — its
  // `subjects` array is richer and steadier than the search index's.
  if (!OPEN_LIBRARY_ID.test(id)) return { title, subjects: [] };
  try {
    const data = (await fetchJson(
      `https://openlibrary.org/works/${encodeURIComponent(id)}.json`,
    )) as { subjects?: string[] };
    return { title, subjects: data.subjects ?? [] };
  } catch {
    return { title, subjects: [] };
  }
}

/**
 * Build "Recommended for you" rows from the user's saved list. Infers favorite
 * genres from the most recently saved books, then fills a shelf per top genre
 * with titles the user hasn't already saved. Returns [] when there's nothing to
 * recommend (logged out, empty list, or no genre signal) so callers can hide
 * the section cleanly. Books only — movies have no subject source here.
 */
export async function getRecommendations(
  saved: SearchResult[],
  maxRows = 3,
): Promise<RecommendedRow[]> {
  const books = saved.filter((item) => item.type === "book");
  if (books.length === 0) return [];

  // Infer taste from the most recently saved books (saved is newest-first).
  const sample = books.slice(0, 8);
  const subjectsByBook = await Promise.all(
    sample.map((book) => fetchBookSubjects(book.id, book.title)),
  );
  const votes = tallyGenres(subjectsByBook).slice(0, maxRows);
  if (votes.length === 0) return [];

  const savedKeys = new Set(saved.map((item) => `${item.type}:${item.id}`));
  const rows = await Promise.all(
    votes.map(async (vote): Promise<RecommendedRow> => {
      let items: SearchResult[] = [];
      try {
        items = await getBooksBySubject(vote.subject);
      } catch {
        items = [];
      }
      const fresh = items
        .filter((item) => !savedKeys.has(`${item.type}:${item.id}`))
        .slice(0, 12);
      return {
        reason: `Because you saved ${vote.reason}`,
        label: vote.label,
        subject: vote.subject,
        items: fresh,
      };
    }),
  );
  // Drop genres that came back empty (or fully already-saved).
  return rows.filter((row) => row.items.length > 0);
}
