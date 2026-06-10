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
      className="flex gap-3 rounded-xl border border-edge bg-surface p-3 transition hover:-translate-y-0.5 hover:border-accent hover:shadow-md"
    >
      <div className="flex h-24 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-2">
        {cover ? (
          // External covers come from many hosts — plain <img> by design.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={`Cover of ${rec.title}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="px-1 text-center text-[10px] text-muted">
            {rec.type}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink" title={rec.title}>
          {rec.title}
        </p>
        <p className="mt-1 text-xs text-muted">{rec.reason}</p>
      </div>
    </Link>
  );
}
