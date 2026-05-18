"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { clearSession, getSession, type Session } from "@/lib/auth";

const ROLE_BADGE: Record<string, string> = {
  STUDENT: "bg-info-light text-info",
  ADVISOR: "bg-warning-light text-warning",
  HOD: "bg-purple-100 text-purple-600",
  PRINCIPAL: "bg-accent-light text-accent-hover",
  ADMIN: "bg-danger-light text-danger",
};

export function TopNav() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setSession(getSession()); setMounted(true); }, []);

  const handleLogout = () => { clearSession(); router.push("/"); router.refresh(); };

  return (
    <header className="sticky top-0 z-30 w-full h-16 bg-surface border-b border-border">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6 md:px-10">
        <span className="text-lg font-bold text-accent tracking-tight">Anumati</span>

        {mounted && session ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                {session.name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline text-sm font-medium text-text-primary">{session.name}</span>
              <span className={`hidden sm:inline rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_BADGE[session.role] ?? ""}`}>
                {session.role === "HOD" ? "HOD" : session.role.charAt(0) + session.role.slice(1).toLowerCase()}
              </span>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-text-secondary hover:text-danger hover:bg-danger-light transition-all duration-150 active:scale-95">
              <LogOut className="h-3.5 w-3.5" /><span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        ) : <div className="h-8 w-32" />}
      </div>
    </header>
  );
}
