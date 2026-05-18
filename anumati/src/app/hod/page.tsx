"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { TopNav } from "@/components/shared/top-nav";
import { FacultyQueue } from "@/components/workflow/faculty-queue";

export default function HodPage() {
  return (
    <ProtectedRoute requiredRole="HOD">
      <TopNav />
      <FacultyQueue
        filterStatus="PENDING_HOD"
        title="HOD queue"
        description="Department-level review. Approve to forward to the Principal for final sign-off, or reject with feedback."
        emptyTitle="Nothing pending department review"
        emptyDescription="Requests forwarded by Advisors will arrive here for your decision."
      />
    </ProtectedRoute>
  );
}
