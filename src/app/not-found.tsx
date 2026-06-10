import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-5xl font-semibold">Page not found</h1>
      <p className="mt-3 text-muted">
        We couldn&rsquo;t find what you were looking for.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-contrast transition hover:bg-accent-strong"
      >
        Back to home
      </Link>
    </main>
  );
}
