import { fetchJson } from "./http";
import type { SearchResult, MediaDetail } from "./types";

// A keyless movie source for when no TMDB_API_KEY is set. Wikipedia provides
// the identity + description (excellent coverage and relevance) and iTunes
// supplies the poster (Wikipedia's API strips the copyrighted poster image).

const WIKI_API = "https://en.wikipedia.org/w/api.php";
const WIKI_SUMMARY = "https://en.wikipedia.org/api/rest_v1/page/summary";
const ITUNES = "https://itunes.apple.com/search";
const UA = "ShelfMate/1.0 (book & movie demo)";
const DAY = 86_400;

// Cache these external calls for a day — the data barely changes and it keeps
// the home page and repeat searches fast.
function get(url: string): Promise<unknown> {
  return fetchJson(url, {
    headers: { "User-Agent": UA },
    next: { revalidate: DAY },
  } as RequestInit);
}

// Drop Wikipedia's "(film)" / "(2021 film)" disambiguator for display.
function cleanTitle(title: string): string {
  return title.replace(/\s*\((?:\d{4}\s+)?film(?:\s+series)?\)\s*$/i, "").trim();
}

function yearFrom(title: string, extract?: string): string | null {
  const fromTitle = title.match(/\((\d{4})\s+film\)/i);
  if (fromTitle) return fromTitle[1];
  const fromExtract = extract?.match(/\b(?:19|20)\d{2}\b/);
  return fromExtract ? fromExtract[0] : null;
}

// Best-effort poster from iTunes by title; null when there's no match.
async function itunesPoster(title: string): Promise<string | null> {
  try {
    const data = (await get(
      `${ITUNES}?term=${encodeURIComponent(title)}&limit=10`,
    )) as { results?: { kind?: string; artworkUrl100?: string }[] };
    const hit = (data.results ?? []).find(
      (r) => r.kind === "feature-movie" && r.artworkUrl100,
    );
    return hit?.artworkUrl100
      ? hit.artworkUrl100.replace(/\/\d+x\d+bb\.(jpg|png)$/, "/600x600bb.$1")
      : null;
  } catch {
    return null;
  }
}

interface WikiPage {
  title: string;
  extract?: string;
  index: number;
}

// Wikipedia film intros almost always read "… is a [year] … film".
function looksLikeFilm(page: WikiPage): boolean {
  if (/\(\d{0,4}\s*film(?:\s+series)?\)/i.test(page.title)) return true;
  return /\bis a\b[^.]*\bfilm\b/i.test(page.extract ?? "");
}

async function toResult(page: WikiPage): Promise<SearchResult> {
  const title = cleanTitle(page.title);
  return {
    id: page.title, // exact Wikipedia title — resolvable by getMovie()
    type: "movie",
    title,
    coverUrl: await itunesPoster(title),
    year: yearFrom(page.title, page.extract),
    rating: null,
  };
}

export async function searchMoviesKeyless(
  query: string,
): Promise<SearchResult[]> {
  const url =
    `${WIKI_API}?action=query&format=json&origin=*&redirects=1` +
    `&generator=search&gsrsearch=${encodeURIComponent(query + " film")}&gsrlimit=12` +
    `&prop=extracts&exintro=1&explaintext=1`;
  const data = (await get(url)) as {
    query?: { pages?: Record<string, WikiPage> };
  };
  const films = Object.values(data.query?.pages ?? {})
    .sort((a, b) => a.index - b.index)
    .filter(looksLikeFilm)
    .slice(0, 10);
  return Promise.all(films.map(toResult));
}

async function summary(
  title: string,
): Promise<{ title?: string; extract?: string } | undefined> {
  return (await get(`${WIKI_SUMMARY}/${encodeURIComponent(title)}`)) as
    | { title?: string; extract?: string }
    | undefined;
}

export async function getMovieKeyless(id: string): Promise<MediaDetail | null> {
  // The route param may arrive percent-encoded; normalize before re-encoding.
  let lookup = id;
  try {
    lookup = decodeURIComponent(id);
  } catch {
    // keep id as-is if it isn't valid percent-encoding
  }
  const data = await summary(lookup);
  if (!data || !data.title) return null;
  const title = cleanTitle(data.title);
  return {
    id,
    type: "movie",
    title,
    coverUrl: await itunesPoster(title),
    year: yearFrom(data.title, data.extract),
    rating: null,
    description: data.extract ?? null,
    creators: [],
  };
}

// Wikipedia has no "popular" endpoint, so seed the home carousel with a short
// list of well-known films (exact Wikipedia titles, so detail pages resolve).
const POPULAR = [
  "Dune: Part Two",
  "Oppenheimer (film)",
  "Barbie (film)",
  "Inception",
  "Interstellar (film)",
  "The Dark Knight",
  "Top Gun: Maverick",
  "Everything Everywhere All at Once",
  "The Batman (film)",
  "Spider-Man: No Way Home",
];

export async function getPopularMoviesKeyless(): Promise<SearchResult[]> {
  const results = await Promise.all(
    POPULAR.map(async (wikiTitle) => {
      try {
        const data = await summary(wikiTitle);
        if (!data?.title) return null;
        const title = cleanTitle(data.title);
        return {
          id: wikiTitle,
          type: "movie" as const,
          title,
          coverUrl: await itunesPoster(title),
          year: yearFrom(data.title, data.extract),
          rating: null,
        };
      } catch {
        return null;
      }
    }),
  );
  return results.filter((r): r is SearchResult => r !== null);
}
