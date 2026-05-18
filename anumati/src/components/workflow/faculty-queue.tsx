"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronDown, FileCheck, FolderKanban, Inbox, PartyPopper, ShieldAlert, Sparkles } from "lucide-react";
import { ApprovalStepper } from "@/components/workflow/approval-stepper";
import { ApprovalActionBar } from "@/components/workflow/approval-action-bar";
import { useAppStore } from "@/lib/store";
import type { Request, RequestType, Status } from "@/lib/types";

const TYPE_BADGE: Record<RequestType, { label: string; cls: string; Icon: React.ComponentType<{ className?: string }> }> = {
  LEAVE: { label: "Leave", cls: "bg-info-light text-info", Icon: CalendarDays },
  EVENT: { label: "Event", cls: "bg-purple-100 text-purple-600", Icon: PartyPopper },
  PROJECT: { label: "Project", cls: "bg-warning-light text-warning", Icon: FolderKanban },
};

export interface FacultyQueueProps { filterStatus: Status; title: string; description: string; emptyTitle?: string; emptyDescription?: string; }

export function FacultyQueue({ filterStatus, title, description, emptyTitle = "All caught up!", emptyDescription = "No pending requests." }: FacultyQueueProps) {
  const { requests, currentUser, hydrated } = useAppStore();
  const queue = requests.filter((r) => r.status === filterStatus).slice().sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));

  return (
    <motion.main initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="flex-1 w-full mx-auto max-w-7xl px-6 py-8 md:px-10">
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-xl md:text-2xl font-bold text-text-primary tracking-tight">{title}</h1>
          {hydrated && queue.length > 0 && <span className="rounded-full bg-accent-light text-accent-hover px-2.5 py-0.5 text-xs font-bold">{queue.length}</span>}
        </div>
        <p className="text-sm text-text-secondary mt-1">{description}</p>
        <p className="text-xs text-slate-400 mt-0.5">Reviewing as <span className="font-medium text-text-secondary">{currentUser.name}</span> · {currentUser.role}</p>
      </header>

      {hydrated && queue.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100"><Inbox className="h-8 w-8 text-slate-400" /></div>
          <p className="text-base font-semibold text-text-primary">{emptyTitle}</p>
          <p className="text-sm text-text-secondary max-w-sm">{emptyDescription}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          <AnimatePresence mode="popLayout" initial={false}>
            {queue.map((r, i) => (
              <motion.div key={r.id} layout initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0, scale: 0.95, y: -10 }} transition={{ type: "spring", stiffness: 300, damping: 30, delay: i * 0.04 }}>
                <QueueCard request={r} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.main>
  );
}

function QueueCard({ request }: { request: Request }) {
  const { currentUser } = useAppStore();
  const t = TYPE_BADGE[request.type];
  const TIcon = t.Icon;

  return (
    <div className="flex flex-col bg-surface border border-border rounded-[20px] p-5 shadow-[var(--shadow-1)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-2)]">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${t.cls}`}><TIcon className="h-3 w-3" />{t.label}</span>
        <span className="ml-auto text-[11px] text-slate-400">{timeAgo(request.updatedAt)}</span>
      </div>
      <p className="mt-2 text-xs text-text-secondary">from <span className="font-medium text-text-primary">{request.studentName}</span></p>
      <h3 className="mt-1 text-sm font-semibold text-text-primary leading-snug">{request.title}</h3>

      {request.aiSummary && (
        <div className="mt-3 rounded-xl bg-accent-light/50 border border-accent/20 p-3">
          <div className="flex items-center gap-1 mb-1"><Sparkles className="h-3 w-3 text-accent" /><span className="text-[10px] font-bold uppercase tracking-wide text-accent">AI Summary</span></div>
          <p className="text-xs text-text-secondary italic">{request.aiSummary}</p>
        </div>
      )}

      {request.aiPolicyStatus === "WARNING" && (
        <div className="mt-3 rounded-xl bg-warning-light border border-warning/30 p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" /><p className="text-xs text-amber-700">{request.aiPolicyReason ?? "Policy concern."}</p>
        </div>
      )}
      {request.aiPolicyStatus === "FLAGGED" && (
        <div className="mt-3 rounded-xl bg-danger-light border border-danger/30 p-3 flex items-start gap-2">
          <ShieldAlert className="h-4 w-4 text-danger shrink-0 mt-0.5" /><p className="text-xs text-red-700">{request.aiPolicyReason ?? "Policy violation."}</p>
        </div>
      )}
      {request.aiPolicyStatus === "APPROVED" && (
        <div className="mt-2 flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-accent" /><span className="text-[11px] font-medium text-accent">Policy Cleared</span></div>
      )}
      {request.documentBase64 && (
        <div className="mt-2 flex items-center gap-1.5">
          <FileCheck className={`h-3.5 w-3.5 ${request.aiOcrVerified ? "text-accent" : "text-danger"}`} />
          <span className={`text-[11px] font-medium ${request.aiOcrVerified ? "text-accent" : "text-danger"}`}>{request.aiOcrVerified ? "Document Verified" : "OCR Mismatch"}</span>
        </div>
      )}

      <details className="group mt-4 rounded-xl border border-border bg-slate-50">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs font-medium text-text-secondary hover:text-text-primary">
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" /> Full request
        </summary>
        <p className="whitespace-pre-wrap px-3 pb-3 pt-1 text-xs leading-relaxed text-text-secondary">{request.description}</p>
      </details>

      <div className="mt-4"><ApprovalStepper request={request} /></div>
      <ApprovalActionBar request={request} currentUser={currentUser} />
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
