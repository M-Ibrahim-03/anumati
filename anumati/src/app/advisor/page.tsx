"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { TopNav } from "@/components/shared/top-nav";
import { FacultyQueue } from "@/components/workflow/faculty-queue";

export default function AdvisorPage() {
  return (
    <ProtectedRoute requiredRole="ADVISOR">
      <TopNav />
      <FacultyQueue
        filterStatus="PENDING_ADVISOR"
        title="Advisor queue"
        description="First-level review. Approve simple requests directly, or forward complex ones to the HOD."
        emptyTitle="No requests waiting on you"
        emptyDescription="When students submit new requests, they'll show up here for your review."
      />
    </ProtectedRoute>
  );
}
