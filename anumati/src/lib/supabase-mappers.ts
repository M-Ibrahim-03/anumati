/**
 * Mappers between our domain shapes (camelCase) and the
 * Postgres row shapes (snake_case).
 *
 * Keep this in one place so the store, the action bar, and any future
 * server-side code never disagree on column names.
 */

import type {
  AiPolicyStatus,
  ApprovalEvent,
  FacultyUser,
  Request,
  RequestType,
  Role,
  Status,
} from "./types";

// ===========================================================================
// requests table
// ===========================================================================

/** Row shape expected in the `public.requests` table. */
export interface RequestRow {
  id: string;
  student_id: string;
  student_name: string;
  type: RequestType;
  title: string;
  description: string;
  ai_summary: string | null;
  ai_policy_status: AiPolicyStatus | null;
  ai_policy_reason: string | null;
  document_base64: string | null;
  ai_ocr_verified: boolean;
  status: Status;
  created_at: string;
  updated_at: string;
  history: ApprovalEvent[];
}

export function rowToRequest(row: RequestRow): Request {
  return {
    id: row.id,
    studentId: row.student_id,
    studentName: row.student_name,
    type: row.type,
    title: row.title,
    description: row.description,
    aiSummary: row.ai_summary ?? undefined,
    aiPolicyStatus: row.ai_policy_status ?? undefined,
    aiPolicyReason: row.ai_policy_reason ?? undefined,
    documentBase64: row.document_base64 ?? undefined,
    aiOcrVerified: row.ai_ocr_verified || undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    history: Array.isArray(row.history) ? row.history : [],
  };
}

export function requestToRow(req: Request): RequestRow {
  return {
    id: req.id,
    student_id: req.studentId,
    student_name: req.studentName,
    type: req.type,
    title: req.title,
    description: req.description,
    ai_summary: req.aiSummary ?? null,
    ai_policy_status: req.aiPolicyStatus ?? null,
    ai_policy_reason: req.aiPolicyReason ?? null,
    document_base64: req.documentBase64 ?? null,
    ai_ocr_verified: req.aiOcrVerified ?? false,
    status: req.status,
    created_at: req.createdAt,
    updated_at: req.updatedAt,
    history: req.history,
  };
}

/** Subset of fields we touch when persisting a transition (approve/reject/forward). */
export type RequestUpdate = Pick<RequestRow, "status" | "updated_at" | "history">;

export function transitionToUpdate(req: Request): RequestUpdate {
  return {
    status: req.status,
    updated_at: req.updatedAt,
    history: req.history,
  };
}

// ===========================================================================
// faculty_users table
// ===========================================================================

/** Row shape expected in the `public.faculty_users` table. */
export interface FacultyUserRow {
  id: string;
  name: string;
  role: Role;
  is_verified: boolean;
  created_at: string;
}

export function facultyRowToUser(row: FacultyUserRow): FacultyUser {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    isVerified: row.is_verified,
    createdAt: row.created_at,
  };
}

export function facultyUserToRow(
  user: Omit<FacultyUser, "id" | "createdAt">,
): Omit<FacultyUserRow, "id" | "created_at"> {
  return {
    name: user.name,
    role: user.role,
    is_verified: user.isVerified,
  };
}
