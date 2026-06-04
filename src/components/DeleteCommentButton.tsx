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
      className="text-xs text-gray-400 hover:text-red-600 disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
