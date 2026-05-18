/**
 * Anumati domain types.
 *
 * This is the single source of truth for shapes that flow through the
 * approval workflow. Keep it framework-agnostic (no React imports) so it
 * can be shared between server components, client components, and helpers.
 */

// ---------------------------------------------------------------------------
// Roles & users
// ---------------------------------------------------------------------------

export type Role = "STUDENT" | "ADVISOR" | "HOD" | "PRINCIPAL" | "ADMIN";

export interface User {
  id: string;
  name: string;
  role: Role;
}

/**
 * Matches the `faculty_users` table in Supabase.
 * Used for faculty/admin directory lookups and role verification.
 */
export interface FacultyUser {
  id: string;
  name: string;
  role: Role;
  isVerified: boolean;
  /** ISO 8601 timestamp. */
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Workflow state machine
// ---------------------------------------------------------------------------

export type Status =
  | "DRAFT"
  | "PENDING_ADVISOR"
  | "PENDING_HOD"
  | "PENDING_PRINCIPAL"
  | "APPROVED"
  | "REJECTED";

export type RequestType = "LEAVE" | "EVENT" | "PROJECT";

export type ApprovalAction =
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "ESCALATED"
  | "FORWARDED";

export interface ApprovalEvent {
  id: string;
  /** ISO 8601 timestamp string (e.g. new Date().toISOString()). */
  timestamp: string;
  actorId: string;
  actorRole: Role;
  action: ApprovalAction;
  comment?: string;
}

// ---------------------------------------------------------------------------
// AI policy check result (populated by the AI moderation pipeline).
// ---------------------------------------------------------------------------

export type AiPolicyStatus = "APPROVED" | "WARNING" | "FLAGGED";

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

export interface Request {
  id: string;
  studentId: string;
  studentName: string;
  type: RequestType;
  title: string;
  description: string;
  /** Optional LLM-generated TL;DR shown to higher authorities. */
  aiSummary?: string;
  status: Status;
  /** ISO 8601 timestamp string. */
  createdAt: string;
  /** ISO 8601 timestamp string. Bumped on every transition. */
  updatedAt: string;
  history: ApprovalEvent[];

  // --- AI moderation fields ------------------------------------------------

  /** Result of the AI content-policy check on the request text. */
  aiPolicyStatus?: AiPolicyStatus;
  /** Human-readable reason from the AI policy checker. */
  aiPolicyReason?: string;

  // --- Document attachment --------------------------------------------------

  /** Base64-encoded document (e.g. scanned leave certificate). */
  documentBase64?: string;
  /** Whether the AI OCR pipeline has verified the attached document. */
  aiOcrVerified?: boolean;
}
