"use client";

import { Check, Clock, X } from "lucide-react";
import type { Request, Status } from "@/lib/types";

const STAGES = [
  { key: "ADVISOR", label: "Advisor", pendingStatus: "PENDING_ADVISOR" as Status },
  { key: "HOD", label: "HOD", pendingStatus: "PENDING_HOD" as Status },
  { key: "PRINCIPAL", label: "Principal", pendingStatus: "PENDING_PRINCIPAL" as Status },
  { key: "DONE", label: "Done", pendingStatus: "APPROVED" as Status },
];

function statusToIndex(s: Status): number {
  switch (s) { case "DRAFT": case "PENDING_ADVISOR": return 0; case "PENDING_HOD": return 1; case "PENDING_PRINCIPAL": return 2; case "APPROVED": return 3; default: return -1; }
}

function rejectedAt(history: { actorRole: string; action: string }[]): number {
  const e = [...history].reverse().find((h) => h.action === "REJECTED");
  if (!e) return 0;
  return e.actorRole === "HOD" ? 1 : e.actorRole === "PRINCIPAL" ? 2 : 0;
}

type S = "done" | "current" | "future" | "rejected";
function state(i: number, status: Status, rIdx: number): S {
  if (status === "REJECTED") { if (i < rIdx) return "done"; if (i === rIdx) return "rejected"; return "future"; }
  if (status === "APPROVED") return "done";
  const a = statusToIndex(status); if (i < a) return "done"; if (i === a) return "current"; return "future";
}

export function ApprovalStepper({ request }: { request: Request }) {
  const rIdx = request.status === "REJECTED" ? rejectedAt(request.history) : -1;
  return (
    <div className="flex items-center gap-1">
      {STAGES.map((stage, i) => {
        const s = state(i, request.status, rIdx);
        const last = i === STAGES.length - 1;
        return (
          <div key={stage.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-0.5">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                s === "done" ? "bg-accent text-white" :
                s === "current" ? "bg-accent-light text-accent border-2 border-accent" :
                s === "rejected" ? "bg-danger text-white" :
                "bg-slate-100 text-slate-400 border border-border"
              }`}>
                {s === "done" ? <Check className="h-3 w-3" /> : s === "rejected" ? <X className="h-3 w-3" /> : s === "current" ? <Clock className="h-3 w-3" /> : i + 1}
              </div>
              <span className={`text-[9px] font-medium ${s === "done" ? "text-accent" : s === "current" ? "text-accent" : s === "rejected" ? "text-danger" : "text-slate-400"}`}>{stage.label}</span>
            </div>
            {!last && <div className={`h-[2px] flex-1 mx-1 rounded-full ${s === "done" ? "bg-accent" : s === "rejected" ? "bg-danger/30" : "bg-slate-200"}`} />}
          </div>
        );
      })}
    </div>
  );
}
