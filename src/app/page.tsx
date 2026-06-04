import { getCarouselItems } from "@/lib/home";
import { getSavedItems } from "@/lib/saved";
import Carousel from "@/components/Carousel";
import ResultCard from "@/components/ResultCard";
import { Suspense } from "react";
import HomeRecommendations from "@/components/HomeRecommendations";

export default async function HomePage() {
  const [carousel, saved] = await Promise.all([
    getCarouselItems(),
    getSavedItems(),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">Welcome to ShelfMate</h1>
      <p className="mt-1 text-gray-600">
        Discover books and movies, and keep your own list.
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_18rem]">
        <section>
          <h2 className="mb-3 text-xl font-semibold">Discover</h2>
          <Carousel items={carousel} />
        </section>

        <aside>
          <h2 className="mb-3 text-xl font-semibold">Your list</h2>
          {saved.length === 0 ? (
            <p className="text-sm text-gray-500">
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
          <p className="mt-10 text-sm text-gray-400">
            Finding recommendations for you…
          </p>
        }
      >
        <HomeRecommendations />
      </Suspense>
    </main>
  );
}
