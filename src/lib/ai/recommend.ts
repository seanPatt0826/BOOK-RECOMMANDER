import { createAnthropic, AI_MODEL } from "@/lib/ai/client";
import type { MediaType } from "@/lib/sources/types";

export interface RecommendationSeed {
  title: string;
  type: MediaType;
  reason: string;
}

const RECOMMEND_SYSTEM = `You are a book and movie recommendation engine for a site called ShelfMate.
Given the titles and topics a user has recently searched, suggest 4 to 6 books or movies they might enjoy that are NOT already in their list.
Respond with ONLY a JSON object — no markdown, no prose — in exactly this shape:
{"recommendations":[{"title":"...","type":"book or movie","reason":"one short sentence"}]}
Each reason must be a single concise sentence. Include a mix of books and movies.`;

/** Format recent queries into the user-turn prompt. */
export function buildHistorySummary(queries: string[]): string {
  return "Recent searches:\n- " + queries.join("\n- ");
}

/** Defensively parse the model's JSON reply into validated seeds (max 6). */
export function parseSeeds(text: string): RecommendationSeed[] {
  const cleaned = text
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  let data: unknown;
  try {
    data = JSON.parse(cleaned);
  } catch {
    return [];
  }
  const list = (data as { recommendations?: unknown }).recommendations;
  if (!Array.isArray(list)) return [];
  const seeds: RecommendationSeed[] = [];
  for (const raw of list) {
    if (typeof raw === "object" && raw !== null) {
      const r = raw as { title?: unknown; type?: unknown; reason?: unknown };
      if (
        typeof r.title === "string" &&
        (r.type === "book" || r.type === "movie") &&
        typeof r.reason === "string"
      ) {
        seeds.push({
          title: r.title,
          type: r.type as MediaType,
          reason: r.reason,
        });
      }
    }
    if (seeds.length >= 6) break;
  }
  return seeds;
}

/** Ask Claude for recommendation seeds from recent queries. [] if none. */
export async function getRecommendationSeeds(
  queries: string[],
): Promise<RecommendationSeed[]> {
  if (queries.length === 0) return [];
  const client = createAnthropic();
  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: RECOMMEND_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: buildHistorySummary(queries) }],
  });
  const block = response.content.find((b) => b.type === "text");
  return block && block.type === "text" ? parseSeeds(block.text) : [];
}
