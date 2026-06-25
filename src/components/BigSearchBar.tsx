import Button from "@/components/ui/Button";

// A large, prominent search box for the search page. Plain GET form so it
// works with or without JS — submitting navigates to /search?q=…
export default function BigSearchBar({
  defaultValue = "",
}: {
  defaultValue?: string;
}) {
  return (
    <form action="/search" method="get" className="group relative">
      {/* Search icon */}
      <svg
        className="pointer-events-none absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-muted transition group-focus-within:text-accent"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>

      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        autoFocus
        placeholder="Search books and movies…"
        aria-label="Search books and movies"
        className="w-full rounded-2xl border-2 border-edge bg-surface py-5 pl-14 pr-32 text-xl text-ink shadow-[var(--shadow-md)] outline-none transition placeholder:text-muted/70 focus:border-accent focus:shadow-[var(--shadow-lg)]"
      />

      <Button type="submit" variant="primary" shape="xl"
        className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-3">
        Search
      </Button>
    </form>
  );
}
