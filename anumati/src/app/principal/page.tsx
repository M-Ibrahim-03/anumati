"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { TopNav } from "@/components/shared/top-nav";
import { FacultyQueue } from "@/components/workflow/faculty-queue";

export default function PrincipalPage() {
  return (
    <ProtectedRoute requiredRole="PRINCIPAL">
      <TopNav />
      <FacultyQueue
        filterStatus="PENDING_PRINCIPAL"
        title="Principal Decisions"
        description="Final sign-off. Once approved here, the request is officially granted."
        emptyTitle="All caught up!"
        emptyDescription="Requests endorsed by HODs will appear here for your final decision."
      />
    </ProtectedRoute>
  );
}
