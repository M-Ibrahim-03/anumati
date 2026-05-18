/**
 * Cookie-backed session helpers.
 *
 * The "session" here is intentionally tiny: just `{ role, name }`. It
 * survives reloads on a single device. Cross-device continuity comes from
 * Supabase storing the shared request data — devices authenticated under
 * the same role/name see the same dashboards.
 *
 * No tokens are stored client-side. RLS on the Supabase side should
 * enforce data access; this cookie is only for picking which UI to show.
 */

import Cookies from "js-cookie";

const ROLE_COOKIE = "anumati_role";
const NAME_COOKIE = "anumati_name";

/** Cookie lifetime in days. 30d feels right for a hackathon prototype. */
const SESSION_DAYS = 30;

export interface Session {
  role: string;
  name: string;
}

const cookieOptions: Cookies.CookieAttributes = {
  expires: SESSION_DAYS,
  sameSite: "lax",
  // `secure` is auto-handled by browsers on https; setting it here would
  // break http://localhost during dev. The cookie is non-sensitive UI
  // routing state, not an auth token.
  path: "/",
};

/** Persist the active role + display name on this device. */
export function setSession(role: string, name: string): void {
  if (typeof document === "undefined") return;
  Cookies.set(ROLE_COOKIE, role, cookieOptions);
  Cookies.set(NAME_COOKIE, name, cookieOptions);
}

/** Read the current session, or null if no cookie is set. */
export function getSession(): Session | null {
  if (typeof document === "undefined") return null;
  const role = Cookies.get(ROLE_COOKIE);
  const name = Cookies.get(NAME_COOKIE);
  if (!role || !name) return null;
  return { role, name };
}

/** Wipe the session cookies. */
export function clearSession(): void {
  if (typeof document === "undefined") return;
  Cookies.remove(ROLE_COOKIE, { path: "/" });
  Cookies.remove(NAME_COOKIE, { path: "/" });
}
