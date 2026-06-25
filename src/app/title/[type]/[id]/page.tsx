import Link from "next/link";
import { notFound } from "next/navigation";
import { getBook } from "@/lib/sources/googleBooks";
import { getMovie } from "@/lib/sources/tmdb";
import { createClient } from "@/lib/supabase/server";
import { isSaved } from "@/lib/saved";
import SaveButton from "@/components/SaveButton";
import StarRating from "@/components/ui/StarRating";
import type { MediaDetail, SearchResult } from "@/lib/sources/types";
import CommentsSection from "@/components/CommentsSection";

export default async function TitlePage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const { type, id } = await params;
  if (type !== "book" && type !== "movie") notFound();

  let detail: MediaDetail | null = null;
  let failed = false;
  try {
    detail = type === "book" ? await getBook(id) : await getMovie(id);
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-muted">
          We couldn&rsquo;t load this title right now. Please try again later.
        </p>
      </main>
    );
  }

  if (!detail) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const saved = user ? await isSaved(detail.id, detail.type) : false;

  const item: SearchResult = {
    id: detail.id,
    type: detail.type,
    title: detail.title,
    coverUrl: detail.coverUrl,
    year: detail.year,
    rating: detail.rating,
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="w-40 flex-shrink-0">
          {detail.coverUrl ? (
            // Let the cover set its own height so the frame hugs the artwork
            // instead of forcing a 2:3 box that leaves dead space.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={detail.coverUrl}
              alt={`Cover of ${detail.title}`}
              className="w-full rounded-3xl border border-edge/60 bg-surface-2 shadow-md"
            />
          ) : (
            <div className="flex aspect-[2/3] items-center justify-center overflow-hidden rounded-3xl border border-edge/60 bg-surface-2 shadow-md">
              <span className="text-xs text-muted">No cover</span>
            </div>
          )}
        </div>

        <div className="flex-1">
          <h1 className="text-3xl font-semibold">{detail.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-accent">
            <span className="capitalize">{detail.type}</span>
            {detail.year && <span aria-hidden="true">· {detail.year}</span>}
            {detail.rating !== null && (
              <>
                <span aria-hidden="true">·</span>
                <StarRating rating={detail.rating} size="md" showValue />
              </>
            )}
          </div>

          {detail.creators.length > 0 && (
            <p className="mt-2 text-sm text-muted">
              {detail.creators.join(", ")}
            </p>
          )}

          {detail.description && (
            <p className="mt-4 text-sm leading-relaxed text-ink/90">
              {detail.description}
            </p>
          )}

          {user ? (
            <SaveButton item={item} initialSaved={saved} />
          ) : (
            <Link
              href="/login"
              className="mt-6 inline-block rounded-lg border border-edge px-3 py-1.5 text-sm text-ink/80 transition hover:border-accent hover:text-accent"
            >
              Sign in to save to your list
            </Link>
          )}
        </div>
      </div>

      <CommentsSection itemId={detail.id} itemType={detail.type} />
    </main>
  );
}
