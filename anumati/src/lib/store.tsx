"use client";

/**
 * Anumati app store.
 *
 * React Context backed by Supabase. On mount the provider fetches all
 * requests from the `requests` table and subscribes to Postgres realtime
 * changes (INSERT / UPDATE). Local state is kept in sync so the UI
 * updates instantly across devices without manual refresh.
 *
 * The `currentUser` is derived from the cookie session (`lib/auth.ts`).
 * If no session exists, a fallback guest user is used (pages should
 * redirect to `/` via the ProtectedRoute wrapper before this matters).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Request, Role, User } from "./types";
import { getSession } from "./auth";
import { supabase } from "./supabase";
import { rowToRequest, type RequestRow } from "./supabase-mappers";

// ---------------------------------------------------------------------------
// Derive currentUser from the cookie session.
// ---------------------------------------------------------------------------

function userFromSession(): User {
  const session = getSession();
  if (!session) {
    return { id: "guest", name: "Guest", role: "STUDENT" };
  }
  const id = `user_${session.role.toLowerCase()}_${session.name.toLowerCase().replace(/\s+/g, "_")}`;
  return { id, name: session.name, role: session.role as Role };
}

// ---------------------------------------------------------------------------
// Context shape.
// ---------------------------------------------------------------------------

export interface AppStore {
  /** True after the initial fetch from Supabase has completed. */
  hydrated: boolean;
  currentUser: User;
  requests: Request[];
  /** Fetch all requests from Supabase. Called automatically on mount. */
  fetchRequests: () => Promise<void>;
  /** Subscribe to realtime INSERT/UPDATE on the requests table. */
  setupRealtime: () => void;
  addRequest: (request: Request) => void;
  updateRequest: (updated: Request) => void;
}

const AppStoreContext = createContext<AppStore | null>(null);

// ---------------------------------------------------------------------------
// Provider.
// ---------------------------------------------------------------------------

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User>(userFromSession);
  const [requests, setRequests] = useState<Request[]>([]);
  const realtimeSetUp = useRef(false);

  // Re-derive currentUser when the component mounts (cookies are client-only).
  useEffect(() => {
    setCurrentUser(userFromSession());
  }, []);

  // ------ fetchRequests ----------------------------------------------------

  const fetchRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("requests")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("[anumati] fetchRequests failed:", error.message);
        return;
      }

      if (data) {
        setRequests((data as RequestRow[]).map(rowToRequest));
      }
    } catch (err) {
      console.error("[anumati] fetchRequests exception:", err);
    } finally {
      setHydrated(true);
    }
  }, []);

  // ------ setupRealtime ----------------------------------------------------

  const setupRealtime = useCallback(() => {
    if (realtimeSetUp.current) return;
    realtimeSetUp.current = true;

    supabase
      .channel("public:requests")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "requests" },
        (payload) => {
          const row = payload.new as RequestRow;
          const req = rowToRequest(row);
          setRequests((prev) => {
            // Avoid duplicates (the local addRequest may have already added it).
            if (prev.some((r) => r.id === req.id)) return prev;
            return [req, ...prev];
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "requests" },
        (payload) => {
          const row = payload.new as RequestRow;
          const req = rowToRequest(row);
          setRequests((prev) =>
            prev.map((r) => (r.id === req.id ? req : r)),
          );
        },
      )
      .subscribe();
  }, []);

  // Auto-fetch + auto-subscribe on mount.
  useEffect(() => {
    void fetchRequests();
    setupRealtime();
  }, [fetchRequests, setupRealtime]);

  // ------ Local mutations (optimistic, before Supabase confirms) -----------

  const addRequest = useCallback((request: Request) => {
    setRequests((prev) => {
      if (prev.some((r) => r.id === request.id)) return prev;
      return [request, ...prev];
    });
  }, []);

  const updateRequest = useCallback((updated: Request) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === updated.id ? updated : r)),
    );
  }, []);

  // ------ Memoised value ---------------------------------------------------

  const value = useMemo<AppStore>(
    () => ({
      hydrated,
      currentUser,
      requests,
      fetchRequests,
      setupRealtime,
      addRequest,
      updateRequest,
    }),
    [hydrated, currentUser, requests, fetchRequests, setupRealtime, addRequest, updateRequest],
  );

  return (
    <AppStoreContext.Provider value={value}>
      {children}
    </AppStoreContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook.
// ---------------------------------------------------------------------------

export function useAppStore(): AppStore {
  const ctx = useContext(AppStoreContext);
  if (!ctx) {
    throw new Error("useAppStore must be used within <AppStoreProvider>.");
  }
  return ctx;
}
