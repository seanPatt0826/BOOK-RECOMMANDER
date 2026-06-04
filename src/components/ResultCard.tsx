import Link from "next/link";
import type { SearchResult } from "@/lib/sources/types";

export default function ResultCard({ item }: { item: SearchResult }) {
  return (
    <Link
      href={`/title/${item.type}/${encodeURIComponent(item.id)}`}
      className="block overflow-hidden rounded border border-gray-200 bg-white transition hover:shadow"
    >
      <div className="flex aspect-[2/3] items-center justify-center bg-gray-100">
        {item.coverUrl ? (
          // External covers come from many hosts (books.google.com,
          // image.tmdb.org, …) so we use a plain <img> rather than next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.coverUrl}
            alt={`Cover of ${item.title}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="px-2 text-center text-xs text-gray-400">
            No cover
          </span>
        )}
      </div>
      <div className="p-2">
        <p className="truncate text-sm font-medium" title={item.title}>
          {item.title}
        </p>
        <p className="mt-0.5 text-xs text-gray-500">
          <span className="capitalize">{item.type}</span>
          {item.year ? ` · ${item.year}` : ""}
          {item.rating !== null ? ` · ★ ${item.rating}` : ""}
        </p>
      </div>
    </Link>
  );
}
