"use client";

/**
 * Anumati app store.
 *
 * A tiny React Context wrapped around localStorage. This is intentionally
 * lightweight — no Redux, no Zustand — per the steering rules. All state
 * mutations flow through actions exposed by `useAppStore()`.
 *
 * Persistence:
 *   - `anumati:requests`     -> Request[]
 *   - `anumati:currentUserId` -> string  (id of the active mock user)
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Request, Role, User } from "./types";
import { mockRequests, mockUsers } from "./mock";

// ---------------------------------------------------------------------------
// Storage keys + safe localStorage helpers (SSR-safe).
// ---------------------------------------------------------------------------

const LS_REQUESTS = "anumati:requests";
const LS_CURRENT_USER = "anumati:currentUserId";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function lsGet<T>(key: string): T | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function lsSet<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or serialization errors are non-fatal in v1 */
  }
}

// ---------------------------------------------------------------------------
// Default user for first-time visitors: the seed Student.
// ---------------------------------------------------------------------------

const DEFAULT_USER: User =
  mockUsers.find((u: User) => u.role === "STUDENT") ?? mockUsers[0];

// ---------------------------------------------------------------------------
// Context shape.
// ---------------------------------------------------------------------------

export interface AppStore {
  /** True after the first effect has hydrated state from localStorage. */
  hydrated: boolean;
  currentUser: User;
  requests: Request[];
  switchRole: (role: Role) => void;
  addRequest: (request: Request) => void;
  updateRequest: (updated: Request) => void;
}

const AppStoreContext = createContext<AppStore | null>(null);

// ---------------------------------------------------------------------------
// Provider.
// ---------------------------------------------------------------------------

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User>(DEFAULT_USER);
  const [requests, setRequests] = useState<Request[]>(mockRequests);

  // Hydrate from localStorage on mount. Seed defaults if empty.
  useEffect(() => {
    const storedRequests = lsGet<Request[]>(LS_REQUESTS);
    if (storedRequests && Array.isArray(storedRequests)) {
      setRequests(storedRequests);
    } else {
      lsSet(LS_REQUESTS, mockRequests);
    }

    const storedUserId = lsGet<string>(LS_CURRENT_USER);
    if (storedUserId) {
      const found = mockUsers.find((u: User) => u.id === storedUserId);
      if (found) setCurrentUser(found);
    } else {
      lsSet(LS_CURRENT_USER, DEFAULT_USER.id);
    }

    setHydrated(true);
  }, []);

  // Persist requests on every change (after hydration).
  useEffect(() => {
    if (!hydrated) return;
    lsSet(LS_REQUESTS, requests);
  }, [hydrated, requests]);

  // Persist active user id on every change (after hydration).
  useEffect(() => {
    if (!hydrated) return;
    lsSet(LS_CURRENT_USER, currentUser.id);
  }, [hydrated, currentUser]);

  const switchRole = useCallback((role: Role) => {
    const next = mockUsers.find((u: User) => u.role === role);
    if (!next) {
      // eslint-disable-next-line no-console
      console.warn(`[anumati] no mock user for role "${role}"`);
      return;
    }
    setCurrentUser(next);
  }, []);

  const addRequest = useCallback((request: Request) => {
    setRequests((prev) => [request, ...prev]);
  }, []);

  const updateRequest = useCallback((updated: Request) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === updated.id ? updated : r)),
    );
  }, []);

  const value = useMemo<AppStore>(
    () => ({
      hydrated,
      currentUser,
      requests,
      switchRole,
      addRequest,
      updateRequest,
    }),
    [hydrated, currentUser, requests, switchRole, addRequest, updateRequest],
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
