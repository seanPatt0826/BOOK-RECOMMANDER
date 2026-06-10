import { createBrowserClient } from "@supabase/ssr";

// NOTE: in browser code, NEXT_PUBLIC_* vars are only inlined when accessed via
// static `process.env.NAME` member access. Dynamic lookup (process.env[name],
// as our requireEnv helper does) is NOT replaced in the client bundle, so we
// read them statically here.
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL or " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY. Add it to .env.local (see .env.example).",
    );
  }
  return createBrowserClient(url, anonKey);
}
