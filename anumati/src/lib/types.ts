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

export type Role = "STUDENT" | "ADVISOR" | "HOD" | "PRINCIPAL";

export interface User {
  id: string;
  name: string;
  role: Role;
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
  | "ESCALATED";

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
}
