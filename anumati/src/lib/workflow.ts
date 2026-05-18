/**
 * Anumati workflow state machine.
 *
 * This module is the ONLY place allowed to mutate `Request.status` or push
 * to `Request.history`. UI components must call `transition(...)` and then
 * persist the returned request through the store.
 *
 * Approval pipeline:
 *   DRAFT
 *     -> PENDING_ADVISOR
 *          (Advisor APPROVE) -> APPROVED   // simple cases like Leave
 *          (Advisor FORWARD) -> PENDING_HOD
 *     -> PENDING_HOD
 *          (HOD APPROVE)     -> PENDING_PRINCIPAL
 *     -> PENDING_PRINCIPAL
 *          (Principal APPROVE) -> APPROVED
 *
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

export type TransitionAction = "APPROVE" | "FORWARD" | "REJECT";

/**
 * Maps the role currently expected to act on a given status.
 * Terminal statuses (APPROVED, REJECTED, DRAFT) have no expected actor.
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
 * Lightweight id generator. Uses crypto.randomUUID where available,
 * falls back to a timestamp+random string for older runtimes.
 */
function newEventId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Compute the next status + audit event-action pair.
 * Centralised so the rules are easy to read and change.
 */
function resolveTransition(
  currentStatus: Status,
  action: TransitionAction,
  actor: User,
): { nextStatus: Status; eventAction: ApprovalAction } {
  if (action === "REJECT") {
    return { nextStatus: "REJECTED", eventAction: "REJECTED" };
  }

  switch (currentStatus) {
    case "PENDING_ADVISOR": {
      if (action === "APPROVE") {
        // Final approval at the Advisor stage — used for simple requests.
        return { nextStatus: "APPROVED", eventAction: "APPROVED" };
      }
      if (action === "FORWARD") {
        return { nextStatus: "PENDING_HOD", eventAction: "FORWARDED" };
      }
      break;
    }
    case "PENDING_HOD": {
      if (action === "APPROVE") {
        // HOD cannot grant final approval; an APPROVE here means escalate.
        return { nextStatus: "PENDING_PRINCIPAL", eventAction: "FORWARDED" };
      }
      if (action === "FORWARD") {
        return { nextStatus: "PENDING_PRINCIPAL", eventAction: "FORWARDED" };
      }
      break;
    }
    case "PENDING_PRINCIPAL": {
      if (action === "APPROVE") {
        return { nextStatus: "APPROVED", eventAction: "APPROVED" };
      }
      // Principal cannot forward — they're the last stop.
      if (action === "FORWARD") {
        throw new Error(
          "Principal cannot forward; this is the final approval stage.",
        );
      }
      break;
    }
    default:
      // Defensive — guarded earlier by EXPECTED_ACTOR.
      throw new Error(
        `No transition defined for status "${currentStatus}".`,
      );
  }

  // Fallthrough (shouldn't happen if all branches above are covered).
  throw new Error(
    `Action "${action}" by ${actor.role} is not valid at status "${currentStatus}".`,
  );
}

/**
 * Apply an action to a request.
 *
 * - Throws if the request is in a terminal state (APPROVED/REJECTED) or DRAFT.
 * - Throws if the actor's role does not match the role currently expected.
 * - Throws if the action is not valid at the current stage.
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

  const { nextStatus, eventAction } = resolveTransition(
    request.status,
    action,
    actor,
  );

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
