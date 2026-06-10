import Link from "next/link";
import type { SearchResult } from "@/lib/sources/types";

export default function ResultCard({ item }: { item: SearchResult }) {
  return (
    <Link
      href={`/title/${item.type}/${encodeURIComponent(item.id)}`}
      className="group block overflow-hidden rounded-xl border border-edge bg-surface shadow-sm transition duration-200 hover:-translate-y-1 hover:border-accent hover:shadow-lg"
    >
      <div className="relative flex aspect-[2/3] items-center justify-center overflow-hidden bg-surface-2">
        {item.coverUrl ? (
          // External covers come from many hosts (books.google.com,
          // image.tmdb.org, …) so we use a plain <img> rather than next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.coverUrl}
            alt={`Cover of ${item.title}`}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="px-2 text-center text-xs text-muted">No cover</span>
        )}
        <span className="absolute right-1.5 top-1.5 rounded-full bg-surface/85 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted backdrop-blur">
          {item.type}
        </span>
      </div>
      <div className="p-2.5">
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
