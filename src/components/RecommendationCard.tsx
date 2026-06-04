import Link from "next/link";
import type { Recommendation } from "@/lib/recommendations";

export default function RecommendationCard({ rec }: { rec: Recommendation }) {
  const href = rec.item
    ? `/title/${rec.item.type}/${encodeURIComponent(rec.item.id)}`
    : `/search?q=${encodeURIComponent(rec.title)}`;
  const cover = rec.item?.coverUrl ?? null;

  return (
    <Link
      href={href}
      className="flex gap-3 rounded border border-gray-200 bg-white p-3 transition hover:shadow"
    >
      <div className="flex h-24 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-gray-100">
        {cover ? (
          // External covers come from many hosts — plain <img> by design.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={`Cover of ${rec.title}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="px-1 text-center text-[10px] text-gray-400">
            {rec.type}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium" title={rec.title}>
          {rec.title}
        </p>
        <p className="mt-1 text-xs text-gray-600">{rec.reason}</p>
      </div>
    </Link>
  );
}
