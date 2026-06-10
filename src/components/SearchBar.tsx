"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchBar() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  function go(query: string) {
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  async function loadSuggestions() {
    setOpen(true);
    try {
      const res = await fetch("/api/history/suggestions");
      if (!res.ok) return;
      const data = (await res.json()) as { suggestions: string[] };
      setSuggestions(data.suggestions ?? []);
    } catch {
      // Network hiccup — just show no suggestions.
      setSuggestions([]);
    }
  }

  return (
    <div className="relative w-full max-w-[10rem] sm:max-w-xs">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(value);
        }}
      >
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={loadSuggestions}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search books & movies"
          className="w-full rounded-full border border-edge bg-surface px-4 py-1.5 text-sm text-ink placeholder:text-muted/70 focus:border-accent"
          aria-label="Search books and movies"
        />
      </form>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-edge bg-surface shadow-lg">
          {suggestions.map((s) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setValue(s);
                  go(s);
                }}
                className="block w-full px-4 py-2 text-left text-sm text-ink/90 transition hover:bg-surface-2 hover:text-accent"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
