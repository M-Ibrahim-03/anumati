/**
 * Client helper for the /api/ai/generate route.
 *
 * Expands a short user prompt into a formal 3-paragraph application
 * letter. Always returns a string — falls back to a sensible scaffold
 * on any error so call-sites don't need try/catch.
 */

export interface GenerateLetterResult {
  letter: string;
  /** True when the letter came from Gemini, false when we fell back. */
  ai: boolean;
}

export async function generateLetter(prompt: string): Promise<string> {
  const result = await generateLetterDetailed(prompt);
  return result.letter;
}

export async function generateLetterDetailed(
  prompt: string,
): Promise<GenerateLetterResult> {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return { letter: "", ai: false };
  }

  try {
    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: trimmed }),
    });

    if (!res.ok) {
      return { letter: "", ai: false };
    }

    const data = (await res.json()) as { letter?: string; ai?: boolean };
    if (typeof data.letter !== "string" || data.letter.length === 0) {
      return { letter: "", ai: false };
    }

    return { letter: data.letter, ai: Boolean(data.ai) };
  } catch {
    return { letter: "", ai: false };
  }
}
