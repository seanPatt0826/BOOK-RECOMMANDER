import Button from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-5xl font-semibold">Page not found</h1>
      <p className="mt-3 text-muted">
        We couldn&rsquo;t find what you were looking for.
      </p>
      <Button href="/" variant="primary" shape="pill" className="mt-6">
        Back to home
      </Button>
    </main>
  );
}
