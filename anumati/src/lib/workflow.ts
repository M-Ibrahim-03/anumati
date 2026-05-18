/**
 * Anumati workflow state machine.
 *
 * This module is the ONLY place allowed to mutate `Request.status` or push
 * to `Request.history`. UI components must call `transition(...)` and then
 * persist the returned request through the store.
 *
 * Approval pipeline:
 *   DRAFT -> PENDING_ADVISOR -> PENDING_HOD -> PENDING_PRINCIPAL -> APPROVED
 * Any actor in the queue may instead REJECT, terminating the request.
 */

import type {
  ApprovalAction,
  ApprovalEvent,
  Request,
  Role,
  Status,
  User,
} from "./types";

export type TransitionAction = "APPROVE" | "REJECT";

/**
 * Maps the role currently expected to act on a given status.
 * If a status has no expected actor (terminal states, drafts), the value is null.
 */
const EXPECTED_ACTOR: Record<Status, Role | null> = {
  DRAFT: null,
  PENDING_ADVISOR: "ADVISOR",
  PENDING_HOD: "HOD",
  PENDING_PRINCIPAL: "PRINCIPAL",
  APPROVED: null,
  REJECTED: null,
};

/**
 * Next status when the expected actor approves.
 */
const NEXT_STATUS_ON_APPROVE: Partial<Record<Status, Status>> = {
  PENDING_ADVISOR: "PENDING_HOD",
  PENDING_HOD: "PENDING_PRINCIPAL",
  PENDING_PRINCIPAL: "APPROVED",
};

/**
 * Lightweight id generator. Uses crypto.randomUUID where available,
 * falls back to a timestamp+random string for older runtimes.
 */
function newEventId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Apply an approve/reject action to a request.
 *
 * - Throws if the request is in a terminal state (APPROVED/REJECTED) or DRAFT.
 * - Throws if the actor's role does not match the role currently expected
 *   (e.g. an ADVISOR trying to act on PENDING_HOD).
 * - Returns a NEW request object (does not mutate the input).
 */
export function transition(
  request: Request,
  action: TransitionAction,
  actor: User,
  comment?: string,
): Request {
  const expectedRole = EXPECTED_ACTOR[request.status];

  if (expectedRole === null) {
    throw new Error(
      `Cannot ${action.toLowerCase()} request ${request.id}: status "${request.status}" is not actionable.`,
    );
  }

  if (actor.role !== expectedRole) {
    throw new Error(
      `Role mismatch: ${actor.role} cannot act on a request awaiting ${expectedRole} (status="${request.status}").`,
    );
  }

  let nextStatus: Status;
  let eventAction: ApprovalAction;

  if (action === "REJECT") {
    nextStatus = "REJECTED";
    eventAction = "REJECTED";
  } else if (action === "APPROVE") {
    const target = NEXT_STATUS_ON_APPROVE[request.status];
    if (!target) {
      // Defensive: should be unreachable because EXPECTED_ACTOR already guarded.
      throw new Error(
        `No approve transition defined for status "${request.status}".`,
      );
    }
    nextStatus = target;
    // PRINCIPAL approving the final step is final approval, others escalate.
    eventAction = nextStatus === "APPROVED" ? "APPROVED" : "ESCALATED";
  } else {
    // Exhaustiveness guard for future actions.
    const _exhaustive: never = action;
    throw new Error(`Unsupported action: ${String(_exhaustive)}`);
  }

  const now = new Date().toISOString();

  const event: ApprovalEvent = {
    id: newEventId(),
    timestamp: now,
    actorId: actor.id,
    actorRole: actor.role,
    action: eventAction,
    ...(comment ? { comment } : {}),
  };

  return {
    ...request,
    status: nextStatus,
    updatedAt: now,
    history: [...request.history, event],
  };
}
