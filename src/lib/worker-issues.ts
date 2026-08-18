import {
  formatCitizenIssueCoordinates,
  formatCitizenIssueDate,
  formatCitizenIssueDateTime,
  formatCitizenIssueImageUrl,
  formatCitizenIssuePriority,
  getCitizenIssueStatusBannerLabel,
  getCitizenIssueStatusFilterBucket,
  getCitizenIssueStatusOrder,
  getCitizenIssueStatusTone,
  pickCitizenIssueThumbnail,
  type CitizenIssueImageRow,
  type CitizenIssuePriority,
  type CitizenIssueStatus,
  type CitizenIssueStatusFilterBucket,
} from "@/lib/citizen-issues";
import type { Database } from "@/types/database";

export type WorkerIssueStatus = CitizenIssueStatus;
export type WorkerIssuePriority = CitizenIssuePriority;
export type WorkerIssueImageRow = CitizenIssueImageRow;
export type WorkerIssueAiAnalysisRow = Database["public"]["Tables"]["issue_ai_analysis"]["Row"];
export type WorkerIssueAssignmentRow = Database["public"]["Tables"]["issue_assignments"]["Row"];
export type WorkerIssueHistoryRow = Database["public"]["Tables"]["issue_status_history"]["Row"];
export type WorkerDepartmentRow = Database["public"]["Tables"]["departments"]["Row"];
export type WorkerProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

const STATUS_OPTIONS: Array<{ key: CitizenIssueStatusFilterBucket; label: string }> = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "verified", label: "Verified" },
  { key: "inProgress", label: "In Progress" },
  { key: "resolved", label: "Resolved" },
  { key: "reopened", label: "Reopened" },
  { key: "rejected", label: "Rejected" },
];

const PRIORITY_TONES: Record<WorkerIssuePriority, "default" | "success" | "warning" | "danger" | "info"> = {
  LOW: "success",
  MEDIUM: "info",
  HIGH: "warning",
  URGENT: "danger",
};

export function getWorkerIssueStatusTone(status: WorkerIssueStatus) {
  return getCitizenIssueStatusTone(status);
}

export function getWorkerIssueStatusLabel(status: WorkerIssueStatus) {
  return getCitizenIssueStatusBannerLabel(status);
}

export function getWorkerIssueStatusOrder(status: WorkerIssueStatus) {
  return getCitizenIssueStatusOrder(status);
}

export function getWorkerIssueStatusFilterBucket(status: WorkerIssueStatus) {
  return getCitizenIssueStatusFilterBucket(status);
}

export function getWorkerIssueStatusOptions() {
  return STATUS_OPTIONS;
}

export function getWorkerIssuePriorityTone(priority: WorkerIssuePriority) {
  return PRIORITY_TONES[priority];
}

export function formatWorkerIssuePriority(priority: WorkerIssuePriority) {
  return formatCitizenIssuePriority(priority);
}

export function formatWorkerIssueDate(value: string) {
  return formatCitizenIssueDate(value);
}

export function formatWorkerIssueDateTime(value: string) {
  return formatCitizenIssueDateTime(value);
}

export function formatWorkerIssueCoordinates(latitude: string | null, longitude: string | null) {
  return formatCitizenIssueCoordinates(latitude, longitude);
}

export function formatWorkerIssueImageUrl(image: WorkerIssueImageRow | null | undefined) {
  return formatCitizenIssueImageUrl(image);
}

export function pickWorkerIssueThumbnail(issue: {
  issue_images?: WorkerIssueImageRow[] | null;
}) {
  return pickCitizenIssueThumbnail(issue);
}

export function formatWorkerProfileLabel(profile: Pick<WorkerProfileRow, "full_name" | "email" | "id"> | null | undefined) {
  if (!profile) {
    return "Unassigned";
  }

  return profile.full_name?.trim() || profile.email || `Profile ${profile.id.slice(0, 8)}`;
}

export function formatWorkerDepartmentLabel(department: Pick<WorkerDepartmentRow, "name"> | null | undefined) {
  return department?.name ?? "Unassigned";
}

