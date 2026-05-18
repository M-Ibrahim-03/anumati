/**
 * Supabase client.
 *
 * A single browser-safe client instance backed by the public anon key.
 * Both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
 * must be defined in `.env.local` (inside the ANUMATI/ project root —
 * Next.js won't pick up env files from a parent directory).
 *
 * For server-side use cases that need elevated privileges, create a
 * separate server-only client with the service-role key. Don't import
 * this module from a Route Handler that needs to bypass RLS.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Throw early so missing config is obvious instead of failing on first query.
  throw new Error(
    "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and " +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY in ANUMATI/.env.local",
  );
}

export const supabase: SupabaseClient = createClient(url, anonKey, {
  auth: {
    // We're handling the session cookie ourselves via `lib/auth.ts`, so
    // disable Supabase's own auth state machine to avoid duplication.
    persistSession: false,
    autoRefreshToken: false,
  },
});
