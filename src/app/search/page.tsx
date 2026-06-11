import { searchAll } from "@/lib/sources/search";
import { recordSearch } from "@/lib/history";
import SearchResults from "@/components/SearchResults";
import BigSearchBar from "@/components/BigSearchBar";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  if (!query) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-4xl font-semibold sm:text-5xl">
          What are you in the mood for?
        </h1>
        <p className="mt-3 text-lg text-muted">
          Search thousands of books and movies.
        </p>
        <div className="mt-8 text-left">
          <BigSearchBar />
        </div>
      </main>
    );
  }

  await recordSearch(query);
  const results = await searchAll(query);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <BigSearchBar defaultValue={query} />

      <h1 className="mt-8 text-3xl font-semibold">
        Results for &ldquo;{query}&rdquo;
      </h1>

      <SearchResults items={results} />
    </main>
  );
}
