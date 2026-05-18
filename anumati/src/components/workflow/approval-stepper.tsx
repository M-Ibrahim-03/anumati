"use client";

/**
 * Approval stepper + history timeline.
 *
 * Renders the four-stage pipeline (Advisor -> HOD -> Principal -> Approved)
 * with status-aware coloring, then a vertical history timeline below.
 */

import { motion } from "framer-motion";
import {
  Check,
  Clock,
  XCircle,
  UserCheck,
  Building2,
  Crown,
  CheckCircle2,
  ArrowUpRight,
  Send,
} from "lucide-react";
import type { ApprovalEvent, Request, Status } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AbsoluteTime, RelativeTime } from "@/components/ui/time-stamp";

// ---------------------------------------------------------------------------
// Stage definition: drives both the stepper layout and status math.
// ---------------------------------------------------------------------------

interface Stage {
  key: "ADVISOR" | "HOD" | "PRINCIPAL" | "APPROVED";
  label: string;
  /** Status that means "this stage is currently active". Final stage uses APPROVED. */
  pendingStatus: Status;
  Icon: React.ComponentType<{ className?: string }>;
}

const STAGES: Stage[] = [
  { key: "ADVISOR", label: "Advisor", pendingStatus: "PENDING_ADVISOR", Icon: UserCheck },
  { key: "HOD", label: "HOD", pendingStatus: "PENDING_HOD", Icon: Building2 },
  { key: "PRINCIPAL", label: "Principal", pendingStatus: "PENDING_PRINCIPAL", Icon: Crown },
  { key: "APPROVED", label: "Approved", pendingStatus: "APPROVED", Icon: CheckCircle2 },
];

/** Numeric progress index for a given status (how many stages are "past"). */
function statusToIndex(status: Status): number {
  switch (status) {
    case "DRAFT":
    case "PENDING_ADVISOR":
      return 0;
    case "PENDING_HOD":
      return 1;
    case "PENDING_PRINCIPAL":
      return 2;
    case "APPROVED":
      return 3;
    case "REJECTED":
      // Active stage is wherever the most recent rejection sat. We compute
      // that lazily from history below; here just return -1 as a sentinel.
      return -1;
  }
}

/** When rejected, find which stage held the request when the reject happened. */
function rejectedAtIndex(history: ApprovalEvent[]): number {
  const rejectEvent = [...history].reverse().find((e) => e.action === "REJECTED");
  if (!rejectEvent) return 0;
  switch (rejectEvent.actorRole) {
    case "ADVISOR":
      return 0;
    case "HOD":
      return 1;
    case "PRINCIPAL":
      return 2;
    default:
      return 0;
  }
}

type StageState = "done" | "current" | "future" | "rejected";

function getStageState(
  index: number,
  status: Status,
  rejectedIndex: number,
): StageState {
  if (status === "REJECTED") {
    if (index < rejectedIndex) return "done";
    if (index === rejectedIndex) return "rejected";
    return "future";
  }
  if (status === "APPROVED") {
    return "done";
  }
  const activeIndex = statusToIndex(status);
  if (index < activeIndex) return "done";
  if (index === activeIndex) return "current";
  return "future";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface ApprovalStepperProps {
  request: Request;
  className?: string;
}

export function ApprovalStepper({ request, className }: ApprovalStepperProps) {
  const rejectedIdx =
    request.status === "REJECTED" ? rejectedAtIndex(request.history) : -1;

  return (
    <div className={cn("flex flex-col gap-8", className)}>
      {/* ---------- Horizontal stepper ---------- */}
      <div className="flex items-center">
        {STAGES.map((stage, i) => {
          const state = getStageState(i, request.status, rejectedIdx);
          const isLast = i === STAGES.length - 1;

          const circleCls = cn(
            "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            state === "done" &&
              "border-emerald-500 bg-emerald-500 text-white",
            state === "current" &&
              "border-blue-500 bg-blue-500 text-white animate-pulse",
            state === "future" &&
              "border-zinc-200 bg-white text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-500",
            state === "rejected" &&
              "border-red-500 bg-red-500 text-white",
          );

          const labelCls = cn(
            "mt-2 text-xs font-medium",
            state === "done" && "text-emerald-700 dark:text-emerald-400",
            state === "current" && "text-blue-700 dark:text-blue-400",
            state === "rejected" && "text-red-700 dark:text-red-400",
            state === "future" && "text-zinc-500 dark:text-zinc-400",
          );

          const connectorCls = cn(
            "h-0.5 flex-1 mx-2",
            state === "done"
              ? "bg-emerald-500"
              : state === "rejected"
                ? "bg-red-500/50"
                : "bg-zinc-200 dark:bg-zinc-700",
          );

          // Pick the right icon for the circle
          let CircleIcon = stage.Icon;
          if (state === "done") CircleIcon = Check;
          if (state === "rejected") CircleIcon = XCircle;
          if (state === "current") CircleIcon = Clock;

          return (
            <div key={stage.key} className="flex flex-1 items-start">
              <div className="flex flex-col items-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.08, type: "spring", stiffness: 260, damping: 20 }}
                  className={circleCls}
                >
                  <CircleIcon className="h-5 w-5" />
                </motion.div>
                <span className={labelCls}>{stage.label}</span>
              </div>
              {!isLast && <div className={connectorCls} aria-hidden />}
            </div>
          );
        })}
      </div>

      {/* ---------- Vertical history timeline ---------- */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Activity
        </h3>
        <ol className="relative space-y-4 border-l border-zinc-200 pl-6 dark:border-zinc-800">
          {request.history.map((event, i) => (
            <HistoryItem key={event.id} event={event} index={i} />
          ))}
        </ol>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// History item
// ---------------------------------------------------------------------------

function HistoryItem({ event, index }: { event: ApprovalEvent; index: number }) {
  const meta = describeEvent(event);

  return (
    <motion.li
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 + index * 0.06, duration: 0.25 }}
      className="relative"
    >
      <span
        className={cn(
          "absolute left-[-31px] top-1 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-white dark:ring-zinc-950",
          meta.dotClass,
        )}
      >
        <meta.Icon className="h-3 w-3 text-white" />
      </span>
      <div className="flex flex-col">
        <p className="text-sm">
          <span className="font-medium text-zinc-900 dark:text-zinc-50">
            {meta.actor}
          </span>{" "}
          <span className="text-zinc-600 dark:text-zinc-400">{meta.verb}</span>
        </p>
        {event.comment && (
          <p className="mt-1 rounded-md bg-zinc-50 px-3 py-2 text-sm italic text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            “{event.comment}”
          </p>
        )}
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          <RelativeTime date={event.timestamp} />
          {" · "}
          <AbsoluteTime date={event.timestamp} />
        </p>
      </div>
    </motion.li>
  );
}

function describeEvent(event: ApprovalEvent): {
  actor: string;
  verb: string;
  Icon: React.ComponentType<{ className?: string }>;
  dotClass: string;
} {
  const role = event.actorRole.charAt(0) + event.actorRole.slice(1).toLowerCase();

  switch (event.action) {
    case "SUBMITTED":
      return {
        actor: role,
        verb: "submitted the request",
        Icon: Send,
        dotClass: "bg-blue-500",
      };
    case "APPROVED":
      return {
        actor: role,
        verb: "gave final approval",
        Icon: Check,
        dotClass: "bg-emerald-500",
      };
    case "ESCALATED":
      return {
        actor: role,
        verb: "approved and escalated",
        Icon: ArrowUpRight,
        dotClass: "bg-emerald-500",
      };
    case "FORWARDED":
      return {
        actor: role,
        verb: "approved and forwarded",
        Icon: ArrowUpRight,
        dotClass: "bg-emerald-500",
      };
    case "REJECTED":
      return {
        actor: role,
        verb: "rejected the request",
        Icon: XCircle,
        dotClass: "bg-red-500",
      };
  }
}
