export default function Footer() {
  return (
    <footer className="mt-12 border-t border-edge bg-surface/60">
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted">
        <p>
          <span className="font-display text-accent">ShelfMate</span> — search
          books &amp; movies, save your list, and get AI-powered
          recommendations.
        </p>
        <p className="mt-1 text-xs text-muted/80">
          Book data from Google Books. Movie data from TMDB. Built with Next.js
          &amp; Supabase.
        </p>
      </div>
    </footer>
  );
}
