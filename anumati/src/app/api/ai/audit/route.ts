/**
 * POST /api/ai/audit
 *
 * Body: { title: string, type: string, description: string }
 * Response: { status: "APPROVED" | "WARNING" | "FLAGGED", reason: string, ai: boolean }
 *
 * Runs the student request through a strict college-policy audit via
 * Gemini. If the API key is missing or the call fails, returns a safe
 * default (APPROVED with a note that the audit was skipped).
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are a strict college policy auditor. Review this student request.

Example policies:
- Standard hackathon leave is 2-3 days max.
- Medical leaves require proofs.
- Event budgets above Rs. 50,000 need special justification.
- Project proposals must mention a faculty mentor.

Respond in strict JSON format with exactly two fields:
- "status": must be exactly one of APPROVED, WARNING, or FLAGGED
- "reason": a 1-sentence explanation of why

Output ONLY the JSON object, no markdown fences, no preamble.`;

const MAX_INPUT_CHARS = 6000;

type AuditStatus = "APPROVED" | "WARNING" | "FLAGGED";

interface AuditResult {
  status: AuditStatus;
  reason: string;
}

function fallbackResult(): AuditResult {
  return {
    status: "APPROVED",
    reason: "AI audit was skipped (no API key or service unavailable).",
  };
}

function parseAuditResponse(raw: string): AuditResult | null {
  // Strip markdown code fences if present.
  const cleaned = raw
    .replace(/^\s*```json?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const status = String(parsed.status ?? "").toUpperCase();
    const reason = String(parsed.reason ?? "");

    if (!["APPROVED", "WARNING", "FLAGGED"].includes(status)) return null;
    if (!reason) return null;

    return { status: status as AuditStatus, reason };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let title = "";
  let type = "";
  let description = "";

  try {
    const body = (await request.json()) as {
      title?: unknown;
      type?: unknown;
      description?: unknown;
    };

    if (
      typeof body.title !== "string" ||
      typeof body.type !== "string" ||
      typeof body.description !== "string"
    ) {
      return Response.json(
        { error: "Body must be { title: string, type: string, description: string }." },
        { status: 400 },
      );
    }

    title = body.title.trim().slice(0, 200);
    type = body.type.trim().slice(0, 50);
    description = body.description.trim().slice(0, MAX_INPUT_CHARS);
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!title || !description) {
    return Response.json(
      { error: "Title and description are required." },
      { status: 400 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return Response.json({ ...fallbackResult(), ai: false });
  }

  const userMessage = `Request Type: ${type}\nTitle: ${title}\nDescription:\n${description}`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(
      `${SYSTEM_PROMPT}\n\n${userMessage}`,
    );
    const rawText = result.response.text();
    const parsed = parseAuditResponse(rawText);

    if (!parsed) {
      console.error("[anumati] audit: could not parse model response:", rawText);
      return Response.json({ ...fallbackResult(), ai: false });
    }

    return Response.json({ ...parsed, ai: true });
  } catch (err) {
    console.error("[anumati] gemini audit failed:", err);
    return Response.json({ ...fallbackResult(), ai: false });
  }
}
