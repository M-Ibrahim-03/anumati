/**
 * POST /api/ai/generate
 *
 * Body: { prompt: string }
 * Response: { letter: string, ai: boolean }
 *
 * Expands a short, plain-language prompt (e.g. "I need 2 days leave for a
 * hackathon") into a formal, polite, 3-paragraph college application
 * letter. If GEMINI_API_KEY is missing or the call fails, returns a
 * sensible scaffold so the UI never crashes during a demo.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT =
  "Write a formal, polite, 3-paragraph college application letter based on " +
  "this prompt. Output only the letter text — no salutation placeholders " +
  "like [Your Name], no markdown headings, no preamble or commentary. " +
  "Use a respectful, formal academic tone suited for an Indian college. " +
  "Keep the three paragraphs distinct: (1) introduction and request, " +
  "(2) reason and supporting context, (3) polite closing.\n\nPrompt:\n";

const MAX_PROMPT_CHARS = 2000;

function cleanModelOutput(raw: string): string {
  // Strip code fences if the model wrapped the letter, and trim leading/
  // trailing whitespace. Preserve internal newlines (paragraph breaks).
  return raw
    .replace(/^\s*```[a-z]*\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

function localFallback(prompt: string): string {
  const topic = prompt.trim().replace(/\s+/g, " ").slice(0, 240) || "my request";
  return [
    `Respected Sir/Madam,`,
    ``,
    `I am writing to formally request your kind consideration regarding ${topic}. ` +
      `I have given this matter careful thought and believe your approval would ` +
      `allow me to proceed in a manner consistent with the standards of our institution.`,
    ``,
    `The reason for this request is straightforward and important to my academic ` +
      `progress. I assure you that I will make every effort to compensate for any ` +
      `missed coursework or responsibilities, and I am happy to provide any further ` +
      `information or documentation that may be helpful in your decision.`,
    ``,
    `Thank you very much for taking the time to consider my request. I sincerely ` +
      `appreciate your support and guidance, and I look forward to your kind response.`,
    ``,
    `Yours respectfully,`,
  ].join("\n");
}

export async function POST(request: Request) {
  let prompt = "";
  try {
    const body = (await request.json()) as { prompt?: unknown };
    if (typeof body.prompt !== "string") {
      return Response.json(
        { error: "Body must be { prompt: string }." },
        { status: 400 },
      );
    }
    prompt = body.prompt.trim().slice(0, MAX_PROMPT_CHARS);
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!prompt) {
    return Response.json(
      { error: "Prompt cannot be empty." },
      { status: 400 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;

  // No key configured — hand back a reasonable scaffold.
  if (!apiKey) {
    return Response.json({ letter: localFallback(prompt), ai: false });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(`${SYSTEM_PROMPT}${prompt}`);
    const letter = cleanModelOutput(result.response.text());

    if (!letter) {
      return Response.json({ letter: localFallback(prompt), ai: false });
    }

    return Response.json({ letter, ai: true });
  } catch (err) {
    // Don't 500 the demo — log and fall back.
    console.error("[anumati] gemini generate failed:", err);
    return Response.json({ letter: localFallback(prompt), ai: false });
  }
}
