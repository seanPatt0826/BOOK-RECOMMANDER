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
      className={`mt-6 rounded border px-3 py-1.5 text-sm transition ${
        saved
          ? "border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700"
          : "border-gray-300 text-gray-700 hover:bg-gray-50"
      } ${pending ? "opacity-60" : ""}`}
    >
      {saved ? "✓ Saved" : "Save to my list"}
    </button>
  );
}
