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

export type OfficerIssueDepartmentAssignmentRow = Database["public"]["Tables"]["issue_department_assignments"]["Row"] & {
  department?: Pick<OfficerDepartmentRow, "id" | "name" | "is_active"> | null;
  worker_assignments?: Array<
    Database["public"]["Tables"]["department_worker_assignments"]["Row"] & {
      worker?: Pick<OfficerProfileRow, "id" | "full_name" | "email" | "phone"> | null;
    }
  > | null;
};

export type DepartmentRecommendation = {
  departmentName: string;
  confidence: number;
  reason: string;
};

export function getAiDepartmentRecommendations(
  issue: {
    title: string;
    description: string;
    category: string;
  },
  activeDepartments: OfficerDepartmentRow[] = [],
): DepartmentRecommendation[] {
  if (activeDepartments.length === 0) {
    return [];
  }

  const text = `${issue.title} ${issue.description} ${issue.category}`.toLowerCase();
  const words = text
    .split(/[\s,._\-/]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2);

  const recommendations: DepartmentRecommendation[] = [];

  for (const dept of activeDepartments) {
    if (!dept.is_active) continue;

    const deptNameClean = dept.name.toLowerCase();
    const deptDescClean = (dept.description || "").toLowerCase();
    const deptCodeClean = (dept.code || "").toLowerCase().replace(/_/g, " ");

    let score = 0;
    const matchReasons: string[] = [];

    // Exact or strong substring match
    if (text.includes(deptNameClean)) {
      score += 0.9;
      matchReasons.push(`matches "${dept.name}"`);
    }

    // Keyword & description token matches
    const deptTokens = `${deptNameClean} ${deptCodeClean} ${deptDescClean}`
      .split(/[\s,._\-/]+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 2);

    for (const w of words) {
      if (deptTokens.includes(w)) {
        score += 0.3;
        if (matchReasons.length === 0) {
          matchReasons.push(`related keyword "${w}"`);
        }
      }
    }

    if (score > 0) {
      const confidence = Math.min(0.98, Math.max(0.6, Number(score.toFixed(2))));
      recommendations.push({
        departmentName: dept.name,
        confidence,
        reason:
          matchReasons.length > 0
            ? `Relevant to ${dept.name} (${matchReasons.join(", ")}) based on report content.`
            : `Keyword match for ${dept.name}.`,
      });
    }
  }

  return recommendations.sort((a, b) => b.confidence - a.confidence);
}

export function getDepartmentAssignmentStatusLabel(
  status: Database["public"]["Enums"]["department_assignment_status"],
) {
  switch (status) {
    case "ASSIGNED":
      return "Assigned";
    case "IN_PROGRESS":
      return "In Progress";
    case "UNDER_REVIEW":
      return "Under Review";
    case "COMPLETED":
      return "Completed";
    case "REJECTED":
      return "Rejected";
    case "REOPENED":
      return "Reopened";
    default:
      return status;
  }
}

export function getDepartmentAssignmentStatusTone(
  status: Database["public"]["Enums"]["department_assignment_status"],
): "default" | "success" | "warning" | "danger" | "info" {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "UNDER_REVIEW":
      return "warning";
    case "IN_PROGRESS":
      return "info";
    case "REJECTED":
      return "danger";
    case "ASSIGNED":
    case "REOPENED":
    default:
      return "info";
  }
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
