/**
 * Fetch JSON with an abort timeout. Throws on non-2xx or timeout so callers
 * can decide how to degrade. Returns the parsed body as `unknown` — callers
 * narrow it via their normalizers.
 */
export async function fetchJson(
  url: string,
  init?: RequestInit,
  timeoutMs = 8000,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Request failed (${res.status}): ${url}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
