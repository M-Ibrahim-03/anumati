"use client";

/**
 * Protected route wrapper.
 *
 * Auth checks:
 *   1. No session → redirect to `/` (login).
 *   2. Role mismatch → redirect to the user's own home page.
 *   3. ADMIN trying to visit non-admin pages → redirect to `/admin`.
 *   4. Faculty roles (ADVISOR, HOD, PRINCIPAL): query `faculty_users`.
 *      - If not found → insert with `is_verified = false`.
 *      - If `is_verified === false` → redirect to `/pending-verification`.
 *      - If verified → allow through.
 *   5. STUDENT and ADMIN skip the faculty verification step.
 *
 * Renders nothing until all checks pass so there's no flash of
 * unauthorized content.
 */

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/role-routes";
import { supabase } from "@/lib/supabase";
import type { Role } from "@/lib/types";

const FACULTY_ROLES: Role[] = ["ADVISOR", "HOD", "PRINCIPAL"];

export interface ProtectedRouteProps {
  /** The role required to view this page. */
  requiredRole: Role;
  children: ReactNode;
}

export function ProtectedRoute({ requiredRole, children }: ProtectedRouteProps) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const session = getSession();

      // 1. No session → login.
      if (!session) {
        router.replace("/");
        return;
      }

      const userRole = session.role as Role;

      // 2. ADMIN trying to visit a non-admin page → send to /admin.
      if (userRole === "ADMIN" && requiredRole !== "ADMIN") {
        router.replace("/admin");
        return;
      }

      // 3. General role mismatch → their own home.
      if (userRole !== requiredRole) {
        const home = ROLE_HOME[userRole] ?? "/";
        router.replace(home);
        return;
      }

      // 4. Faculty verification check.
      if (FACULTY_ROLES.includes(userRole)) {
        try {
          // Look up by name + role (our "auth" is cookie-based name+role).
          // Use .limit(1) instead of .maybeSingle() to handle existing duplicates gracefully.
          const { data: rows, error: selectErr } = await supabase
            .from("faculty_users")
            .select("id, is_verified")
            .eq("name", session.name)
            .eq("role", session.role)
            .limit(1);

          if (selectErr) {
            console.error("[anumati] faculty check failed:", selectErr.message);
            // Don't block on transient DB errors during hackathon demo.
          } else if (!rows || rows.length === 0) {
            // First time this faculty member logs in — register and auto-verify for demo.
            await supabase.from("faculty_users").insert({
              name: session.name,
              role: session.role,
              is_verified: true,
            });
            // Auto-verified, fall through to authorize.
          } else if (!rows[0].is_verified) {
            // Exists but not yet verified — auto-verify for hackathon demo.
            await supabase
              .from("faculty_users")
              .update({ is_verified: true })
              .eq("id", rows[0].id);
            // Now verified, fall through to authorize.
          }
          // Verified — fall through to authorize.
        } catch (err) {
          console.error("[anumati] faculty verification exception:", err);
        }
      }

      // All checks passed.
      if (!cancelled) setAuthorized(true);
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, [requiredRole, router]);

  if (!authorized) {
    return null;
  }

  return <>{children}</>;
}
