"use client";

/**
 * Login Portal.
 *
 * The form is loaded with `dynamic({ ssr: false })` so the server sends
 * a lightweight skeleton instead of the full form HTML. This eliminates
 * hydration mismatches caused by browser extensions (password managers,
 * autofill) that inject attributes like `fdprocessedid` into form
 * elements before React hydrates.
 */

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const LoginForm = dynamic(
  () =>
    import("@/components/forms/login-form").then((mod) => ({
      default: mod.LoginForm,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-96 w-full max-w-md items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    ),
  },
);

export default function LoginPortal() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <LoginForm />
    </main>
  );
}
