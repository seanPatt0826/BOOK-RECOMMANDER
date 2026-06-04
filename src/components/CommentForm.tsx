"use client";

import { useState, useTransition } from "react";

export default function CommentForm({
  action,
  placeholder = "Write a comment…",
  submitLabel = "Post",
}: {
  action: (body: string) => Promise<void>;
  placeholder?: string;
  submitLabel?: string;
}) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    startTransition(async () => {
      await action(text);
      setBody("");
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-3">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={3}
        maxLength={4000}
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={pending || body.trim().length === 0}
        className="mt-2 rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "Posting…" : submitLabel}
      </button>
    </form>
  );
}
