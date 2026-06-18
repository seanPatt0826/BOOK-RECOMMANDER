"use client";

import { useState } from "react";
import CaseCard from "@/components/CaseCard";
import type { UapCase } from "@/lib/uap/types";

// Cases grid on the left; a sticky tag nav on the right filters it instantly,
// with no reload. "All cases" shows everything. Mirrors GenreBrowser.
export default function CaseBrowser({
  cases,
  tags,
}: {
  cases: UapCase[];
  tags: string[];
}) {
  const [active, setActive] = useState<string>("all");

  const visible =
    active === "all" ? cases : cases.filter((c) => c.tags.includes(active));

  const navItem = (selected: boolean) =>
    `flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
      selected
        ? "bg-accent text-accent-contrast shadow-[var(--shadow-sm)]"
        : "text-ink/75 hover:bg-surface-2 hover:text-accent"
    }`;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_16rem]">
      <div className="min-w-0">
        {visible.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {visible.map((c) => (
              <CaseCard key={c.slug} uapCase={c} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No cases match this filter yet.</p>
        )}
      </div>

      <aside>
        <div className="lg:sticky lg:top-20">
          <div className="mb-4 flex items-center gap-3">
            <span className="h-5 w-1 rounded-full bg-violet" />
            <h2 className="text-lg font-semibold">Filter by tag</h2>
          </div>
          <nav className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setActive("all")}
              className={navItem(active === "all")}
            >
              <span>All cases</span>
              <span className="text-xs opacity-70">{cases.length}</span>
            </button>
            {tags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setActive(t)}
                className={navItem(active === t)}
              >
                <span className="truncate">{t}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>
    </div>
  );
}
