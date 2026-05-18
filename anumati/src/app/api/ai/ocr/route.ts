/**
 * POST /api/ai/ocr
 *
 * Body: { image: string (base64), description: string }
 * Response: { verified: boolean, reason: string, ai: boolean }
 *
 * Uses Gemini 1.5 Flash's vision capability to read a document image
 * (e.g. a medical certificate) and cross-check it against the student's
 * typed request description. Returns whether the document validates the
 * claim.
 *
 * If the API key is missing or the call fails, returns a safe default
 * (verified: false with a note that OCR was skipped).
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are an OCR validation bot. Read the provided document image carefully.
Does the information (dates, names, reason) in the physical document perfectly validate and match the student's typed request description below?

Output strict JSON with exactly two fields:
- "verified": boolean (true if the document supports the request, false otherwise)
- "reason": a brief 1-sentence explanation

Output ONLY the JSON object, no markdown fences, no preamble.

Student's request description:
`;

const MAX_DESC_CHARS = 4000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB base64 limit

interface OcrResult {
  verified: boolean;
  reason: string;
}

function fallbackResult(): OcrResult {
  return {
    verified: false,
    reason: "OCR verification was skipped (no API key or service unavailable).",
  };
}

function parseOcrResponse(raw: string): OcrResult | null {
  const cleaned = raw
    .replace(/^\s*```json?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const verified = Boolean(parsed.verified);
    const reason = String(parsed.reason ?? "");

    if (!reason) return null;
    return { verified, reason };
  } catch {
    return null;
  }
}

/**
 * Detect the MIME type from a base64 data-URI prefix, or default to
 * image/png if the string is raw base64 without a prefix.
 */
function extractMimeAndData(input: string): { mime: string; data: string } {
  const match = input.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    return { mime: match[1], data: match[2] };
  }
  // Assume raw base64 PNG if no data-URI prefix.
  return { mime: "image/png", data: input };
}

export async function POST(request: Request) {
  let image = "";
  let description = "";

  try {
    const body = (await request.json()) as {
      image?: unknown;
      description?: unknown;
    };

    if (typeof body.image !== "string" || typeof body.description !== "string") {
      return Response.json(
        { error: "Body must be { image: string (base64), description: string }." },
        { status: 400 },
      );
    }

    image = body.image.trim();
    description = body.description.trim().slice(0, MAX_DESC_CHARS);
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!image) {
    return Response.json({ error: "Image is required." }, { status: 400 });
  }
  if (!description) {
    return Response.json(
      { error: "Description is required for cross-validation." },
      { status: 400 },
    );
  }
  if (image.length > MAX_IMAGE_BYTES) {
    return Response.json(
      { error: "Image exceeds the 10 MB size limit." },
      { status: 400 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return Response.json({ ...fallbackResult(), ai: false });
  }

  const { mime, data } = extractMimeAndData(image);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent([
      { text: `${SYSTEM_PROMPT}${description}` },
      {
        inlineData: {
          mimeType: mime,
          data,
        },
      },
    ]);

    const rawText = result.response.text();
    const parsed = parseOcrResponse(rawText);

    if (!parsed) {
      console.error("[anumati] ocr: could not parse model response:", rawText);
      return Response.json({ ...fallbackResult(), ai: false });
    }

    return Response.json({ ...parsed, ai: true });
  } catch (err) {
    console.error("[anumati] gemini ocr failed:", err);
    return Response.json({ ...fallbackResult(), ai: false });
  }
}
