"use client";

import { FacultyQueue } from "@/components/workflow/faculty-queue";

export default function PrincipalPage() {
  return (
    <FacultyQueue
      filterStatus="PENDING_PRINCIPAL"
      title="Principal queue"
      description="Final sign-off. Once approved here, the request is officially granted and the student is notified."
      emptyTitle="No pending sign-offs"
      emptyDescription="Requests endorsed by HODs will appear here for your final decision."
    />
  );
}
