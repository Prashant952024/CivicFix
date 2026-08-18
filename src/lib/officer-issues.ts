import {
  formatCitizenIssueCoordinates,
  formatCitizenIssueDate,
  formatCitizenIssueDateTime,
  formatCitizenIssueImageUrl,
  formatCitizenIssuePriority,
  getCitizenIssueStatusTone,
  getCitizenIssueStatusFilterBucket,
  getCitizenIssueStatusOrder,
  getCitizenIssueStatusBannerLabel,
  pickCitizenIssueThumbnail,
  type CitizenIssuePriority,
  type CitizenIssueStatus,
  type CitizenIssueStatusFilterBucket,
  type CitizenIssueImageRow,
} from "@/lib/citizen-issues";
import type { Database } from "@/types/database";

export type OfficerIssueStatus = CitizenIssueStatus;
export type OfficerIssuePriority = CitizenIssuePriority;
export type OfficerIssueSeverity = Database["public"]["Enums"]["issue_severity"];
export type OfficerIssueImageRow = CitizenIssueImageRow;
export type OfficerIssueAiAnalysisRow = Database["public"]["Tables"]["issue_ai_analysis"]["Row"];
export type OfficerIssueAssignmentRow = Database["public"]["Tables"]["issue_assignments"]["Row"];
export type OfficerIssueHistoryRow = Database["public"]["Tables"]["issue_status_history"]["Row"];
export type OfficerDepartmentRow = Database["public"]["Tables"]["departments"]["Row"];
export type OfficerProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

const ISSUE_SEVERITY_LABELS: Record<OfficerIssueSeverity, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

const ISSUE_SEVERITY_TONES: Record<OfficerIssueSeverity, "default" | "success" | "warning" | "danger" | "info"> = {
  LOW: "success",
  MEDIUM: "info",
  HIGH: "warning",
  CRITICAL: "danger",
};

const ISSUE_PRIORITY_TONES: Record<OfficerIssuePriority, "default" | "success" | "warning" | "danger" | "info"> = {
  LOW: "success",
  MEDIUM: "info",
  HIGH: "warning",
  URGENT: "danger",
};

const ISSUE_STATUS_OPTIONS: Array<{ key: CitizenIssueStatusFilterBucket; label: string }> = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "verified", label: "Verified" },
  { key: "inProgress", label: "In Progress" },
  { key: "resolved", label: "Resolved" },
  { key: "reopened", label: "Reopened" },
  { key: "rejected", label: "Rejected" },
];

export function getOfficerIssueStatusTone(status: OfficerIssueStatus) {
  return getCitizenIssueStatusTone(status);
}

export function getOfficerIssueStatusLabel(status: OfficerIssueStatus) {
  return getCitizenIssueStatusBannerLabel(status);
}

export function getOfficerIssueStatusOrder(status: OfficerIssueStatus) {
  return getCitizenIssueStatusOrder(status);
}

export function getOfficerIssueStatusFilterBucket(status: OfficerIssueStatus) {
  return getCitizenIssueStatusFilterBucket(status);
}

export function getOfficerIssuePriorityTone(priority: OfficerIssuePriority) {
  return ISSUE_PRIORITY_TONES[priority];
}

export function getOfficerIssueSeverityLabel(severity: OfficerIssueSeverity) {
  return ISSUE_SEVERITY_LABELS[severity];
}

export function getOfficerIssueSeverityTone(severity: OfficerIssueSeverity) {
  return ISSUE_SEVERITY_TONES[severity];
}

export function formatOfficerIssuePriority(priority: OfficerIssuePriority) {
  return formatCitizenIssuePriority(priority);
}

export function formatOfficerIssueDate(value: string) {
  return formatCitizenIssueDate(value);
}

export function formatOfficerIssueDateTime(value: string) {
  return formatCitizenIssueDateTime(value);
}

export function formatOfficerIssueCoordinates(latitude: string | null, longitude: string | null) {
  return formatCitizenIssueCoordinates(latitude, longitude);
}

export function formatOfficerIssueImageUrl(image: OfficerIssueImageRow | null | undefined) {
  return formatCitizenIssueImageUrl(image);
}

export function pickOfficerIssueThumbnail(issue: {
  issue_images?: OfficerIssueImageRow[] | null;
}) {
  return pickCitizenIssueThumbnail(issue);
}

export function getOfficerIssueStatusOptions() {
  return ISSUE_STATUS_OPTIONS;
}

export function formatOfficerProfileLabel(profile: Pick<OfficerProfileRow, "full_name" | "email" | "id"> | null | undefined) {
  if (!profile) {
    return "Unassigned";
  }

  return profile.full_name?.trim() || profile.email || `Profile ${profile.id.slice(0, 8)}`;
}

export function formatOfficerDepartmentLabel(department: Pick<OfficerDepartmentRow, "name"> | null | undefined) {
  return department?.name ?? "Unassigned";
}

export function formatOfficerAssignmentSummary(assignment: {
  department?: Pick<OfficerDepartmentRow, "name"> | null;
  worker?: Pick<OfficerProfileRow, "full_name" | "email" | "id"> | null;
} | null | undefined) {
  if (!assignment) {
    return {
      departmentLabel: "No department assigned",
      workerLabel: "No worker assigned",
    };
  }

  return {
    departmentLabel: formatOfficerDepartmentLabel(assignment.department),
    workerLabel: formatOfficerProfileLabel(assignment.worker),
  };
}
