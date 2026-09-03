import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

export type CivicFixRoleCode = Database["public"]["Enums"]["role_code"];

type CivicFixRoleConfig = {
  code: CivicFixRoleCode;
  label: string;
  dashboardPath: string;
};

export const civicFixRoleConfigs: Record<CivicFixRoleCode, CivicFixRoleConfig> = {
  CITIZEN: {
    code: "CITIZEN",
    label: "Citizen",
    dashboardPath: "/app/citizen",
  },
  MUNICIPAL_OFFICER: {
    code: "MUNICIPAL_OFFICER",
    label: "Municipal Officer",
    dashboardPath: "/app/officer",
  },
  DEPARTMENT_MANAGER: {
    code: "DEPARTMENT_MANAGER",
    label: "Department Manager",
    dashboardPath: "/app/manager",
  },
  FIELD_WORKER: {
    code: "FIELD_WORKER",
    label: "Field Worker",
    dashboardPath: "/app/worker",
  },
  ADMIN: {
    code: "ADMIN",
    label: "Admin",
    dashboardPath: "/app/admin",
  },
};

export function getCivicFixRoleLabel(roleCode: CivicFixRoleCode | null | undefined) {
  return roleCode ? civicFixRoleConfigs[roleCode].label : "CivicFix User";
}

export function getCivicFixDashboardPath(roleCode: CivicFixRoleCode | null | undefined) {
  return roleCode ? civicFixRoleConfigs[roleCode].dashboardPath : "/unauthorized";
}

export async function loadCivicFixRoleCode(roleId: string) {
  const { data, error } = await supabase.from("roles").select("code").eq("id", roleId).maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.code;
}

export async function loadCivicFixRoleId(roleCode: CivicFixRoleCode) {
  const { data, error } = await supabase.from("roles").select("id").eq("code", roleCode).maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.id;
}

export type CivicFixRoleNavItem = {
  label: string;
  path: string;
  description: string;
};

export const civicFixNavItems: Record<CivicFixRoleCode, CivicFixRoleNavItem[]> = {
  CITIZEN: [
    { label: "Dashboard", path: "/app/citizen", description: "Citizen overview and status cards." },
    { label: "Report Issue", path: "/app/citizen/report", description: "Start a new report." },
    { label: "My Issues", path: "/app/citizen/issues", description: "Track your reported issues." },
    { label: "Notifications", path: "/app/citizen/notifications", description: "Alerts and updates." },
  ],
  MUNICIPAL_OFFICER: [
    { label: "Dashboard", path: "/app/officer", description: "Officer overview and queue." },
    { label: "Issues", path: "/app/officer/issues", description: "Review and triage issues." },
    { label: "Map", path: "/app/officer/map", description: "Geospatial issue view." },
    { label: "Analytics", path: "/app/officer/analytics", description: "Operational insights." },
    { label: "Notifications", path: "/app/officer/notifications", description: "Workflow alerts." },
  ],
  DEPARTMENT_MANAGER: [
    { label: "Dashboard", path: "/app/manager", description: "Department overview and metrics." },
    { label: "Department Tasks", path: "/app/manager/tasks", description: "Manage and dispatch departmental tasks." },
    { label: "Field Crew", path: "/app/manager/workers", description: "Monitor workforce capacity and assignments." },
    { label: "Notifications", path: "/app/manager/notifications", description: "Departmental alerts and updates." },
  ],
  FIELD_WORKER: [
    { label: "Dashboard", path: "/app/worker", description: "Worker overview and assignments." },
    { label: "Assigned Issues", path: "/app/worker/assigned-issues", description: "Tasks ready to work." },
    { label: "Notifications", path: "/app/worker/notifications", description: "Updates and reminders." },
  ],
  ADMIN: [
    { label: "Overview", path: "/app/admin", description: "Command center overview and metrics." },
    { label: "Issues", path: "/app/admin/issues", description: "Platform-wide issue triage and audit." },
    { label: "Users", path: "/app/admin/users", description: "Manage municipal staff and credentials." },
    { label: "Departments", path: "/app/admin/departments", description: "Manage municipal departments." },
    { label: "Analytics", path: "/app/admin/analytics", description: "System throughput and resolution trends." },
    { label: "Activity", path: "/app/admin/activity", description: "Audit log of state transitions." },
    { label: "Notifications", path: "/app/admin/notifications", description: "Administrative alerts and notices." },
  ],
};
