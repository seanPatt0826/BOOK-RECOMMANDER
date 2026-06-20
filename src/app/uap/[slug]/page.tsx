import { notFound } from "next/navigation";
import { getCase } from "@/lib/uap/cases";
import Chip from "@/components/ui/Chip";

export default async function CasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const uapCase = getCase(slug);
  if (!uapCase) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <header>
        <h1 className="text-3xl font-semibold">{uapCase.name}</h1>
        <p className="mt-1 text-sm text-accent">
          {uapCase.dateLabel} · {uapCase.location}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {uapCase.tags.map((t) => (
            <Chip key={t}>{t}</Chip>
          ))}
        </div>
      </header>

      <Section title="What was reported">
        <p className="text-sm leading-relaxed text-ink/90">
          {uapCase.reported}
        </p>
      </Section>

      <Section title="Available evidence">
        <p className="text-sm leading-relaxed text-ink/90">
          {uapCase.evidence}
        </p>
      </Section>

      <Section title="Skeptical explanations">
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink/90">
          {uapCase.skepticalExplanations.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </Section>

      <Section title="Open questions">
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink/90">
          {uapCase.openQuestions.map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ul>
      </Section>

      <Section title="Sources">
        <ul className="space-y-2 text-sm">
          {uapCase.sources.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline-offset-2 hover:underline"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </Section>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center gap-3">
        <span className="h-5 w-1 rounded-full bg-accent" />
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}
