/**
 * Client-side helper for the AI summarization endpoint.
 *
 * Calls our own /api/ai/summarize Route Handler so the Gemini API key never
 * ships to the browser. Always returns a string — falls back to a trimmed
 * preview of the original text on any failure so callers don't need to
 * branch on errors.
 */

const FALLBACK_LENGTH = 140;

export interface SummarizeResult {
  summary: string;
  /** True when the summary came from Gemini, false when we fell back. */
  ai: boolean;
}

function localFallback(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= FALLBACK_LENGTH) return trimmed;
  return `${trimmed.slice(0, FALLBACK_LENGTH).trimEnd()}…`;
}

/**
 * Hit the API route to summarize `text` into a 15-word punchy sentence.
 * Returns just the string for ergonomic call-sites; use `summarizeTextDetailed`
 * if you need to know whether the AI was actually used.
 */
export async function summarizeText(text: string): Promise<string> {
  const result = await summarizeTextDetailed(text);
  return result.summary;
}

export async function summarizeTextDetailed(
  text: string,
): Promise<SummarizeResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { summary: "", ai: false };
  }

  try {
    const res = await fetch("/api/ai/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: trimmed }),
    });

    if (!res.ok) {
      return { summary: localFallback(trimmed), ai: false };
    }

    const data = (await res.json()) as { summary?: string; ai?: boolean };
    if (typeof data.summary !== "string" || data.summary.length === 0) {
      return { summary: localFallback(trimmed), ai: false };
    }

    return { summary: data.summary, ai: Boolean(data.ai) };
  } catch {
    return { summary: localFallback(trimmed), ai: false };
  }
}
