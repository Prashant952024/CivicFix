import { formatCitizenIssueDate, formatCitizenIssueDateTime, getCitizenIssueStatusLabel, getCitizenIssueStatusTone } from "@/lib/citizen-issues";
import type { Database } from "@/types/database";

export type AdminRoleCode = Database["public"]["Enums"]["role_code"];
export type AdminIssueStatus = Database["public"]["Enums"]["issue_status"];
export type AdminIssuePriority = Database["public"]["Enums"]["issue_priority"];
export type AdminIssueSeverity = Database["public"]["Enums"]["issue_severity"];

const ROLE_TONES: Record<AdminRoleCode, "default" | "success" | "warning" | "danger" | "info"> = {
  CITIZEN: "info",
  MUNICIPAL_OFFICER: "warning",
  DEPARTMENT_MANAGER: "info",
  FIELD_WORKER: "danger",
  ADMIN: "success",
};

const PRIORITY_TONES: Record<AdminIssuePriority, "default" | "success" | "warning" | "danger" | "info"> = {
  LOW: "success",
  MEDIUM: "info",
  HIGH: "warning",
  URGENT: "danger",
};

const SEVERITY_TONES: Record<AdminIssueSeverity, "default" | "success" | "warning" | "danger" | "info"> = {
  LOW: "success",
  MEDIUM: "info",
  HIGH: "warning",
  CRITICAL: "danger",
};

export function getAdminRoleTone(roleCode: AdminRoleCode) {
  return ROLE_TONES[roleCode];
}

export function getAdminRoleLabel(roleCode: AdminRoleCode) {
  switch (roleCode) {
    case "MUNICIPAL_OFFICER":
      return "Municipal Officer";
    case "DEPARTMENT_MANAGER":
      return "Department Manager";
    case "FIELD_WORKER":
      return "Field Worker";
    case "ADMIN":
      return "Admin";
    case "CITIZEN":
    default:
      return "Citizen";
  }
}

export function formatAdminIssueStatusLabel(status: AdminIssueStatus) {
  return getCitizenIssueStatusLabel(status);
}

export function getAdminIssueStatusTone(status: AdminIssueStatus) {
  return getCitizenIssueStatusTone(status);
}

export function getAdminPriorityTone(priority: AdminIssuePriority) {
  return PRIORITY_TONES[priority];
}

export function getAdminSeverityTone(severity: AdminIssueSeverity) {
  return SEVERITY_TONES[severity];
}

export function formatAdminDate(value: string) {
  return formatCitizenIssueDate(value);
}

export function formatAdminDateTime(value: string) {
  return formatCitizenIssueDateTime(value);
}

export function getAdminInitials(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return "CF";
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "CF";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

