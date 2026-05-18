"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CalendarDays, CheckCircle2, Clock, FileText, FolderKanban, Inbox, PartyPopper, XCircle } from "lucide-react";
import { TopNav } from "@/components/shared/top-nav";
import { StudentForm } from "@/components/forms/student-form";
import { ApprovalStepper } from "@/components/workflow/approval-stepper";
import { useAppStore } from "@/lib/store";
import { getSession } from "@/lib/auth";
import type { Request, RequestType, Status } from "@/lib/types";

const TYPE_CLS: Record<RequestType, { label: string; cls: string }> = {
  LEAVE: { label: "Leave", cls: "bg-info-light text-info" },
  EVENT: { label: "Event", cls: "bg-purple-100 text-purple-600" },
  PROJECT: { label: "Project", cls: "bg-warning-light text-warning" },
};
const STATUS_CLS: Record<Status, { label: string; cls: string }> = {
  DRAFT: { label: "Draft", cls: "bg-slate-100 text-slate-500" },
  PENDING_ADVISOR: { label: "Advisor", cls: "bg-warning-light text-warning" },
  PENDING_HOD: { label: "HOD", cls: "bg-warning-light text-warning" },
  PENDING_PRINCIPAL: { label: "Principal", cls: "bg-warning-light text-warning" },
  APPROVED: { label: "Approved", cls: "bg-accent-light text-accent-hover" },
  REJECTED: { label: "Rejected", cls: "bg-danger-light text-danger" },
};

export default function StudentPage() {
  const router = useRouter();
  const { requests, hydrated } = useAppStore();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => { const s = getSession(); if (!s || s.role !== "STUDENT") { router.replace("/"); return; } setName(s.name); }, [router]);

  const mine = useMemo(() => name ? requests.filter((r) => r.studentName === name).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) : [], [requests, name]);
  if (!name) return <><TopNav /><main className="flex-1" /></>;

  const pending = mine.filter((r) => !["APPROVED", "REJECTED"].includes(r.status)).length;
  const approved = mine.filter((r) => r.status === "APPROVED").length;

  return (
    <><TopNav />
      <motion.main initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="flex-1 w-full mx-auto max-w-7xl px-6 py-8 md:px-10">
        <header className="mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-text-primary tracking-tight">Welcome back, {name.split(" ")[0]}</h1>
          <p className="text-sm text-text-secondary">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Stat label="Total" value={mine.length} icon={FileText} />
          <Stat label="Pending" value={pending} icon={Clock} color="text-warning" />
          <Stat label="Approved" value={approved} icon={CheckCircle2} color="text-accent" />
          <Stat label="Rejected" value={mine.length - pending - approved} icon={XCircle} color="text-danger" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <section className="lg:col-span-3 lg:sticky lg:top-20 lg:self-start"><StudentForm /></section>
          <section className="lg:col-span-2 flex flex-col gap-3">
            <h2 className="text-xs font-bold uppercase tracking-wide text-text-secondary">Your Requests</h2>
            {hydrated && mine.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center bg-surface border border-border rounded-[20px]">
                <Inbox className="h-10 w-10 text-slate-300" /><p className="text-sm font-medium text-text-primary">No requests yet</p>
              </div>
            ) : mine.map((r, i) => <motion.div key={r.id} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.04 }}><MiniCard r={r} /></motion.div>)}
          </section>
        </div>
      </motion.main>
    </>
  );
}

function Stat({ label, value, icon: Icon, color = "text-text-primary" }: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; color?: string }) {
  return (
    <div className="bg-surface border border-border rounded-[20px] p-5 shadow-[var(--shadow-1)]">
      <div className="flex items-center justify-between"><span className={`text-2xl font-bold ${color}`}>{value}</span><Icon className="h-5 w-5 text-slate-300" /></div>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">{label}</p>
    </div>
  );
}

function MiniCard({ r }: { r: Request }) {
  const t = TYPE_CLS[r.type]; const s = STATUS_CLS[r.status];
  return (
    <div className="bg-surface border border-border rounded-[20px] p-4 shadow-[var(--shadow-1)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-2)]">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${t.cls}`}>{t.label}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.cls}`}>{s.label}</span>
      </div>
      <h3 className="mt-2 text-sm font-semibold text-text-primary leading-snug">{r.title}</h3>
      {r.aiSummary && <p className="mt-1 text-[11px] text-text-secondary italic truncate">✨ {r.aiSummary}</p>}
      <div className="mt-3"><ApprovalStepper request={r} /></div>
    </div>
  );
}
