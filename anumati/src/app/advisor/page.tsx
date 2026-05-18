"use client";

import { FacultyQueue } from "@/components/workflow/faculty-queue";

export default function AdvisorPage() {
  return (
    <FacultyQueue
      filterStatus="PENDING_ADVISOR"
      title="Advisor queue"
      description="First-level review. Approve to forward to the HOD, or reject with feedback so the student can revise."
      emptyTitle="No requests waiting on you"
      emptyDescription="When students submit new requests, they'll show up here for your review."
    />
  );
}
