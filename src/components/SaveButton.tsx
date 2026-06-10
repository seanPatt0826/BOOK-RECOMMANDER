"use client";

import { useState, useTransition } from "react";
import { saveItem, removeItem } from "@/lib/saved-actions";
import type { SearchResult } from "@/lib/sources/types";

export default function SaveButton({
  item,
  initialSaved,
}: {
  item: SearchResult;
  initialSaved: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      if (saved) {
        await removeItem(item.id, item.type);
        setSaved(false);
      } else {
        await saveItem(item);
        setSaved(true);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
      className={`mt-6 rounded-lg border px-4 py-2 text-sm font-medium transition ${
        saved
          ? "border-accent bg-accent text-accent-contrast hover:bg-accent-strong"
          : "border-edge text-ink/80 hover:border-accent hover:text-accent"
      } ${pending ? "opacity-60" : ""}`}
    >
      {saved ? "✓ Saved" : "Save to my list"}
    </button>
  );
}
