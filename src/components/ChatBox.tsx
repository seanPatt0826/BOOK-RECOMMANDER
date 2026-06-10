"use client";

import { useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

// A friendly little robot, used faded in the background.
function RobotIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="3.5" r="1" />
      <path d="M12 4.5V7" />
      <rect x="5" y="7" width="14" height="11" rx="2.5" />
      <path d="M5 11.5H3M21 11.5h-2" />
      <circle cx="9.5" cy="12" r="1.1" />
      <circle cx="14.5" cy="12" r="1.1" />
      <path d="M9.5 15.5h5" />
    </svg>
  );
}

// Scattered start positions / speeds so the robots fall out of sync.
const ROBOTS = [
  { left: "7%", size: 26, delay: "0s", duration: "7s" },
  { left: "23%", size: 18, delay: "2.6s", duration: "9.5s" },
  { left: "40%", size: 33, delay: "1.1s", duration: "8s" },
  { left: "57%", size: 20, delay: "3.8s", duration: "10.5s" },
  { left: "73%", size: 28, delay: "0.7s", duration: "7.5s" },
  { left: "89%", size: 16, delay: "4.4s", duration: "11s" },
];

export default function ChatBox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || pending) return;

    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setError(null);
    setPending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Something went wrong.");
        return;
      }
      const data = (await res.json()) as { reply: string };
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch {
      setError("Couldn't reach the assistant. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-6 flex flex-col">
      <div className="relative min-h-64 overflow-hidden rounded-2xl border-2 border-accent/25 bg-surface p-4 shadow-sm transition hover:border-accent/40">
        {/* Faded robots drifting down behind the conversation. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          {ROBOTS.map((r, i) => (
            <span
              key={i}
              className="shelf-robot"
              style={{
                left: r.left,
                animationDelay: r.delay,
                animationDuration: r.duration,
              }}
            >
              <RobotIcon size={r.size} />
            </span>
          ))}
        </div>

        <div className="relative z-10 space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-muted">
              Ask me for a recommendation — e.g. &ldquo;a sci-fi book like
              Dune&rdquo;.
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={m.role === "user" ? "text-right" : "text-left"}
            >
              <span
                className={`inline-block max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-accent text-accent-contrast"
                    : "bg-surface-2 text-ink"
                }`}
              >
                {m.content}
              </span>
            </div>
          ))}
          {pending && <p className="text-sm text-muted">Thinking…</p>}
        </div>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <form onSubmit={send} className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about books or movies…"
          className="flex-1 rounded-lg border border-edge bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-accent"
        />
        <button
          type="submit"
          disabled={pending || input.trim().length === 0}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-contrast transition hover:bg-accent-strong disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
