"use client";

/**
 * Approval action bar.
 *
 * Shown only when the current user's role matches the role expected by the
 * request's current status. Approve goes straight through; Reject opens a
 * dialog to require a comment. Both paths funnel through `transition()` and
 * persist via the store's `updateRequest`.
 */

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
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
import { transition } from "@/lib/workflow";
import { useAppStore } from "@/lib/store";

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
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const expectedRole = EXPECTED_ROLE_FOR_STATUS[request.status];
  if (!expectedRole || expectedRole !== currentUser.role) {
    return null;
  }

  const isFinalApprover = request.status === "PENDING_PRINCIPAL";

  const handleApprove = () => {
    try {
      const next = transition(request, "APPROVE", currentUser);
      updateRequest(next);
      toast.success(
        isFinalApprover ? "Request approved" : "Approved and forwarded",
        {
          description: isFinalApprover
            ? "Final sign-off recorded."
            : `Now with the ${nextStageLabel(next.status)}.`,
        },
      );
    } catch (err) {
      toast.error("Could not approve", {
        description: err instanceof Error ? err.message : "Unknown error.",
      });
    }
  };

  const handleReject = () => {
    const comment = rejectComment.trim();
    if (!comment) {
      toast.error("A comment is required to reject.");
      return;
    }
    setSubmitting(true);
    try {
      const next = transition(request, "REJECT", currentUser, comment);
      updateRequest(next);
      toast.success("Request rejected", {
        description: "The student has been notified.",
      });
      setRejectOpen(false);
      setRejectComment("");
    } catch (err) {
      toast.error("Could not reject", {
        description: err instanceof Error ? err.message : "Unknown error.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <CardFooter className="flex justify-end gap-2 border-t border-zinc-100 pt-6 dark:border-zinc-800">
        <Button
          variant="outline"
          className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
          onClick={() => setRejectOpen(true)}
        >
          <XCircle className="h-4 w-4" />
          Reject…
        </Button>
        <Button variant="success" onClick={handleApprove}>
          <CheckCircle2 className="h-4 w-4" />
          {isFinalApprover ? "Approve & Sign Off" : "Approve & Forward"}
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
          />

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRejectOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={submitting || rejectComment.trim().length === 0}
            >
              <XCircle className="h-4 w-4" />
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function nextStageLabel(status: Status): string {
  switch (status) {
    case "PENDING_HOD":
      return "Head of Department";
    case "PENDING_PRINCIPAL":
      return "Principal";
    default:
      return "next reviewer";
  }
}
