import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

export const citizenIssueCategories = [
  "Pothole",
  "Garbage",
  "Streetlight",
  "Water Supply",
  "Drainage",
  "Road Damage",
  "Traffic/Safety",
  "Other",
] as const;

export type CitizenIssueCategory = (typeof citizenIssueCategories)[number];
export type CitizenIssueStatus = Database["public"]["Enums"]["issue_status"];
export type CitizenIssuePriority = Database["public"]["Enums"]["issue_priority"];
export type CitizenIssueImageRow = Database["public"]["Tables"]["issue_images"]["Row"];

const ISSUE_STATUS_LABELS: Record<CitizenIssueStatus, string> = {
  SUBMITTED: "Pending",
  AI_ANALYZED: "Pending",
  UNDER_REVIEW: "Pending",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CITIZEN_VERIFIED: "Resolved",
  REOPENED: "In Progress",
};

const ISSUE_STATUS_TONES: Record<CitizenIssueStatus, "default" | "success" | "warning" | "danger" | "info"> = {
  SUBMITTED: "warning",
  AI_ANALYZED: "warning",
  UNDER_REVIEW: "warning",
  VERIFIED: "info",
  REJECTED: "danger",
  ASSIGNED: "info",
  IN_PROGRESS: "info",
  RESOLVED: "success",
  CITIZEN_VERIFIED: "success",
  REOPENED: "info",
};

const ISSUE_STATUS_BUCKETS: Partial<Record<CitizenIssueStatus, "pending" | "inProgress" | "resolved">> = {
  SUBMITTED: "pending",
  AI_ANALYZED: "pending",
  UNDER_REVIEW: "pending",
  VERIFIED: "pending",
  ASSIGNED: "inProgress",
  IN_PROGRESS: "inProgress",
  REOPENED: "inProgress",
  RESOLVED: "resolved",
  CITIZEN_VERIFIED: "resolved",
};

export function getCitizenIssueStatusLabel(status: CitizenIssueStatus) {
  return ISSUE_STATUS_LABELS[status];
}

export function getCitizenIssueStatusTone(status: CitizenIssueStatus) {
  return ISSUE_STATUS_TONES[status];
}

export function getCitizenIssueSummaryBucket(status: CitizenIssueStatus) {
  return ISSUE_STATUS_BUCKETS[status] ?? null;
}

export function formatCitizenIssueDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatCitizenIssueDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatCitizenIssuePriority(priority: CitizenIssuePriority) {
  return priority.charAt(0) + priority.slice(1).toLowerCase();
}

export function formatCitizenIssueCoordinates(latitude: string | null, longitude: string | null) {
  if (!latitude || !longitude) {
    return null;
  }

  return `${latitude}, ${longitude}`;
}

export function formatCitizenIssueImageUrl(image: CitizenIssueImageRow | null | undefined) {
  if (!image?.storage_bucket || !image?.storage_path) {
    return null;
  }

  const { data } = supabase.storage.from(image.storage_bucket).getPublicUrl(image.storage_path);
  return data.publicUrl || null;
}

export function pickCitizenIssueThumbnail(issue: {
  issue_images?: CitizenIssueImageRow[] | null;
}) {
  const images = issue.issue_images ?? [];
  if (images.length === 0) return null;

  const preferred =
    images.find((image) => image.image_type === "INITIAL_REPORT") ??
    [...images].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  return formatCitizenIssueImageUrl(preferred);
}
