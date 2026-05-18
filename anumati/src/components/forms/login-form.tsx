"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Building2, Crown, GraduationCap, Loader2, ShieldCheck, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { setSession } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/role-routes";
import type { Role } from "@/lib/types";

const ROLES: { role: Role; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { role: "STUDENT", label: "Student", Icon: GraduationCap },
  { role: "ADVISOR", label: "Advisor", Icon: UserCheck },
  { role: "HOD", label: "HOD", Icon: Building2 },
  { role: "PRINCIPAL", label: "Principal", Icon: Crown },
  { role: "ADMIN", label: "Admin", Icon: ShieldCheck },
];

export function LoginForm() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("STUDENT");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2) { toast.error("Enter a valid name."); return; }
    setSubmitting(true);
    try {
      setSession(role, trimmed);
      toast.success(`Welcome, ${trimmed.split(" ")[0]}`);
      router.push(ROLE_HOME[role]);
    } catch { setSubmitting(false); }
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="w-full max-w-md"
    >
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-text-primary tracking-tight">
          Welcome to<br />Anumati
        </h1>
        <p className="mt-2 text-text-secondary text-sm">
          Smart approval workflow for your campus.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        {/* Role */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
            Sign in as
          </label>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((r) => {
              const active = r.role === role;
              const RIcon = r.Icon;
              return (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => setRole(r.role)}
                  disabled={submitting}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-all duration-150 active:scale-95 ${
                    active
                      ? "bg-accent-light text-accent-hover border border-accent/30"
                      : "bg-white text-text-secondary border border-border hover:border-accent/40"
                  }`}
                >
                  <RIcon className="h-3.5 w-3.5" />
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="login-name" className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
            Your name
          </label>
          <input
            id="login-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Aarav Sharma"
            autoComplete="name"
            autoFocus
            disabled={submitting}
            className="h-12 w-full rounded-xl border border-border bg-white px-4 text-sm text-text-primary placeholder:text-slate-400 transition-all focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-white text-sm font-semibold transition-all duration-150 hover:bg-accent-hover active:scale-95 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
            <>Continue as {ROLES.find((r) => r.role === role)?.label}<ArrowRight className="h-4 w-4" /></>
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-[11px] text-slate-400">
        Secure · Real-time · AI-Powered
      </p>
    </motion.div>
  );
}
