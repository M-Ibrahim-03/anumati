/**
 * Mock seed data for Anumati.
 *
 * Loaded into localStorage on first mount by `lib/store.ts`. Once seeded,
 * mutations live in localStorage; this file is read-only after that.
 */

import { subDays, subHours, formatISO } from "date-fns";
import type { ApprovalEvent, Request, User } from "../types";

// ---------------------------------------------------------------------------
// Users — one per role for instant role-switching demo.
// ---------------------------------------------------------------------------

export const mockUsers: User[] = [
  { id: "u_student_1", name: "Aarav Sharma", role: "STUDENT" },
  { id: "u_advisor_1", name: "Dr. Priya Iyer", role: "ADVISOR" },
  { id: "u_hod_1", name: "Dr. Rohan Kapoor", role: "HOD" },
  { id: "u_principal_1", name: "Dr. Meera Nair", role: "PRINCIPAL" },
];

// Convenience lookups so the store can find a user by role in O(1).
const STUDENT = mockUsers[0];
const ADVISOR = mockUsers[1];
const HOD = mockUsers[2];

// ---------------------------------------------------------------------------
// Realistic timestamps (relative to "now" so the demo always feels fresh).
// ---------------------------------------------------------------------------

const now = new Date();

const iso = (d: Date) => formatISO(d);

// ---------------------------------------------------------------------------
// Helper to keep event construction terse.
// ---------------------------------------------------------------------------

function event(
  id: string,
  at: Date,
  actor: User,
  action: ApprovalEvent["action"],
  comment?: string,
): ApprovalEvent {
  return {
    id,
    timestamp: iso(at),
    actorId: actor.id,
    actorRole: actor.role,
    action,
    ...(comment ? { comment } : {}),
  };
}

// ---------------------------------------------------------------------------
// Sample requests — one in each pending state.
// ---------------------------------------------------------------------------

export const mockRequests: Request[] = [
  // 1) Just submitted — sitting with the Advisor.
  {
    id: "req_001",
    studentId: STUDENT.id,
    studentName: STUDENT.name,
    type: "LEAVE",
    title: "Medical leave for 3 days",
    description:
      "Requesting leave from Monday to Wednesday due to a viral fever. Doctor's note attached. Will catch up on missed lab sessions next week.",
    status: "PENDING_ADVISOR",
    createdAt: iso(subHours(now, 4)),
    updatedAt: iso(subHours(now, 4)),
    history: [
      event("evt_001_a", subHours(now, 4), STUDENT, "SUBMITTED"),
    ],
  },

  // 2) Advisor approved, now with HOD.
  {
    id: "req_002",
    studentId: STUDENT.id,
    studentName: STUDENT.name,
    type: "EVENT",
    title: "TechFest 2026 — Robotics Workshop",
    description:
      "Proposal to host a 2-day hands-on robotics workshop during TechFest. Estimated 80 participants, requires Lab 3 and a budget of Rs. 25,000 for components.",
    aiSummary:
      "Two-day robotics workshop for ~80 students during TechFest. Needs Lab 3 and Rs. 25,000.",
    status: "PENDING_HOD",
    createdAt: iso(subDays(now, 2)),
    updatedAt: iso(subDays(now, 1)),
    history: [
      event("evt_002_a", subDays(now, 2), STUDENT, "SUBMITTED"),
      event(
        "evt_002_b",
        subDays(now, 1),
        ADVISOR,
        "ESCALATED",
        "Strong proposal, aligns with department goals. Forwarding to HOD.",
      ),
    ],
  },

  // 3) Advisor + HOD approved, now with Principal for final sign-off.
  {
    id: "req_003",
    studentId: STUDENT.id,
    studentName: STUDENT.name,
    type: "PROJECT",
    title: "Final Year Project — AI for crop disease detection",
    description:
      "Capstone project proposal: a CNN-based mobile app that detects common crop diseases from leaf photos. Mentor: Dr. Iyer. Timeline: 4 months. Requires GPU access and approval to use the institute's open dataset.",
    aiSummary:
      "FYP: mobile app using CNN to detect crop diseases. 4 months, mentor assigned, needs GPU + dataset access.",
    status: "PENDING_PRINCIPAL",
    createdAt: iso(subDays(now, 5)),
    updatedAt: iso(subHours(now, 18)),
    history: [
      event("evt_003_a", subDays(now, 5), STUDENT, "SUBMITTED"),
      event(
        "evt_003_b",
        subDays(now, 3),
        ADVISOR,
        "ESCALATED",
        "Scope is realistic and aligns with student's coursework. Approved.",
      ),
      event(
        "evt_003_c",
        subHours(now, 18),
        HOD,
        "ESCALATED",
        "Department endorses the project. Recommending GPU lab access.",
      ),
    ],
  },
];
