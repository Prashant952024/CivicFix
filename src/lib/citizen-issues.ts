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
export type CitizenNotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
export type CitizenResolutionVerificationRow = Database["public"]["Tables"]["resolution_verifications"]["Row"];
export type CitizenIssueHistoryRow = Database["public"]["Tables"]["issue_status_history"]["Row"];

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

const ISSUE_STATUS_ORDER: Record<CitizenIssueStatus, number> = {
  SUBMITTED: 0,
  AI_ANALYZED: 1,
  UNDER_REVIEW: 2,
  VERIFIED: 3,
  REJECTED: 4,
  ASSIGNED: 5,
  IN_PROGRESS: 6,
  RESOLVED: 7,
  CITIZEN_VERIFIED: 8,
  REOPENED: 9,
};

const ISSUE_PRIORITY_LABELS: Record<CitizenIssuePriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

const ISSUE_PRIORITY_TONES: Record<CitizenIssuePriority, "default" | "success" | "warning" | "danger" | "info"> = {
  LOW: "success",
  MEDIUM: "info",
  HIGH: "warning",
  URGENT: "danger",
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

export function getCitizenIssueStatusOrder(status: CitizenIssueStatus) {
  return ISSUE_STATUS_ORDER[status];
}

export type CitizenIssueStatusFilterBucket =
  | "all"
  | "pending"
  | "verified"
  | "inProgress"
  | "resolved"
  | "reopened"
  | "rejected";

export function getCitizenIssueStatusFilterBucket(status: CitizenIssueStatus): Exclude<CitizenIssueStatusFilterBucket, "all"> {
  switch (status) {
    case "SUBMITTED":
    case "AI_ANALYZED":
    case "UNDER_REVIEW":
      return "pending";
    case "VERIFIED":
      return "verified";
    case "ASSIGNED":
    case "IN_PROGRESS":
      return "inProgress";
    case "RESOLVED":
    case "CITIZEN_VERIFIED":
      return "resolved";
    case "REOPENED":
      return "reopened";
    case "REJECTED":
      return "rejected";
    default:
      return "pending";
  }
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
  return ISSUE_PRIORITY_LABELS[priority];
}

export function getCitizenIssuePriorityTone(priority: CitizenIssuePriority) {
  return ISSUE_PRIORITY_TONES[priority];
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

export function sortCitizenIssueImagesByCreatedAtDesc<T extends CitizenIssueImageRow>(images: T[]) {
  return [...images].sort((a, b) => {
    const createdAtDelta = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (createdAtDelta !== 0) {
      return createdAtDelta;
    }

    return b.id.localeCompare(a.id);
  });
}

export function pickCitizenIssueImageByTypeLatest<
  T extends {
    issue_images?: CitizenIssueImageRow[] | null;
  },
>(issue: T, imageType: CitizenIssueImageRow["image_type"]) {
  const images = issue.issue_images ?? [];
  return sortCitizenIssueImagesByCreatedAtDesc(images).find((image) => image.image_type === imageType) ?? null;
}

export function pickCitizenIssueLatestImage<T extends { issue_images?: CitizenIssueImageRow[] | null }>(issue: T) {
  const images = issue.issue_images ?? [];
  return sortCitizenIssueImagesByCreatedAtDesc(images)[0] ?? null;
}

export function pickCitizenIssueThumbnail(issue: {
  issue_images?: CitizenIssueImageRow[] | null;
}) {
  const images = issue.issue_images ?? [];
  if (images.length === 0) return null;

  const preferred =
    pickCitizenIssueImageByTypeLatest(issue, "INITIAL_REPORT") ??
    pickCitizenIssueLatestImage(issue);

  return formatCitizenIssueImageUrl(preferred);
}

export function pickCitizenIssueImageByType(
  issue: {
    issue_images?: CitizenIssueImageRow[] | null;
  },
  imageType: CitizenIssueImageRow["image_type"],
) {
  return pickCitizenIssueImageByTypeLatest(issue, imageType);
}

export function isCitizenIssueResolvedLike(status: CitizenIssueStatus) {
  return status === "RESOLVED" || status === "CITIZEN_VERIFIED";
}

export function isCitizenIssueInProgressLike(status: CitizenIssueStatus) {
  return status === "ASSIGNED" || status === "IN_PROGRESS" || status === "REOPENED";
}

export function getCitizenIssueStatusBannerLabel(status: CitizenIssueStatus) {
  if (status === "CITIZEN_VERIFIED") {
    return "Verified";
  }

  return getCitizenIssueStatusLabel(status);
}
