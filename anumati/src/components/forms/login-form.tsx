"use client";

/**
 * Login form — rendered client-only (via dynamic import with ssr:false)
 * to avoid hydration mismatches caused by browser extensions that inject
 * attributes like `fdprocessedid` into form elements.
 */

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Crown,
  GraduationCap,
  Loader2,
  LogIn,
  UserCheck,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setSession } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/role-routes";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

interface RoleOption {
  role: Role;
  label: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    role: "STUDENT",
    label: "Student",
    description: "Submit and track requests",
    Icon: GraduationCap,
  },
  {
    role: "ADVISOR",
    label: "Advisor",
    description: "First-level review",
    Icon: UserCheck,
  },
  {
    role: "HOD",
    label: "HOD",
    description: "Department-level review",
    Icon: Building2,
  },
  {
    role: "PRINCIPAL",
    label: "Principal",
    description: "Final sign-off",
    Icon: Crown,
  },
];

export function LoginForm() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("STUDENT");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Please enter your name to continue.");
      return;
    }
    if (trimmed.length < 2) {
      toast.error("That name looks a bit short.");
      return;
    }

    setSubmitting(true);
    try {
      setSession(role, trimmed);
      toast.success(`Welcome, ${trimmed.split(" ")[0]}`, {
        description: `Heading to your ${role.toLowerCase()} workspace.`,
      });
      router.push(ROLE_HOME[role]);
    } catch (err) {
      toast.error("Could not sign you in", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
          <Workflow className="h-7 w-7" />
        </div>
        <CardTitle className="text-2xl">Welcome to Anumati</CardTitle>
        <CardDescription className="max-w-xs">
          Sign in to track and review campus approval requests across your
          chain of command.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
          {/* Role picker */}
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              I am signing in as
            </legend>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {ROLE_OPTIONS.map((option) => {
                const active = option.role === role;
                const OptionIcon = option.Icon;
                return (
                  <button
                    key={option.role}
                    type="button"
                    onClick={() => setRole(option.role)}
                    aria-pressed={active}
                    disabled={submitting}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                      active
                        ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:border-blue-500 dark:bg-blue-950/30"
                        : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-md",
                        active
                          ? "bg-blue-500 text-white"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
                      )}
                    >
                      <OptionIcon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {option.label}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Name */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Your name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aarav Sharma"
              autoComplete="name"
              autoFocus
              disabled={submitting}
              aria-invalid={!name.trim() && submitting}
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Used to sign your decisions and label your requests in the
              audit trail.
            </p>
          </div>

          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Continue as {ROLE_OPTIONS.find((o) => o.role === role)?.label}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
