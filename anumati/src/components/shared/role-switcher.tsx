"use client";

/**
 * Floating role switcher.
 *
 * Lives at the bottom-right of every screen so a hackathon judge can
 * jump between Student / Advisor / HOD / Principal in one click without
 * any login flow. Uses Tailwind glassmorphism and animates active pill.
 * On switch, it also navigates to that role's home page so the judge
 * sees the right view immediately.
 */

import { useRouter } from "next/navigation";
import { GraduationCap, UserCheck, Building2, Crown } from "lucide-react";
import type { Role } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { ROLE_HOME } from "@/lib/role-routes";
import { cn } from "@/lib/utils";

interface RoleOption {
  role: Role;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const ROLES: RoleOption[] = [
  { role: "STUDENT", label: "Student", Icon: GraduationCap },
  { role: "ADVISOR", label: "Advisor", Icon: UserCheck },
  { role: "HOD", label: "HOD", Icon: Building2 },
  { role: "PRINCIPAL", label: "Principal", Icon: Crown },
];

export function RoleSwitcher() {
  const router = useRouter();
  const { currentUser, switchRole, hydrated } = useAppStore();

  // Avoid SSR/hydration mismatch — only render after store has hydrated.
  if (!hydrated) return null;

  const handleSwitch = (role: Role) => {
    if (role === currentUser.role) return;
    switchRole(role);
    router.push(ROLE_HOME[role]);
  };

  return (
    <div
      className="fixed bottom-4 right-4 z-60 select-none"
      role="toolbar"
      aria-label="Switch role"
    >
      <div className="flex items-center gap-1 rounded-full border border-white/30 bg-white/60 p-1 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/60">
        <span className="px-3 text-xs font-medium tracking-wide text-zinc-600 dark:text-zinc-300">
          Demo as
        </span>
        {ROLES.map(({ role, label, Icon }) => {
          const active = currentUser.role === role;
          return (
            <button
              key={role}
              type="button"
              onClick={() => handleSwitch(role)}
              aria-pressed={active}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                active
                  ? "bg-zinc-900 text-white shadow-md dark:bg-white dark:text-zinc-900"
                  : "text-zinc-700 hover:bg-white/70 dark:text-zinc-300 dark:hover:bg-white/10",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-right text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        Signed in as {currentUser.name}
      </p>
    </div>
  );
}
