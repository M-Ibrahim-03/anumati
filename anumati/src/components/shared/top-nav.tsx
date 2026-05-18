"use client";

/**
 * Top navigation bar.
 *
 * Reads the cookie-backed session via `getSession()` and shows the
 * signed-in user's name + role on the right. The Logout button clears
 * the session cookies and pushes back to `/`.
 *
 * Renders a placeholder until mounted to avoid hydration mismatches
 * (cookies are only readable on the client).
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Crown,
  GraduationCap,
  LogOut,
  UserCheck,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearSession, getSession, type Session } from "@/lib/auth";
import { cn } from "@/lib/utils";

const ROLE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  STUDENT: GraduationCap,
  ADVISOR: UserCheck,
  HOD: Building2,
  PRINCIPAL: Crown,
};

function prettyRole(role: string): string {
  if (role === "HOD") return "HOD";
  return role.charAt(0) + role.slice(1).toLowerCase();
}

export function TopNav() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setSession(getSession());
    setMounted(true);
  }, []);

  const handleLogout = () => {
    clearSession();
    router.push("/");
    router.refresh();
  };

  const RoleIcon = session ? ROLE_ICON[session.role] ?? GraduationCap : null;

  return (
    <header className="sticky top-0 z-30 w-full border-b border-zinc-200/70 bg-white/80 backdrop-blur-md dark:border-zinc-800/70 dark:bg-zinc-950/70">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
            <Workflow className="h-4 w-4" />
          </span>
          <span className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Anumati
          </span>
        </div>

        {/* Session block — only after mount to avoid hydration mismatch. */}
        {mounted && session ? (
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm",
                "dark:border-zinc-800 dark:bg-zinc-900",
              )}
            >
              {RoleIcon && <RoleIcon className="h-4 w-4 text-zinc-500" />}
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                {session.name}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {prettyRole(session.role)}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        ) : (
          <div className="h-8 w-40" aria-hidden />
        )}
      </div>
    </header>
  );
}
