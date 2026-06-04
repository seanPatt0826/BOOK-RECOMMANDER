import { createAnthropic, AI_MODEL } from "@/lib/ai/client";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const BASE_SYSTEM = `You are ShelfMate's friendly assistant. You help people discover books and movies and talk about what to read or watch next. Keep replies concise and conversational. If asked for recommendations, suggest specific titles with a one-line reason each.`;

/** Build the chat system prompt, weaving in recent searches as context. */
export function buildChatSystem(recentQueries: string[]): string {
  if (recentQueries.length === 0) return BASE_SYSTEM;
  return (
    BASE_SYSTEM +
    `\n\nFor context, the user recently searched for: ${recentQueries.join(", ")}.`
  );
}

/** Validate + clamp an untrusted messages payload into safe ChatMessages. */
export function sanitizeMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const valid: ChatMessage[] = [];
  for (const m of raw) {
    if (m && typeof m === "object") {
      const mm = m as { role?: unknown; content?: unknown };
      if (
        (mm.role === "user" || mm.role === "assistant") &&
        typeof mm.content === "string"
      ) {
        valid.push({ role: mm.role, content: mm.content.slice(0, 4000) });
      }
    }
  }
  return valid.slice(-20);
}

/** Get the assistant's reply for a conversation. Throws if the AI is down. */
export async function chatReply(
  messages: ChatMessage[],
  recentQueries: string[],
): Promise<string> {
  const client = createAnthropic();
  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: buildChatSystem(recentQueries),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });
  const block = response.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}
