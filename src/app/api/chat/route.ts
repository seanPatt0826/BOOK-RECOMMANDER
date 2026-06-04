import { NextResponse } from "next/server";
import { chatReply, sanitizeMessages } from "@/lib/ai/chat";
import { getSuggestions } from "@/lib/history";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  // Require sign-in — the chat calls a paid model, so don't expose it anonymously.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Please sign in to use the chat." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const messages = sanitizeMessages((body as { messages?: unknown })?.messages);
  if (messages.length === 0) {
    return NextResponse.json({ error: "No messages." }, { status: 400 });
  }

  try {
    const recentQueries = await getSuggestions(8);
    const reply = await chatReply(messages, recentQueries);
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json(
      { error: "The assistant is unavailable right now. Please try again." },
      { status: 503 },
    );
  }
}
