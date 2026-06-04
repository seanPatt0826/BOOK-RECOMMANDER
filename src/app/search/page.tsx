import { searchAll } from "@/lib/sources/search";
import { recordSearch } from "@/lib/history";
import ResultCard from "@/components/ResultCard";

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
        <h1 className="text-2xl font-bold">Search</h1>
        <p className="mt-2 text-gray-600">
          Type a book or movie title in the search bar above.
        </p>
      </main>
    );
  }

  await recordSearch(query);
  const results = await searchAll(query);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-2xl font-bold">
        Results for &ldquo;{query}&rdquo;
      </h1>

      {results.length === 0 ? (
        <p className="mt-3 text-gray-600">
          No results found. Try a different title.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {results.map((item) => (
            <ResultCard key={`${item.type}-${item.id}`} item={item} />
          ))}
        </div>
      )}
    </main>
  );
}
