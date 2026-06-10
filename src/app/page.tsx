import { getCarouselItems } from "@/lib/home";
import { getSavedItems } from "@/lib/saved";
import Carousel from "@/components/Carousel";
import ResultCard from "@/components/ResultCard";
import { Suspense } from "react";
import HomeRecommendations from "@/components/HomeRecommendations";
import HomeBackground from "@/components/HomeBackground";

export default async function HomePage() {
  const [carousel, saved] = await Promise.all([
    getCarouselItems(),
    getSavedItems(),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-accent">
            Books &amp; Movies
          </p>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            Welcome to ShelfMate
          </h1>
          <p className="mt-3 text-lg text-muted">
            Discover your next great read or watch — and keep your own shelf.
          </p>
        </div>
        <HomeBackground />
      </header>

      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_18rem]">
        <section>
          <h2 className="mb-4 text-2xl font-semibold">Discover</h2>
          <Carousel items={carousel} />
        </section>

        <aside>
          <h2 className="mb-4 text-2xl font-semibold">Your shelf</h2>
          {saved.length === 0 ? (
            <p className="rounded-xl border border-dashed border-edge bg-surface/50 p-4 text-sm text-muted">
              You haven&rsquo;t saved anything yet. Open a title and tap
              &ldquo;Save to my list&rdquo;.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {saved.map((item) => (
                <ResultCard key={`${item.type}-${item.id}`} item={item} />
              ))}
            </div>
          )}
        </aside>
      </div>

      <Suspense
        fallback={
          <p className="mt-12 text-sm text-muted">
            Finding recommendations for you…
          </p>
        }
      >
        <HomeRecommendations />
      </Suspense>
    </main>
  );
}
