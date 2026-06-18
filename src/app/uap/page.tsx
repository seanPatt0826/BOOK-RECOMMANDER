import { getAllCases, allTags } from "@/lib/uap/cases";
import CaseBrowser from "@/components/CaseBrowser";

export const metadata = {
  title: "UAP Encyclopedia · ShelfMate",
  description:
    "Famous UFO/UAP cases — what was reported, the evidence, skeptical explanations, and what stays unresolved.",
};

export default function UapPage() {
  const cases = getAllCases();
  const tags = allTags();

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <header className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <span className="h-6 w-1 rounded-full bg-accent" />
          <h1 className="text-3xl font-semibold">UAP Encyclopedia</h1>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          Famous UFO and UAP cases, presented with multiple viewpoints: what was
          reported, the available evidence, the skeptical explanations, and the
          questions that remain open.
        </p>
      </header>

      <CaseBrowser cases={cases} tags={tags} />
    </main>
  );
}
