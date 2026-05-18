"use client";

/**
 * Student request submission form.
 *
 * react-hook-form + zod validation. On submit:
 *   1. Show a loading state.
 *   2. Hit /api/ai/summarize via summarizeText to populate aiSummary.
 *   3. Build a fresh Request with status PENDING_ADVISOR and a SUBMITTED event.
 *   4. addRequest() into the store. Toast + reset.
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Send, Sparkles } from "lucide-react";
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
import { summarizeTextDetailed } from "@/lib/ai/summarize";
import type { ApprovalEvent, Request, RequestType } from "@/lib/types";

// ---------------------------------------------------------------------------
// Schema
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
    .max(4000, "Description is too long."),
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

export function StudentRequestForm() {
  const { currentUser, addRequest } = useAppStore();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: "LEAVE", title: "", description: "" },
  });

  const selectedType = watch("type");
  const placeholder =
    REQUEST_TYPES.find((t) => t.value === selectedType)?.placeholder ?? "";

  const onSubmit = async (values: FormValues) => {
    if (currentUser.role !== "STUDENT") {
      toast.error("Only students can submit requests.", {
        description: "Switch to the Student role using the demo pill.",
      });
      return;
    }

    setSubmitting(true);
    const summarizeToast = toast.loading("Submitting request…", {
      description: "Generating AI summary for the reviewer.",
    });

    try {
      const { summary, ai } = await summarizeTextDetailed(values.description);
      const now = new Date().toISOString();

      const submittedEvent: ApprovalEvent = {
        id: newId("evt"),
        timestamp: now,
        actorId: currentUser.id,
        actorRole: "STUDENT",
        action: "SUBMITTED",
      };

      const request: Request = {
        id: newId("req"),
        studentId: currentUser.id,
        studentName: currentUser.name,
        type: values.type,
        title: values.title.trim(),
        description: values.description.trim(),
        aiSummary: summary || undefined,
        status: "PENDING_ADVISOR",
        createdAt: now,
        updatedAt: now,
        history: [submittedEvent],
      };

      addRequest(request);

      toast.success("Request submitted", {
        id: summarizeToast,
        description: ai
          ? "AI summary generated. Now with your Advisor."
          : "Now with your Advisor.",
      });

      reset({ type: values.type, title: "", description: "" });
    } catch (err) {
      toast.error("Could not submit request", {
        id: summarizeToast,
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-500" />
          Submit a new request
        </CardTitle>
        <CardDescription>
          Your request will be sent to your Advisor first. You'll get notified
          as it moves through HOD and Principal.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
          noValidate
        >
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
              placeholder="e.g. Medical leave for 3 days"
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
              rows={6}
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
              An AI summary will be generated automatically for faster review.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={submitting} size="lg">
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
