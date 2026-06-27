import type { SearchResult } from "@/lib/sources/types";

/**
 * A decorative fanned stack of three real covers for the hero's right side.
 * Pulls the first three covered items from whatever the home page already
 * fetched, so it costs no extra requests. Purely ornamental (aria-hidden);
 * renders nothing if fewer than three covers are available.
 */
export default function HeroCovers({ items }: { items: SearchResult[] }) {
  const covers = items.filter((i) => i.coverUrl).slice(0, 3);
  if (covers.length < 3) return null;

  const [left, center, right] = covers;
  const frame =
    "absolute h-48 w-32 overflow-hidden rounded-2xl border border-edge/60 bg-surface-2 shadow-[var(--shadow-md)]";

  return (
    <div className="relative h-72 w-80" aria-hidden="true">
      {/* Warm halo behind the stack. */}
      <div
        className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50 blur-3xl"
        style={{ background: "var(--accent)" }}
      />

      {/* eslint-disable @next/next/no-img-element */}
      <img
        src={left.coverUrl!}
        alt=""
        className={`${frame} left-2 top-12 -rotate-[10deg] brightness-95`}
      />
      <img
        src={right.coverUrl!}
        alt=""
        className={`${frame} right-2 top-8 rotate-[10deg] brightness-95`}
      />
      <img
        src={center.coverUrl!}
        alt=""
        className={`${frame} left-1/2 top-0 z-10 -translate-x-1/2 rotate-[2deg] shadow-[var(--shadow-lg)]`}
      />
      {/* eslint-enable @next/next/no-img-element */}
    </div>
  );
}
