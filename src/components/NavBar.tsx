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
    <nav className="glass sticky top-0 z-40 border-b border-edge/80">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <Link
          href="/"
          className="group flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-ink"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-sm font-bold text-accent-contrast shadow-[var(--shadow-sm)] transition group-hover:rotate-6">
            S
          </span>
          <span>
            Shelf<span className="text-accent">Mate</span>
          </span>
        </Link>
        <div className="hidden items-center gap-1 sm:flex">
          {[
            { href: "/search", label: "Search" },
            { href: "/community", label: "Community" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-ink/70 transition hover:bg-surface-2 hover:text-accent"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <SearchBar />
          <ThemeToggle />
          {user ? (
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-full border border-edge px-4 py-1.5 text-sm font-medium text-muted transition hover:border-accent hover:text-accent"
              >
                Sign out
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-contrast shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:bg-accent-strong"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
