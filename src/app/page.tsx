import { getCarouselItems } from "@/lib/home";
import { getSavedItems } from "@/lib/saved";
import Carousel from "@/components/Carousel";
import { Suspense } from "react";
import HomeBackground from "@/components/HomeBackground";
import GenreShelves from "@/components/GenreShelves";
import RecommendedSection from "@/components/RecommendedSection";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import SectionHeader from "@/components/ui/SectionHeader";

export default async function HomePage() {
  const [carousel, saved] = await Promise.all([
    getCarouselItems(),
    getSavedItems(),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <header className="relative overflow-hidden rounded-[2rem] border border-edge bg-surface/40 px-6 py-14 sm:px-12 sm:py-20">
        {/* Slow-drifting warm aurora behind the headline. */}
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <div
            className="aurora-orb h-72 w-72 -left-10 -top-16"
            style={{ background: "var(--accent)" }}
          />
          <div
            className="aurora-orb h-80 w-80 right-0 -top-10"
            style={{ background: "var(--rose)", animationDelay: "-6s" }}
          />
          <div
            className="aurora-orb h-72 w-72 left-1/3 bottom-0"
            style={{ background: "var(--violet)", animationDelay: "-12s" }}
          />
        </div>

        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <Chip className="reveal reveal-1">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Books &amp; Movies, curated for you
            </Chip>
            <h1 className="reveal reveal-2 mt-5 text-5xl font-semibold leading-[1.04] sm:text-7xl">
              Find your next
              <br />
              <span className="text-gradient">great story.</span>
            </h1>
            <p className="reveal reveal-3 mt-5 max-w-xl text-lg text-muted">
              Search thousands of books and movies, save them to your own shelf,
              and let ShelfMate point you toward what to read or watch next.
            </p>
            <div className="reveal reveal-4 mt-7 flex flex-wrap items-center gap-3">
              <Button href="/search" variant="primary" size="lg" shape="pill"
                className="shadow-[var(--shadow-md)] hover:-translate-y-0.5">
                Start exploring
              </Button>
              <Button href="/community" variant="secondary" size="lg" shape="pill"
                className="bg-surface/60">
                Visit the community
              </Button>
            </div>
          </div>
          <div className="reveal reveal-4">
            <HomeBackground />
          </div>
        </div>
      </header>

      {/* Content on the left, the genre nav on the right. Discover rides along
          in the main column. */}
      <Suspense
        fallback={
          <p className="mt-14 text-sm text-muted">Loading shelves…</p>
        }
      >
        <GenreShelves discover={carousel} />
      </Suspense>

      {/* Recommended for you — inferred from saved titles' genres. Streams in
          its own boundary so its Open Library lookups don't block the page;
          renders nothing when there's no signal (logged out / empty shelf). */}
      <Suspense fallback={null}>
        <RecommendedSection saved={saved} />
      </Suspense>

      {/* Your shelf — saved titles, as their own scroll bar. */}
      <section className="mt-16">
        <SectionHeader accent="rose" size="xl" className="mb-5">Your shelf</SectionHeader>
        {saved.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-edge bg-surface/50 p-5 text-sm text-muted">
            You haven&rsquo;t saved anything yet. Open a title and tap
            &ldquo;Save to my list&rdquo;.
          </p>
        ) : (
          <Carousel items={saved} />
        )}
      </section>
    </main>
  );
}
