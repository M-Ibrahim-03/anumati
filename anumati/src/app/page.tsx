"use client";

/**
 * Root entry point.
 *
 * Routes the visitor to the right role-specific page based on the active
 * mock user. Because the store lives in localStorage + React Context, the
 * role is only known on the client — so we use `router.replace()` after
 * hydration rather than the server-side `redirect()`.
 *
 * Renders a polished loading state while waiting:
 *   1. the store hydrates, and
 *   2. the client-side replace navigates away.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Workflow } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { ROLE_HOME } from "@/lib/role-routes";

export default function RootPage() {
  const router = useRouter();
  const { currentUser, hydrated } = useAppStore();

  useEffect(() => {
    if (!hydrated) return;
    const target = ROLE_HOME[currentUser.role];
    if (target) {
      router.replace(target);
    }
  }, [hydrated, currentUser.role, router]);

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
          <Workflow className="h-8 w-8" />
          <span className="absolute inset-0 animate-ping rounded-2xl bg-blue-500/30" />
        </div>

        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Anumati
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {hydrated
              ? `Loading the ${currentUser.role.toLowerCase()} workspace…`
              : "Restoring your session…"}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>One moment</span>
        </div>
      </div>
    </main>
  );
}
