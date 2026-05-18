/**
 * Mappers between our domain `Request` shape (camelCase) and the
 * Postgres row shape (snake_case JSONB-friendly).
 *
 * Keep this in one place so the store, the action bar, and any future
 * server-side code never disagree on column names.
 */

import type { ApprovalEvent, Request, RequestType, Status } from "./types";

/** Row shape expected in the `public.requests` table. */
export interface RequestRow {
  id: string;
  student_id: string;
  student_name: string;
  type: RequestType;
  title: string;
  description: string;
  ai_summary: string | null;
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
    status: req.status,
    created_at: req.createdAt,
    updated_at: req.updatedAt,
    history: req.history,
  };
}

/** Subset of fields we touch when persisting a transition. */
export type RequestUpdate = Pick<RequestRow, "status" | "updated_at" | "history">;

export function transitionToUpdate(req: Request): RequestUpdate {
  return {
    status: req.status,
    updated_at: req.updatedAt,
    history: req.history,
  };
}
