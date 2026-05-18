"use client";

/**
 * Student dashboard.
 *
 * Two-column layout:
 *   - Left: submission form
 *   - Right: a feed of this student's requests, each rendered as a Card
 *            with title, type badge, status badge, and the live stepper.
 */

import {
  CalendarDays,
  CheckCircle2,
  Clock,
  FolderKanban,
  Inbox,
  PartyPopper,
  XCircle,
} from "lucide-react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { RelativeTime } from "@/components/ui/time-stamp";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StudentRequestForm } from "@/components/forms/student-request-form";
import { ApprovalStepper } from "@/components/workflow/approval-stepper";
import { useAppStore } from "@/lib/store";
import type { Request, RequestType, Status } from "@/lib/types";

// ---------------------------------------------------------------------------
// Visual mappings for the type / status badges
// ---------------------------------------------------------------------------

const TYPE_META: Record<
  RequestType,
  { label: string; Icon: React.ComponentType<{ className?: string }>; variant: BadgeProps["variant"] }
> = {
  LEAVE: { label: "Leave", Icon: CalendarDays, variant: "info" },
  EVENT: { label: "Event", Icon: PartyPopper, variant: "warning" },
  PROJECT: { label: "Project", Icon: FolderKanban, variant: "secondary" },
};

const STATUS_META: Record<
  Status,
  { label: string; Icon: React.ComponentType<{ className?: string }>; variant: BadgeProps["variant"] }
> = {
  DRAFT: { label: "Draft", Icon: Clock, variant: "outline" },
  PENDING_ADVISOR: { label: "Pending Advisor", Icon: Clock, variant: "info" },
  PENDING_HOD: { label: "Pending HOD", Icon: Clock, variant: "info" },
  PENDING_PRINCIPAL: { label: "Pending Principal", Icon: Clock, variant: "info" },
  APPROVED: { label: "Approved", Icon: CheckCircle2, variant: "success" },
  REJECTED: { label: "Rejected", Icon: XCircle, variant: "destructive" },
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function StudentPage() {
  const { currentUser, requests, hydrated } = useAppStore();

  // Filter to this student's requests, newest first.
  const myRequests = requests
    .filter((r) => r.studentId === currentUser.id)
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <main className="flex-1 w-full mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Welcome, {currentUser.name.split(" ")[0]}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Submit new approval requests on the left. Track progress on the right.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ---------- Left: submission form ---------- */}
        <section aria-labelledby="submit-heading" className="lg:sticky lg:top-6 lg:self-start">
          <h2 id="submit-heading" className="sr-only">
            Submit a request
          </h2>
          <StudentRequestForm />
        </section>

        {/* ---------- Right: my requests feed ---------- */}
        <section
          aria-labelledby="my-requests-heading"
          className="flex flex-col gap-4"
        >
          <div className="flex items-baseline justify-between">
            <h2
              id="my-requests-heading"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              My requests
            </h2>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {hydrated ? `${myRequests.length} total` : "Loading…"}
            </span>
          </div>

          {hydrated && myRequests.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="flex flex-col gap-4">
              {myRequests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function RequestCard({ request }: { request: Request }) {
  const type = TYPE_META[request.type];
  const status = STATUS_META[request.status];
  const TypeIcon = type.Icon;
  const StatusIcon = status.Icon;

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={type.variant}>
            <TypeIcon className="h-3 w-3" />
            {type.label}
          </Badge>
          <Badge variant={status.variant}>
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </Badge>
          <span className="ml-auto text-xs text-zinc-500 dark:text-zinc-400">
            Updated <RelativeTime date={request.updatedAt} />
          </span>
        </div>
        <CardTitle className="text-base">{request.title}</CardTitle>
        {request.aiSummary && (
          <p className="rounded-md bg-blue-50 px-3 py-2 text-xs italic text-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
            ✨ {request.aiSummary}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <ApprovalStepper request={request} />
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
        <Inbox className="h-10 w-10 text-zinc-400" />
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          No requests yet
        </p>
        <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
          Submit your first request using the form on the left. You'll see its
          progress here as it moves through Advisor → HOD → Principal.
        </p>
      </CardContent>
    </Card>
  );
}
