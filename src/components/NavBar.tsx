import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SearchBar from "@/components/SearchBar";
import ThemeToggle from "@/components/ThemeToggle";

export default async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <nav className="sticky top-0 z-40 border-b border-edge bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <Link
          href="/"
          className="font-display text-xl font-semibold tracking-tight text-accent"
        >
          ShelfMate
        </Link>
        <div className="hidden items-center gap-5 sm:flex">
          <Link
            href="/search"
            className="text-sm text-ink/75 transition hover:text-accent"
          >
            Search
          </Link>
          <Link
            href="/community"
            className="text-sm text-ink/75 transition hover:text-accent"
          >
            Community
          </Link>
          <Link
            href="/chat"
            className="text-sm text-ink/75 transition hover:text-accent"
          >
            AI Chat
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <SearchBar />
          <ThemeToggle />
          {user ? (
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-sm text-muted transition hover:text-accent"
              >
                Sign out
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-contrast transition hover:bg-accent-strong"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
