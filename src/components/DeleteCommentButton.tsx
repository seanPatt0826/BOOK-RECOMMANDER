"use client";

import { useTransition } from "react";

export default function DeleteCommentButton({
  action,
}: {
  action: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => startTransition(async () => { await action(); })}
      disabled={pending}
      className="text-xs text-muted transition hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
