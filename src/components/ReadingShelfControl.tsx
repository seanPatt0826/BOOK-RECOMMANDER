"use client";

import { useState, useTransition } from "react";
import { saveItem, removeItem, setReadingStatus } from "@/lib/saved-actions";
import {
  READING_STATUSES,
  DEFAULT_READING_STATUS,
  type ReadingStatus,
} from "@/lib/readingStatus";
import type { SearchResult } from "@/lib/sources/types";
import Button from "@/components/ui/Button";

/**
 * Save toggle plus the reading-status pills for the title page. The pills only
 * appear once the item is saved; picking one moves it to that shelf. State is
 * optimistic — server actions revalidate the home shelves in the background.
 */
export default function ReadingShelfControl({
  item,
  initialSaved,
  initialStatus,
}: {
  item: SearchResult;
  initialSaved: boolean;
  initialStatus: ReadingStatus;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [status, setStatus] = useState<ReadingStatus>(initialStatus);
  const [pending, startTransition] = useTransition();

  function toggleSave() {
    startTransition(async () => {
      if (saved) {
        await removeItem(item.id, item.type);
        setSaved(false);
      } else {
        await saveItem(item);
        setSaved(true);
        setStatus(DEFAULT_READING_STATUS); // new saves start on "Want to read"
      }
    });
  }

  function pick(next: ReadingStatus) {
    if (next === status) return;
    setStatus(next); // optimistic
    startTransition(async () => {
      await setReadingStatus(item.id, item.type, next);
    });
  }

  return (
    <div className="mt-6">
      <Button
        type="button"
        onClick={toggleSave}
        disabled={pending}
        aria-pressed={saved}
        variant={saved ? "primary" : "secondary"}
        className={`${saved ? "" : "text-ink/80"} ${pending ? "opacity-60" : ""}`}
      >
        {saved ? "✓ Saved" : "Save to my list"}
      </Button>

      {saved && (
        <div
          className="mt-3 flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Reading status"
        >
          {READING_STATUSES.map((s) => {
            const active = status === s.value;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => pick(s.value)}
                disabled={pending}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  active
                    ? "border-accent bg-accent text-accent-contrast"
                    : "border-edge text-ink/70 hover:border-accent hover:text-accent"
                } ${pending ? "opacity-60" : ""}`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
