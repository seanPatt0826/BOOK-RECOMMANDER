import Link from "next/link";
import type { SearchResult } from "@/lib/sources/types";

export default function ResultCard({ item }: { item: SearchResult }) {
  return (
    <Link
      href={`/title/${item.type}/${encodeURIComponent(item.id)}`}
      className="card group block overflow-hidden"
    >
      <div className="relative flex aspect-[2/3] items-center justify-center overflow-hidden rounded-t-2xl bg-surface-2">
        {item.coverUrl ? (
          // External covers come from many hosts (books.google.com,
          // image.tmdb.org, …) so we use a plain <img> rather than next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.coverUrl}
            alt={`Cover of ${item.title}`}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.07]"
          />
        ) : (
          <span className="px-2 text-center text-xs text-muted">No cover</span>
        )}
        {/* Warm gradient wash that fades up on hover. */}
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
        <span className="absolute right-2 top-2 rounded-full bg-surface/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent backdrop-blur">
          {item.type}
        </span>
      </div>
      <div className="p-3">
        <p
          className="truncate text-sm font-medium text-ink"
          title={item.title}
        >
          {item.title}
        </p>
        <p className="mt-0.5 text-xs text-muted">
          {item.year ? item.year : ""}
          {item.rating !== null
            ? `${item.year ? " · " : ""}★ ${item.rating}`
            : ""}
        </p>
      </div>
    </Link>
  );
}
