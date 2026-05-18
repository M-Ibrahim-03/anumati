"use client";

/**
 * Approval action bar.
 *
 * Renders the role-aware action buttons for whichever request is currently
 * sitting in the actor's queue. The button set depends on the role:
 *
 *   ADVISOR  : [Reject] [Forward to HOD] [Approve Final]
 *   HOD      : [Reject] [Approve & Forward]
 *   PRINCIPAL: [Reject] [Approve & Sign Off]
 *
 * Every action funnels through `transition()` for status math, persists
 * the updated row to Supabase via `requests.update(...)`, then mirrors
 * into the local store so the UI updates immediately (the realtime
 * subscription will reconcile across other devices).
 */

import { useState } from "react";
import { ArrowUpRight, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CardFooter } from "@/components/ui/card";
import type { Request, Role, Status, User } from "@/lib/types";
import { transition, type TransitionAction } from "@/lib/workflow";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { transitionToUpdate } from "@/lib/supabase-mappers";

/** Maps the queue-status → role expected to act on it. Mirrors workflow.ts. */
const EXPECTED_ROLE_FOR_STATUS: Partial<Record<Status, Role>> = {
  PENDING_ADVISOR: "ADVISOR",
  PENDING_HOD: "HOD",
  PENDING_PRINCIPAL: "PRINCIPAL",
};

export interface ApprovalActionBarProps {
  request: Request;
  currentUser: User;
}

export function ApprovalActionBar({ request, currentUser }: ApprovalActionBarProps) {
  const { updateRequest } = useAppStore();

  // Per-button busy state so we can show spinners on the exact action clicked.
  const [busyAction, setBusyAction] = useState<TransitionAction | null>(null);

  // Reject dialog state.
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState("");

  const expectedRole = EXPECTED_ROLE_FOR_STATUS[request.status];
  if (!expectedRole || expectedRole !== currentUser.role) {
    return null;
  }

  const isAdvisor = currentUser.role === "ADVISOR";
  const isFinalApprover = currentUser.role === "PRINCIPAL";

  /**
   * Run a transition end-to-end:
   * 1. Compute the next request via the state machine.
   * 2. Persist via Supabase .update(...).
   * 3. Mirror into the local store so the UI updates instantly.
   */
  const apply = async (
    action: TransitionAction,
    successTitle: string,
    successDescription: string,
    comment?: string,
  ): Promise<boolean> => {
    let next: Request;
    try {
      next = transition(request, action, currentUser, comment);
    } catch (err) {
      toast.error("Action not allowed", {
        description: err instanceof Error ? err.message : "Unknown error.",
      });
      return false;
    }

    setBusyAction(action);
    try {
      const { error } = await supabase
        .from("requests")
        .update(transitionToUpdate(next))
        .eq("id", next.id);

      if (error) throw error;

      updateRequest(next);
      toast.success(successTitle, { description: successDescription });
      return true;
    } catch (err) {
      toast.error("Could not save to the database", {
        description:
          err instanceof Error ? err.message : "Please try again in a moment.",
      });
      return false;
    } finally {
      setBusyAction(null);
    }
  };

  const handleApprove = () => {
    if (isAdvisor) {
      void apply(
        "APPROVE",
        "Request approved",
        "Final approval recorded — the student has been notified.",
      );
      return;
    }
    if (isFinalApprover) {
      void apply(
        "APPROVE",
        "Request approved",
        "Final sign-off recorded.",
      );
      return;
    }
    // HOD: APPROVE escalates to Principal.
    void apply(
      "APPROVE",
      "Approved and forwarded",
      "Now with the Principal for final sign-off.",
    );
  };

  const handleForward = () => {
    void apply(
      "FORWARD",
      "Forwarded to HOD",
      "The HOD will review next.",
    );
  };

  const handleReject = async () => {
    const comment = rejectComment.trim();
    if (!comment) {
      toast.error("A comment is required to reject.");
      return;
    }
    const ok = await apply(
      "REJECT",
      "Request rejected",
      "The student has been notified.",
      comment,
    );
    if (ok) {
      setRejectOpen(false);
      setRejectComment("");
    }
  };

  // --- labels --------------------------------------------------------------

  const approveLabel = isAdvisor
    ? "Approve Final"
    : isFinalApprover
      ? "Approve & Sign Off"
      : "Approve & Forward";

  const anythingBusy = busyAction !== null;

  return (
    <>
      <CardFooter className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 pt-6 dark:border-zinc-800">
        <Button
          variant="outline"
          className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
          onClick={() => setRejectOpen(true)}
          disabled={anythingBusy}
        >
          <XCircle className="h-4 w-4" />
          Reject…
        </Button>

        {isAdvisor && (
          <Button
            onClick={handleForward}
            disabled={anythingBusy}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {busyAction === "FORWARD" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUpRight className="h-4 w-4" />
            )}
            Forward to HOD
          </Button>
        )}

        <Button
          variant="success"
          onClick={handleApprove}
          disabled={anythingBusy}
        >
          {busyAction === "APPROVE" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {approveLabel}
        </Button>
      </CardFooter>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this request</DialogTitle>
            <DialogDescription>
              Share a reason so the student understands what to revise. This will
              be recorded in the audit trail.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            placeholder="Explain why this is being rejected…"
            rows={5}
            autoFocus
            disabled={busyAction === "REJECT"}
          />

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRejectOpen(false)}
              disabled={busyAction === "REJECT"}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={
                busyAction === "REJECT" || rejectComment.trim().length === 0
              }
            >
              {busyAction === "REJECT" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
