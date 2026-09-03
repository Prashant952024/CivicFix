import {
  formatCitizenIssueCoordinates,
  formatCitizenIssueDate,
  formatCitizenIssueDateTime,
  formatCitizenIssueImageUrl,
  formatCitizenIssuePriority,
  getCitizenIssueStatusTone,
  getCitizenIssueStatusBannerLabel,
  pickCitizenIssueThumbnail,
  type CitizenIssueImageRow,
} from "@/lib/citizen-issues";
import {
  getDepartmentAssignmentStatusLabel,
  getDepartmentAssignmentStatusTone,
} from "@/lib/officer-issues";
import type { Database } from "@/types/database";

export type DepartmentAssignmentStatus = Database["public"]["Enums"]["department_assignment_status"];
export type WorkerAssignmentStatus = Database["public"]["Enums"]["worker_assignment_status"];

export type DepartmentWorkerOption = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  department_id: string | null;
  active_tasks_count?: number;
};

export type DepartmentTaskDetailRow = Database["public"]["Tables"]["issue_department_assignments"]["Row"] & {
  department?: Pick<Database["public"]["Tables"]["departments"]["Row"], "id" | "name"> | null;
  issue: Pick<
    Database["public"]["Tables"]["issues"]["Row"],
    | "id"
    | "title"
    | "description"
    | "category"
    | "severity"
    | "priority"
    | "status"
    | "latitude"
    | "longitude"
    | "location_text"
    | "address_text"
    | "created_at"
    | "updated_at"
  > & {
    issue_images?: CitizenIssueImageRow[] | null;
    reporter_profile?: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email" | "phone"> | null;
    all_department_assignments?: Array<{
      id: string;
      department_id: string;
      status: DepartmentAssignmentStatus;
      department?: { name: string } | null;
    }> | null;
  };
  worker_assignments?: Array<
    Database["public"]["Tables"]["department_worker_assignments"]["Row"] & {
      worker?: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email" | "phone"> | null;
    }
  > | null;
};

export function formatDepartmentWorkerLabel(worker: Pick<DepartmentWorkerOption, "full_name" | "email" | "id"> | null | undefined) {
  if (!worker) {
    return "Unassigned";
  }

  return worker.full_name?.trim() || worker.email || `Worker ${worker.id.slice(0, 8)}`;
}

export {
  formatCitizenIssueCoordinates,
  formatCitizenIssueDate,
  formatCitizenIssueDateTime,
  formatCitizenIssueImageUrl,
  formatCitizenIssuePriority,
  getCitizenIssueStatusTone,
  getCitizenIssueStatusBannerLabel,
  getDepartmentAssignmentStatusLabel,
  getDepartmentAssignmentStatusTone,
  pickCitizenIssueThumbnail,
};
