"use client";

/**
 * Protected route wrapper.
 *
 * Reads the user's role from the cookie session. If no session exists,
 * redirects to `/` (login). If the user's role doesn't match the page's
 * required role, redirects them to their own home page (e.g. an Advisor
 * hitting `/hod` gets sent to `/advisor`).
 *
 * Renders nothing until the auth check completes so there's no flash of
 * unauthorized content.
 */

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/role-routes";
import type { Role } from "@/lib/types";

export interface ProtectedRouteProps {
  /** The role required to view this page. */
  requiredRole: Role;
  children: ReactNode;
}

export function ProtectedRoute({ requiredRole, children }: ProtectedRouteProps) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const session = getSession();

    // No session → login.
    if (!session) {
      router.replace("/");
      return;
    }

    // Wrong role → their own home.
    if (session.role !== requiredRole) {
      const home = ROLE_HOME[session.role as Role] ?? "/";
      router.replace(home);
      return;
    }

    setAuthorized(true);
  }, [requiredRole, router]);

  if (!authorized) {
    // Render an empty shell while the redirect fires.
    return null;
  }

  return <>{children}</>;
}
