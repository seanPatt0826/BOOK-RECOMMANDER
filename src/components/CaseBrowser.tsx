"use client";

import { useState } from "react";
import CaseCard from "@/components/CaseCard";
import NavItem from "@/components/ui/NavItem";
import SectionHeader from "@/components/ui/SectionHeader";
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
          <SectionHeader accent="violet" size="lg" className="mb-4">Filter by tag</SectionHeader>
          <nav className="flex flex-col gap-1">
            <NavItem selected={active === "all"} onClick={() => setActive("all")} label="All cases" count={cases.length} />
            {tags.map((t) => (
              <NavItem
                key={t}
                selected={active === t}
                onClick={() => setActive(t)}
                label={t}
                truncate
              />
            ))}
          </nav>
        </div>
      </aside>
    </div>
  );
}
