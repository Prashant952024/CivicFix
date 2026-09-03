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

export function getAiDepartmentRecommendations(issue: {
  title: string;
  description: string;
  category: string;
}): DepartmentRecommendation[] {
  const text = `${issue.title} ${issue.description} ${issue.category}`.toLowerCase();
  const recommendations: DepartmentRecommendation[] = [];

  // Road & Infrastructure
  if (text.includes("pothole") || text.includes("road") || text.includes("footpath") || text.includes("pavement") || text.includes("bridge") || text.includes("asphalt")) {
    recommendations.push({
      departmentName: "Road & Infrastructure",
      confidence: 0.98,
      reason: "Surface degradation, road crater, or pedestrian walkway defect identified.",
    });
  }

  // Water Supply & Sewerage
  if (text.includes("water") || text.includes("leak") || text.includes("pipe") || text.includes("sewage") || text.includes("sewer") || text.includes("pipeline") || text.includes("tap")) {
    recommendations.push({
      departmentName: "Water Supply & Sewerage",
      confidence: text.includes("pothole") ? 0.92 : 0.97,
      reason: "Water pipe rupture, supply leakage, or sewage overflow detected.",
    });
  }

  // Stormwater & Flood Management
  if (text.includes("flood") || text.includes("accumulation") || text.includes("drain") || text.includes("culvert") || text.includes("waterlogging") || text.includes("gutter")) {
    recommendations.push({
      departmentName: "Stormwater & Flood Management",
      confidence: 0.65,
      reason: "Stormwater accumulation or storm runoff drainage blockage suspected.",
    });
  }

  // Waste Management
  if (text.includes("garbage") || text.includes("trash") || text.includes("waste") || text.includes("dump") || text.includes("litter") || text.includes("debris")) {
    recommendations.push({
      departmentName: "Waste Management",
      confidence: 0.96,
      reason: "Accumulated uncollected solid waste or public dumping ground reported.",
    });
  }

  // Electricity & Street Lighting
  if (text.includes("light") || text.includes("lamp") || text.includes("dark") || text.includes("wire") || text.includes("pole") || text.includes("electricity") || text.includes("power")) {
    recommendations.push({
      departmentName: "Electricity & Street Lighting",
      confidence: 0.95,
      reason: "Faulty public luminaire, exposed live cabling, or pole defect identified.",
    });
  }

  // Parks & Horticulture
  if (text.includes("tree") || text.includes("branch") || text.includes("park") || text.includes("garden") || text.includes("plant") || text.includes("lawn")) {
    recommendations.push({
      departmentName: "Parks & Horticulture",
      confidence: 0.91,
      reason: "Fallen tree limbs, public park upkeep, or overgrown roadside greenery.",
    });
  }

  // Public Health & Sanitation
  if (text.includes("mosquito") || text.includes("sanitation") || text.includes("hygiene") || text.includes("smell") || text.includes("odor") || text.includes("toilet") || text.includes("pest")) {
    recommendations.push({
      departmentName: "Public Health & Sanitation",
      confidence: 0.89,
      reason: "Sanitary health risk, vector infestation, or bio-hazard condition.",
    });
  }

  // Traffic & Transport
  if (text.includes("traffic") || text.includes("signal") || text.includes("sign") || text.includes("zebra") || text.includes("crossing") || text.includes("divider")) {
    recommendations.push({
      departmentName: "Traffic & Transport",
      confidence: 0.93,
      reason: "Traffic signal malfunction, damaged transit signage, or lane divider issue.",
    });
  }

  // Animal Control
  if (text.includes("dog") || text.includes("animal") || text.includes("cow") || text.includes("cat") || text.includes("stray") || text.includes("bitten") || text.includes("rabies")) {
    recommendations.push({
      departmentName: "Animal Control",
      confidence: 0.94,
      reason: "Stray animal menace, injured fauna, or public safety intervention needed.",
    });
  }

  // Building & Urban Planning
  if (text.includes("building") || text.includes("wall") || text.includes("encroach") || text.includes("crack") || text.includes("collapse") || text.includes("structure")) {
    recommendations.push({
      departmentName: "Building & Urban Planning",
      confidence: 0.86,
      reason: "Structural hazard or unauthorized municipal space encroachment.",
    });
  }

  // If no recommendations matched, default to category-based recommendation
  if (recommendations.length === 0) {
    recommendations.push({
      departmentName: "Public Works",
      confidence: 0.75,
      reason: "General municipal civil maintenance required.",
    });
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
