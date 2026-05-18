/**
 * POST /api/ai/summarize
 *
 * Body: { text: string }
 * Response: { summary: string, ai: boolean }
 *
 * Sends the text to Gemini with a tight "15-word punchy sentence" prompt.
 * If GEMINI_API_KEY is missing or the call fails, returns a local
 * truncated preview so the UI never crashes during a demo.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROMPT_PREFIX =
  "Summarize this student request into a single, punchy 15-word sentence. " +
  "Output only the sentence, no preamble, no quotes, no markdown.\n\nRequest:\n";

const FALLBACK_LENGTH = 140;
const MAX_INPUT_CHARS = 8000;

function localFallback(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= FALLBACK_LENGTH) return trimmed;
  return `${trimmed.slice(0, FALLBACK_LENGTH).trimEnd()}…`;
}

function cleanModelOutput(raw: string): string {
  return raw
    .trim()
    .replace(/^["“'`]+|["”'`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(request: Request) {
  let text = "";
  try {
    const body = (await request.json()) as { text?: unknown };
    if (typeof body.text !== "string") {
      return Response.json(
        { error: "Body must be { text: string }." },
        { status: 400 },
      );
    }
    text = body.text.trim().slice(0, MAX_INPUT_CHARS);
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!text) {
    return Response.json({ summary: "", ai: false });
  }

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;

  // Graceful degrade: no key configured, return a sensible preview.
  if (!apiKey) {
    return Response.json({ summary: localFallback(text), ai: false });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const result = await model.generateContent(`${PROMPT_PREFIX}${text}`);
    const summary = cleanModelOutput(result.response.text());

    if (!summary) {
      return Response.json({ summary: localFallback(text), ai: false });
    }

    return Response.json({ summary, ai: true });
  } catch (err) {
    // Don't 500 the demo — log and fall back.
    console.error("[anumati] gemini summarize failed:", err);
    return Response.json({ summary: localFallback(text), ai: false });
  }
}
