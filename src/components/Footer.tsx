export default function Footer() {
  return (
    <footer className="mt-12 border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-gray-500">
        <p>
          ShelfMate — search books &amp; movies, save your list, and get
          AI-powered recommendations.
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Book data from Google Books. Movie data from TMDB. Built with Next.js
          &amp; Supabase.
        </p>
      </div>
    </footer>
  );
}
