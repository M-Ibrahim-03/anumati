/**
 * Single source of truth for the home page of each role.
 * Used by the root router and the floating role-switcher.
 */

import type { Role } from "./types";

export const ROLE_HOME: Record<Role, string> = {
  STUDENT: "/student",
  ADVISOR: "/advisor",
  HOD: "/hod",
  PRINCIPAL: "/principal",
};
