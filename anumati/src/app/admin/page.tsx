"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Clock, Loader2, ShieldAlert, ShieldCheck, Trash2, UserCheck, Users, XCircle } from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { TopNav } from "@/components/shared/top-nav";
import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/lib/store";
import type { Status } from "@/lib/types";

interface FacultyRow { id: string; name: string; role: string; is_verified: boolean; created_at: string; }

export default function AdminPage() {
  return (
    <ProtectedRoute requiredRole="ADMIN"><TopNav />
      <motion.main initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="flex-1 w-full mx-auto max-w-7xl px-6 py-8 md:px-10">
        <header className="mb-8">
          <h1 className="text-xl md:text-2xl font-bold text-text-primary tracking-tight flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-accent" /> Admin Dashboard</h1>
          <p className="text-sm text-text-secondary mt-1">Verify faculty and monitor system health.</p>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2"><FacultyPanel /></div><div><Stats /></div></div>
      </motion.main>
    </ProtectedRoute>
  );
}

function FacultyPanel() {
  const [faculty, setFaculty] = useState<FacultyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    const { data, error } = await supabase.from("faculty_users").select("*").order("created_at", { ascending: false });
    if (error) toast.error("Load failed.");
    else {
      const seen = new Map<string, FacultyRow>(); const dupes: string[] = [];
      for (const r of (data as FacultyRow[]) ?? []) { const k = `${r.name.toLowerCase().trim()}::${r.role}`; if (!seen.has(k)) seen.set(k, r); else dupes.push(r.id); }
      if (dupes.length) void supabase.from("faculty_users").delete().in("id", dupes);
      setFaculty(Array.from(seen.values()));
    }
    setLoading(false);
  }, []);

  useEffect(() => { void fetch_(); const ch = supabase.channel("admin:f").on("postgres_changes", { event: "*", schema: "public", table: "faculty_users" }, () => void fetch_()).subscribe(); return () => { void supabase.removeChannel(ch); }; }, [fetch_]);

  const verify = async (id: string, v: boolean) => { setBusyId(id); const { error } = await supabase.from("faculty_users").update({ is_verified: v }).eq("id", id); if (error) toast.error("Failed."); else { toast.success(v ? "Verified" : "Revoked"); setFaculty((p) => p.map((f) => f.id === id ? { ...f, is_verified: v } : f)); } setBusyId(null); };
  const del = async (id: string, n: string) => { setBusyId(id); const { error } = await supabase.from("faculty_users").delete().eq("id", id); if (error) toast.error("Failed."); else { toast.success(`Removed ${n}`); setFaculty((p) => p.filter((f) => f.id !== id)); } setBusyId(null); };

  const pending = faculty.filter((f) => !f.is_verified);
  const verified = faculty.filter((f) => f.is_verified);

  return (
    <div className="bg-surface border border-border rounded-[20px] p-5 md:p-6 shadow-[var(--shadow-1)]">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-bold text-text-primary flex items-center gap-2"><Users className="h-4 w-4 text-accent" /> Faculty</h2>
        <span className="text-xs text-text-secondary">{pending.length} pending · {verified.length} verified</span>
      </div>
      {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div> :
       faculty.length === 0 ? <div className="flex flex-col items-center py-12"><Users className="h-10 w-10 text-slate-200" /><p className="text-sm text-text-secondary mt-2">No faculty yet.</p></div> :
       <div className="flex flex-col gap-5">
         {pending.length > 0 && <Section title="Pending" icon={ShieldAlert} color="text-warning" items={pending} busyId={busyId} onVerify={(id) => verify(id, true)} onDelete={del} />}
         {verified.length > 0 && <Section title="Verified" icon={CheckCircle2} color="text-accent" items={verified} busyId={busyId} onRevoke={(id) => verify(id, false)} onDelete={del} />}
       </div>}
    </div>
  );
}

function Section({ title, icon: Icon, color, items, busyId, onVerify, onRevoke, onDelete }: { title: string; icon: React.ComponentType<{ className?: string }>; color: string; items: FacultyRow[]; busyId: string | null; onVerify?: (id: string) => void; onRevoke?: (id: string) => void; onDelete: (id: string, n: string) => void }) {
  const ROLE_CLS: Record<string, string> = { ADVISOR: "bg-warning-light text-warning", HOD: "bg-purple-100 text-purple-600", PRINCIPAL: "bg-accent-light text-accent-hover", ADMIN: "bg-danger-light text-danger" };
  return (
    <section>
      <h3 className={`mb-3 text-[11px] font-bold uppercase tracking-wide ${color} flex items-center gap-1.5`}><Icon className="h-3.5 w-3.5" /> {title} ({items.length})</h3>
      <div className="flex flex-col gap-2">
        <AnimatePresence mode="popLayout" initial={false}>
          {items.map((f) => (
            <motion.div key={f.id} layout initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-text-primary">{f.name.charAt(0).toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{f.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${ROLE_CLS[f.role] ?? "bg-slate-100 text-slate-500"}`}>{f.role}</span>
                  <span className="text-[10px] text-slate-400">{new Date(f.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {onVerify && <button onClick={() => onVerify(f.id)} disabled={busyId === f.id} className="h-8 px-3 rounded-full bg-accent-light text-accent-hover text-xs font-semibold hover:bg-accent hover:text-white transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1">{busyId === f.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3 w-3" />} Verify</button>}
                {onRevoke && <button onClick={() => onRevoke(f.id)} disabled={busyId === f.id} className="h-8 px-3 rounded-full border border-border text-xs text-text-secondary hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1">{busyId === f.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />} Revoke</button>}
                <button onClick={() => onDelete(f.id, f.name)} disabled={busyId === f.id} className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-danger hover:bg-danger-light transition-all active:scale-95 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}

function Stats() {
  const { requests, hydrated } = useAppStore();
  const c: Record<Status | "TOTAL", number> = { DRAFT: 0, PENDING_ADVISOR: 0, PENDING_HOD: 0, PENDING_PRINCIPAL: 0, APPROVED: 0, REJECTED: 0, TOTAL: 0 };
  if (hydrated) for (const r of requests) { c[r.status]++; c.TOTAL++; }
  const stats = [
    { label: "Total", value: c.TOTAL, icon: Users, color: "text-text-primary" },
    { label: "Pending", value: c.PENDING_ADVISOR + c.PENDING_HOD + c.PENDING_PRINCIPAL, icon: Clock, color: "text-warning" },
    { label: "Approved", value: c.APPROVED, icon: CheckCircle2, color: "text-accent" },
    { label: "Rejected", value: c.REJECTED, icon: XCircle, color: "text-danger" },
  ];
  return (
    <div className="bg-surface border border-border rounded-[20px] p-5 md:p-6 shadow-[var(--shadow-1)]">
      <h2 className="text-base font-bold text-text-primary mb-4">System Overview</h2>
      {!hydrated ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div> :
      <div className="flex flex-col gap-3">
        {stats.map((s) => { const I = s.icon; return (
          <div key={s.label} className="flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3">
            <div className="flex items-center gap-2"><I className={`h-4 w-4 ${s.color}`} /><span className="text-sm text-text-secondary">{s.label}</span></div>
            <span className={`text-lg font-bold ${s.color}`}>{s.value}</span>
          </div>
        ); })}
      </div>}
    </div>
  );
}
