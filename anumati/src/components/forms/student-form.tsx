"use client";

/**
 * Student request form (AI-assisted).
 *
 * Workflow:
 *   1. Student types a short, plain-language prompt into the "AI Magic"
 *      input ("Need 2 days for hackathon"). Clicking the ✨ button hits
 *      /api/ai/generate and fills the description with a formal letter.
 *   2. Student picks the request type, types a title, edits the
 *      description if they want to.
 *   3. On submit:
 *        - hit /api/ai/summarize to produce the AI TL;DR
 *        - build a fresh Request object
 *        - INSERT into Supabase `requests`
 *        - mirror into the local store via addRequest() so the right
 *          column updates instantly.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2,
  Send,
  Sparkles,
  Wand2,
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
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/lib/store";
import { generateLetterDetailed } from "@/lib/ai/generate";
import { summarizeTextDetailed } from "@/lib/ai/summarize";
import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { requestToRow } from "@/lib/supabase-mappers";
import type { ApprovalEvent, Request, RequestType } from "@/lib/types";

// ---------------------------------------------------------------------------
// Form schema
// ---------------------------------------------------------------------------

const REQUEST_TYPES: { value: RequestType; label: string; placeholder: string }[] = [
  {
    value: "LEAVE",
    label: "Leave application",
    placeholder:
      "Reason for leave, dates, any backup arrangements for missed classes…",
  },
  {
    value: "EVENT",
    label: "Event approval",
    placeholder:
      "Event name, expected participants, venue, budget, faculty coordinator…",
  },
  {
    value: "PROJECT",
    label: "Project approval",
    placeholder:
      "Project scope, mentor, resources required, timeline, deliverables…",
  },
];

const schema = z.object({
  type: z.enum(["LEAVE", "EVENT", "PROJECT"]),
  title: z
    .string()
    .min(5, "Title should be at least 5 characters.")
    .max(120, "Keep the title under 120 characters."),
  description: z
    .string()
    .min(20, "Add a few more details so reviewers have context.")
    .max(8000, "Description is too long."),
});

type FormValues = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function newId(prefix: string): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return `${prefix}_${g.crypto.randomUUID()}`;
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StudentForm() {
  const router = useRouter();
  const { addRequest } = useAppStore();

  const [studentName, setStudentName] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: "LEAVE", title: "", description: "" },
  });

  const selectedType = watch("type");
  const placeholder =
    REQUEST_TYPES.find((t) => t.value === selectedType)?.placeholder ?? "";

  // Resolve session on mount; redirect to login if not signed in as a student.
  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/");
      return;
    }
    if (session.role !== "STUDENT") {
      toast.error("Sign in as a student to submit requests.");
      router.replace("/");
      return;
    }
    setStudentName(session.name);
    // Stable per-name id so multiple submissions from the same student
    // share a studentId without needing real auth.
    setStudentId(`student_${session.name.toLowerCase().replace(/\s+/g, "_")}`);
  }, [router]);

  // ---- AI Magic: prompt → letter → fill description ----------------------

  const handleGenerate = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt) {
      toast.error("Type a short prompt first", {
        description: 'Something like "Need 2 days for hackathon" works great.',
      });
      return;
    }
    setGenerating(true);
    const tid = toast.loading("Drafting your letter…", {
      description: "Asking the AI to expand your prompt.",
    });
    try {
      const { letter, ai } = await generateLetterDetailed(prompt);
      if (!letter) {
        toast.error("Could not draft a letter", {
          id: tid,
          description: "Please try a different prompt or write it yourself.",
        });
        return;
      }
      setValue("description", letter, { shouldValidate: true, shouldDirty: true });
      toast.success(ai ? "Draft ready" : "Draft ready (offline fallback)", {
        id: tid,
        description: "Edit it below before submitting.",
      });
    } finally {
      setGenerating(false);
    }
  };

  // ---- Submit: summarize → build → insert into Supabase → mirror ---------

  const onSubmit = async (values: FormValues) => {
    if (!studentName || !studentId) {
      toast.error("You must be signed in as a student to submit.");
      return;
    }

    setSubmitting(true);
    const tid = toast.loading("Submitting request…", {
      description: "Generating an AI summary for the reviewer.",
    });

    try {
      const { summary } = await summarizeTextDetailed(values.description);
      const now = new Date().toISOString();

      const submittedEvent: ApprovalEvent = {
        id: newId("evt"),
        timestamp: now,
        actorId: studentId,
        actorRole: "STUDENT",
        action: "SUBMITTED",
      };

      const request: Request = {
        id: newId("req"),
        studentId,
        studentName,
        type: values.type,
        title: values.title.trim(),
        description: values.description.trim(),
        aiSummary: summary || undefined,
        status: "PENDING_ADVISOR",
        createdAt: now,
        updatedAt: now,
        history: [submittedEvent],
      };

      // Persist to Supabase so other devices see it via realtime.
      const { error } = await supabase
        .from("requests")
        .insert(requestToRow(request));

      if (error) throw error;

      // Mirror locally so the right-hand list updates instantly.
      addRequest(request);

      toast.success("Request submitted", {
        id: tid,
        description: "Now with your Advisor for review.",
      });

      reset({ type: values.type, title: "", description: "" });
      setAiPrompt("");
    } catch (err) {
      toast.error("Could not submit request", {
        id: tid,
        description:
          err instanceof Error ? err.message : "Please try again in a moment.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-500" />
          New request
        </CardTitle>
        <CardDescription>
          Describe what you need. Our AI helps you write a polished letter, and
          your Advisor reviews it next.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
          {/* AI Magic prompt */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-900/50 dark:bg-blue-950/30">
            <Label htmlFor="ai-prompt" className="flex items-center gap-1.5 text-blue-900 dark:text-blue-200">
              <Wand2 className="h-4 w-4" />
              AI Magic — describe it in one line
            </Label>
            <div className="mt-2 flex gap-2">
              <Input
                id="ai-prompt"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder='e.g. "Need 2 days leave for a hackathon"'
                disabled={generating || submitting}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleGenerate();
                  }
                }}
              />
              <Button
                type="button"
                variant="default"
                onClick={handleGenerate}
                disabled={generating || submitting || aiPrompt.trim().length === 0}
                aria-label="Generate letter from prompt"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Draft with AI</span>
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-blue-900/70 dark:text-blue-200/70">
              The AI will fill the description below. You can edit it freely
              before submitting.
            </p>
          </div>

          {/* Type */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="request-type">Request type</Label>
            <NativeSelect
              id="request-type"
              disabled={submitting}
              {...register("type")}
            >
              {REQUEST_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </NativeSelect>
            {errors.type && (
              <p className="text-sm text-red-600">{errors.type.message}</p>
            )}
          </div>

          {/* Title */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="request-title">Title</Label>
            <Input
              id="request-title"
              placeholder="e.g. 2-day leave for hackathon"
              disabled={submitting}
              aria-invalid={Boolean(errors.title)}
              {...register("title")}
            />
            {errors.title && (
              <p className="text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="request-description">Description</Label>
            <Textarea
              id="request-description"
              rows={9}
              placeholder={placeholder}
              disabled={submitting}
              aria-invalid={Boolean(errors.description)}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-red-600">
                {errors.description.message}
              </p>
            )}
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              An AI summary of this description is generated automatically on
              submit, so reviewers can decide quickly.
            </p>
          </div>

          <div className="flex justify-end pt-1">
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Request
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
