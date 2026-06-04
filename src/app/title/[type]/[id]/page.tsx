import { notFound } from "next/navigation";
import { getBook } from "@/lib/sources/googleBooks";
import { getMovie } from "@/lib/sources/tmdb";
import type { MediaDetail } from "@/lib/sources/types";

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
        <p className="text-gray-600">
          We couldn&rsquo;t load this title right now. Please try again later.
        </p>
      </main>
    );
  }

  if (!detail) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="w-40 flex-shrink-0">
          <div className="flex aspect-[2/3] items-center justify-center overflow-hidden rounded bg-gray-100">
            {detail.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={detail.coverUrl}
                alt={`Cover of ${detail.title}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xs text-gray-400">No cover</span>
            )}
          </div>
        </div>

        <div className="flex-1">
          <h1 className="text-2xl font-bold">{detail.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            <span className="capitalize">{detail.type}</span>
            {detail.year ? ` · ${detail.year}` : ""}
            {detail.rating !== null ? ` · ★ ${detail.rating}` : ""}
          </p>

          {detail.creators.length > 0 && (
            <p className="mt-2 text-sm text-gray-700">
              {detail.creators.join(", ")}
            </p>
          )}

          {detail.description && (
            <p className="mt-4 text-sm leading-relaxed text-gray-800">
              {detail.description}
            </p>
          )}

          <button
            type="button"
            disabled
            className="mt-6 cursor-not-allowed rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-400"
          >
            Save to my list (Phase 3)
          </button>
        </div>
      </div>

      <section className="mt-10 border-t border-gray-200 pt-6">
        <h2 className="text-lg font-semibold">Comments</h2>
        <p className="mt-1 text-sm text-gray-500">
          Comments arrive in Phase 4.
        </p>
      </section>
    </main>
  );
}
