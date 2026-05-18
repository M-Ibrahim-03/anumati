"use client";

/**
 * Shared faculty review queue.
 *
 * Drives /advisor, /hod, /principal. Reads from the store, filters by the
 * status this role acts on, and renders an animated stack of cards. Each
 * card shows: student, title, ✨ AI summary, type badge, full description
 * under a <details>, the ApprovalStepper, and the ApprovalActionBar.
 */

import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  ChevronDown,
  FolderKanban,
  Inbox,
  PartyPopper,
  Sparkles,
} from "lucide-react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { AbsoluteTime, RelativeTime } from "@/components/ui/time-stamp";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApprovalStepper } from "@/components/workflow/approval-stepper";
import { ApprovalActionBar } from "@/components/workflow/approval-action-bar";
import { useAppStore } from "@/lib/store";
import type { Request, RequestType, Status } from "@/lib/types";

// ---------------------------------------------------------------------------
// Type badge metadata (kept local so this component is self-contained).
// ---------------------------------------------------------------------------

const TYPE_META: Record<
  RequestType,
  {
    label: string;
    Icon: React.ComponentType<{ className?: string }>;
    variant: BadgeProps["variant"];
  }
> = {
  LEAVE: { label: "Leave", Icon: CalendarDays, variant: "info" },
  EVENT: { label: "Event", Icon: PartyPopper, variant: "warning" },
  PROJECT: { label: "Project", Icon: FolderKanban, variant: "secondary" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface FacultyQueueProps {
  /** Status this queue acts on (e.g. PENDING_ADVISOR). */
  filterStatus: Status;
  /** Page title shown above the queue. */
  title: string;
  /** Subtitle / description under the title. */
  description: string;
  /** Friendly empty-state copy. */
  emptyTitle?: string;
  emptyDescription?: string;
}

export function FacultyQueue({
  filterStatus,
  title,
  description,
  emptyTitle = "Inbox zero",
  emptyDescription = "Nothing waiting on you right now. Check back soon.",
}: FacultyQueueProps) {
  const { requests, currentUser, hydrated } = useAppStore();

  const queue = requests
    .filter((r) => r.status === filterStatus)
    .slice()
    // Oldest first — fairness — so longest-waiting requests bubble up.
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));

  return (
    <main className="flex-1 w-full mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {title}
          </h1>
          {hydrated && queue.length > 0 && (
            <Badge variant="info">{queue.length} pending</Badge>
          )}
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Reviewing as <span className="font-medium">{currentUser.name}</span>
          {" · "}
          {currentUser.role}
        </p>
      </header>

      {hydrated && queue.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="flex flex-col gap-5">
          <AnimatePresence mode="popLayout" initial={false}>
            {queue.map((request) => (
              <motion.div
                key={request.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.18 } }}
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
              >
                <QueueCard request={request} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Queue card
// ---------------------------------------------------------------------------

function QueueCard({ request }: { request: Request }) {
  const { currentUser } = useAppStore();
  const type = TYPE_META[request.type];
  const TypeIcon = type.Icon;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={type.variant}>
            <TypeIcon className="h-3 w-3" />
            {type.label}
          </Badge>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            from <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {request.studentName}
            </span>
          </span>
          <span className="ml-auto text-xs text-zinc-500 dark:text-zinc-400">
            Waiting <RelativeTime date={request.updatedAt} addSuffix={false} />
            {" · "}
            <AbsoluteTime date={request.updatedAt} />
          </span>
        </div>

        <CardTitle className="text-lg">{request.title}</CardTitle>

        {request.aiSummary && (
          <div className="flex items-start gap-2 rounded-lg border border-blue-200/60 bg-blue-50 px-3 py-2 dark:border-blue-900/50 dark:bg-blue-950/30">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <p className="text-sm italic text-blue-900 dark:text-blue-200">
              {request.aiSummary}
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <details className="group rounded-md border border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/40">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50">
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
            Read full request
          </summary>
          <p className="whitespace-pre-wrap px-3 pb-3 pt-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {request.description}
          </p>
        </details>

        <ApprovalStepper request={request} />
      </CardContent>

      <ApprovalActionBar request={request} currentUser={currentUser} />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
        <Inbox className="h-10 w-10 text-zinc-400" />
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {title}
        </p>
        <p className="max-w-md text-sm text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
