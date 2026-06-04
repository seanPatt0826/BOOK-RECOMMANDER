import { NextResponse } from "next/server";
import { getSuggestions } from "@/lib/history";

export const dynamic = "force-dynamic";

export async function GET() {
  const suggestions = await getSuggestions();
  return NextResponse.json({ suggestions });
}
