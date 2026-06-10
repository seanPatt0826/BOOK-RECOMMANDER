import { fetchJson } from "./http";
import type { SearchResult, MediaDetail } from "./types";

// Open Library: a free, keyless, unlimited book API. Used as a fallback for
// Google Books, whose keyless quota is unreliable.
const SEARCH = "https://openlibrary.org/search.json";
const FIELDS = "key,title,author_name,first_publish_year,cover_i,ratings_average";

interface OLDoc {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  ratings_average?: number;
}

// Work keys look like "/works/OL893415W". We use the bare "OL893415W" as the
// id — its shape (matched by OPEN_LIBRARY_ID) lets getBook() tell it apart from
// a Google Books volume id, and it has no characters that need URL-encoding.
export const OPEN_LIBRARY_ID = /^OL\d+W$/;

function idFromKey(key?: string): string | null {
  const match = key?.match(/OL\d+W/);
  return match ? match[0] : null;
}

function coverUrl(coverId?: number, size: "M" | "L" = "M"): string | null {
  return typeof coverId === "number"
    ? `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`
    : null;
}

function roundRating(value?: number): number | null {
  return typeof value === "number" ? Math.round(value * 10) / 10 : null;
}

function normalizeDoc(doc: OLDoc): SearchResult | null {
  const id = idFromKey(doc.key);
  if (!id) return null;
  return {
    id,
    type: "book",
    title: doc.title ?? "Untitled",
    coverUrl: coverUrl(doc.cover_i),
    year:
      typeof doc.first_publish_year === "number"
        ? String(doc.first_publish_year)
        : null,
    rating: roundRating(doc.ratings_average),
  };
}

function mapDocs(data: unknown): SearchResult[] {
  const docs = (data as { docs?: OLDoc[] }).docs ?? [];
  return docs
    .map(normalizeDoc)
    .filter((item): item is SearchResult => item !== null);
}

export async function searchBooksOpenLibrary(
  query: string,
): Promise<SearchResult[]> {
  const url = `${SEARCH}?q=${encodeURIComponent(query)}&limit=10&fields=${FIELDS}`;
  return mapDocs(await fetchJson(url));
}

export async function getPopularBooksOpenLibrary(): Promise<SearchResult[]> {
  const url = `${SEARCH}?q=subject:fiction&sort=rating&limit=12&fields=${FIELDS}`;
  return mapDocs(await fetchJson(url));
}

interface OLWork {
  title?: string;
  description?: string | { value?: string };
  covers?: number[];
  authors?: { author?: { key?: string } }[];
}

async function authorName(key?: string): Promise<string | null> {
  if (!key) return null;
  try {
    const data = (await fetchJson(`https://openlibrary.org${key}.json`)) as {
      name?: string;
    };
    return data.name ?? null;
  } catch {
    return null;
  }
}

export async function getBookOpenLibrary(
  id: string,
): Promise<MediaDetail | null> {
  const data = (await fetchJson(
    `https://openlibrary.org/works/${encodeURIComponent(id)}.json`,
  )) as OLWork | undefined;
  if (!data || !data.title) return null;

  const description =
    typeof data.description === "string"
      ? data.description
      : (data.description?.value ?? null);

  const creators = (
    await Promise.all(
      (data.authors ?? []).slice(0, 3).map((a) => authorName(a.author?.key)),
    )
  ).filter((name): name is string => Boolean(name));

  return {
    id,
    type: "book",
    title: data.title,
    coverUrl: coverUrl(data.covers?.[0], "L"),
    year: null,
    rating: null,
    description,
    creators,
  };
}
