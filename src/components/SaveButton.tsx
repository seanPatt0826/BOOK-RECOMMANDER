"use client";

import { useState, useTransition } from "react";
import { saveItem, removeItem } from "@/lib/saved-actions";
import type { SearchResult } from "@/lib/sources/types";
import Button from "@/components/ui/Button";

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
    <Button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
      variant={saved ? "primary" : "secondary"}
      className={`mt-6 ${saved ? "" : "text-ink/80"} ${pending ? "opacity-60" : ""}`}
    >
      {saved ? "✓ Saved" : "Save to my list"}
    </Button>
  );
}
