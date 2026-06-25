"use client";

import { useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import Textarea from "@/components/ui/Textarea";

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
      <Textarea value={body} onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder} rows={3} maxLength={4000} className="text-sm" />
      <Button type="submit" variant="primary" size="md" shape="rounded"
        disabled={pending || body.trim().length === 0} className="mt-2 py-1.5">
        {pending ? "Posting…" : submitLabel}
      </Button>
    </form>
  );
}
