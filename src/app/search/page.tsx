import { searchAll } from "@/lib/sources/search";
import { recordSearch } from "@/lib/history";
import SearchResults from "@/components/SearchResults";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  if (!query) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="text-3xl font-semibold">Search</h1>
        <p className="mt-2 text-muted">
          Type a book or movie title in the search bar above.
        </p>
      </main>
    );
  }

  await recordSearch(query);
  const results = await searchAll(query);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-semibold">
        Results for &ldquo;{query}&rdquo;
      </h1>

      <SearchResults items={results} />
    </main>
  );
}
