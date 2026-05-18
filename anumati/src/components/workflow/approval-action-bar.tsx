"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { Request, Role, Status, User } from "@/lib/types";
import { transition, type TransitionAction } from "@/lib/workflow";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { transitionToUpdate } from "@/lib/supabase-mappers";

const EXPECTED: Partial<Record<Status, Role>> = { PENDING_ADVISOR: "ADVISOR", PENDING_HOD: "HOD", PENDING_PRINCIPAL: "PRINCIPAL" };

export interface ApprovalActionBarProps { request: Request; currentUser: User; }

export function ApprovalActionBar({ request, currentUser }: ApprovalActionBarProps) {
  const { updateRequest } = useAppStore();
  const [busyAction, setBusyAction] = useState<TransitionAction | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [comment, setComment] = useState("");

  const expected = EXPECTED[request.status];
  if (!expected || expected !== currentUser.role) return null;

  const isAdvisor = currentUser.role === "ADVISOR";
  const isFinal = currentUser.role === "PRINCIPAL";
  const busy = busyAction !== null;

  const apply = async (action: TransitionAction, title: string, desc: string, c?: string) => {
    let next: Request;
    try { next = transition(request, action, currentUser, c); } catch (e) { toast.error("Not allowed", { description: e instanceof Error ? e.message : "" }); return false; }
    setBusyAction(action);
    try { const { error } = await supabase.from("requests").update(transitionToUpdate(next)).eq("id", next.id); if (error) throw error; updateRequest(next); toast.success(title, { description: desc }); return true; }
    catch (e) { toast.error("Failed", { description: e instanceof Error ? e.message : "" }); return false; }
    finally { setBusyAction(null); }
  };

  if (rejectOpen) {
    return (
      <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border">
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Reason for rejection…" rows={3} autoFocus className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-danger focus:ring-2 focus:ring-danger/20 resize-none" />
        <div className="flex gap-2">
          <button onClick={() => setRejectOpen(false)} className="flex-1 h-10 rounded-full border border-border text-sm text-text-secondary hover:bg-slate-50 transition-all active:scale-95">Cancel</button>
          <button onClick={async () => { if (!comment.trim()) { toast.error("Comment required."); return; } const ok = await apply("REJECT", "Rejected", "Student notified.", comment.trim()); if (ok) { setRejectOpen(false); setComment(""); } }} disabled={busy || !comment.trim()} className="flex-1 h-10 rounded-full bg-danger text-white text-sm font-semibold transition-all hover:bg-red-500 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5">
            {busyAction === "REJECT" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Reject
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t border-border">
      <button onClick={() => setRejectOpen(true)} disabled={busy} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-danger/40 text-sm font-medium text-danger hover:bg-danger-light transition-all active:scale-95 disabled:opacity-50">
        <XCircle className="h-4 w-4" /> Reject
      </button>
      {isAdvisor && (
        <button onClick={() => void apply("FORWARD", "Forwarded", "Now with HOD.")} disabled={busy} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-info text-white text-sm font-semibold transition-all hover:bg-blue-600 active:scale-95 disabled:opacity-50">
          {busyAction === "FORWARD" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Forward to HOD
        </button>
      )}
      <button onClick={() => void apply("APPROVE", isAdvisor ? "Approved" : isFinal ? "Signed off" : "Forwarded", isAdvisor ? "Final approval." : isFinal ? "Done." : "Now with Principal.")} disabled={busy} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-accent text-white text-sm font-semibold transition-all hover:bg-accent-hover active:scale-95 disabled:opacity-50">
        {busyAction === "APPROVE" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {isAdvisor ? "Approve Final" : isFinal ? "Sign Off" : "Approve & Forward"}
      </button>
    </div>
  );
}
