"use client";

import { FacultyQueue } from "@/components/workflow/faculty-queue";

export default function HodPage() {
  return (
    <FacultyQueue
      filterStatus="PENDING_HOD"
      title="HOD queue"
      description="Department-level review. Approve to forward to the Principal for final sign-off, or reject with feedback."
      emptyTitle="Nothing pending department review"
      emptyDescription="Requests cleared by Advisors will arrive here for your decision."
    />
  );
}
