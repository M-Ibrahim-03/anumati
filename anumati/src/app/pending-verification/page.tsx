"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Clock } from "lucide-react";
import { clearSession, getSession } from "@/lib/auth";

export default function PendingVerificationPage() {
  const router = useRouter();
  const session = typeof window !== "undefined" ? getSession() : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="w-full max-w-md bg-surface border border-border rounded-[20px] p-8 md:p-10 text-center shadow-[var(--shadow-1)]">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-warning-light">
          <Clock className="h-8 w-8 text-warning" />
        </div>
        <h1 className="text-xl font-bold text-text-primary">Verification Pending</h1>
        <p className="mt-2 text-sm text-text-secondary max-w-xs mx-auto">An admin will verify your account shortly. You'll be able to access your dashboard once approved.</p>
        {session && <p className="mt-4 text-xs text-slate-400">Signed in as <span className="font-medium text-text-secondary">{session.name}</span> · {session.role}</p>}
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button onClick={() => { clearSession(); router.push("/"); }} className="h-10 px-5 rounded-full border border-border text-sm text-text-secondary hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-1.5"><ArrowLeft className="h-4 w-4" /> Back to Login</button>
          <button onClick={() => { if (session) { const m: Record<string, string> = { ADVISOR: "/advisor", HOD: "/hod", PRINCIPAL: "/principal" }; router.push(m[session.role] ?? "/"); } else router.push("/"); }} className="h-10 px-5 rounded-full bg-accent text-white text-sm font-semibold hover:bg-accent-hover transition-all active:scale-95">Check again</button>
        </div>
      </motion.div>
    </div>
  );
}
