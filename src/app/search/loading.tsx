export default function SearchLoading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="h-8 w-56 animate-pulse rounded bg-surface-2" />
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-edge bg-surface"
          >
            <div className="aspect-[2/3] animate-pulse bg-surface-2" />
            <div className="space-y-2 p-2">
              <div className="h-3 w-full animate-pulse rounded bg-surface-2" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-surface-2" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
