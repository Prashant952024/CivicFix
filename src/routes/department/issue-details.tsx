import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  ExternalLink,
  HardHat,
  Layers,
  MapPin,
  RotateCcw,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { IssueImage } from "@/components/issues/issue-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatCitizenIssueDateTime } from "@/lib/citizen-issues";
import {
  formatCitizenIssueDate,
  formatCitizenIssuePriority,
  getDepartmentAssignmentStatusLabel,
  getDepartmentAssignmentStatusTone,
} from "@/lib/department-issues";
import { supabase } from "@/lib/supabase";

type TaskDetail = {
  id: string;
  issue_id: string;
  department_id: string;
  status: "ASSIGNED" | "IN_PROGRESS" | "UNDER_REVIEW" | "COMPLETED" | "REJECTED" | "REOPENED";
  notes: string | null;
  assigned_at: string;
  completed_at: string | null;
  reviewed_at: string | null;
  department: { id: string; name: string };
  issue: {
    id: string;
    title: string;
    description: string | null;
    category: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    status: string;
    latitude: number | null;
    longitude: number | null;
    location_text: string | null;
    address_text: string | null;
    created_at: string;
    updated_at: string;
    issue_images?: Array<{
      id: string;
      storage_bucket: string;
      storage_path: string;
      image_type: "INITIAL_REPORT" | "RESOLUTION_EVIDENCE";
      created_at: string;
    }> | null;
    reporter_profile?: {
      id: string;
      full_name: string | null;
      email: string | null;
      phone: string | null;
    } | null;
  };
  worker_assignments?: Array<{
    id: string;
    worker_profile_id: string;
    status: string;
    notes: string | null;
    assigned_at: string;
    started_at: string | null;
    completed_at: string | null;
    worker?: {
      id: string;
      full_name: string | null;
      email: string | null;
      phone: string | null;
      employee_id?: string | null;
      designation?: string | null;
    } | null;
  }> | null;
};

type SiblingAssignment = {
  id: string;
  department_id: string;
  status: "ASSIGNED" | "IN_PROGRESS" | "UNDER_REVIEW" | "COMPLETED" | "REJECTED" | "REOPENED";
  department: { name: string } | null;
};

type DepartmentWorker = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  employee_id: string | null;
  designation: string | null;
};

export function DepartmentIssueDetailsPage() {
  const { taskId, issueId } = useParams<{ taskId?: string; issueId?: string }>();
  const { profile, status: sessionStatus, error: sessionError } = useAppSession();

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [siblingAssignments, setSiblingAssignments] = useState<SiblingAssignment[]>([]);
  const [departmentWorkers, setDepartmentWorkers] = useState<DepartmentWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  // Assign Worker Dialog State
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Review Actions State
  const [reworkDialogOpen, setReworkDialogOpen] = useState(false);
  const [reworkFeedback, setReworkFeedback] = useState("");
  const [actionState, setActionState] = useState<"idle" | "approving" | "reworking">("idle");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const profileId = profile?.id;
  const departmentId = profile?.department_id;
  const sessionProblem = sessionStatus === "error" ? sessionError ?? "CivicFix profile is unavailable." : null;
  const lookupId = taskId || issueId;

  useEffect(() => {
    if (sessionStatus !== "ready" || !profileId || !lookupId) {
      return;
    }

    let cancelled = false;

    async function loadTaskDetail() {
      if (!departmentId) {
        setError("You must belong to a department to view tasks.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      // 1. Try querying by task assignment id, or by issue_id + department_id
      const taskQuery = supabase
        .from("issue_department_assignments")
        .select(
          `
          id,
          issue_id,
          department_id,
          status,
          notes,
          assigned_at,
          completed_at,
          reviewed_at,
          department:departments(id, name),
          issue:issues(
            id,
            title,
            description,
            category,
            severity,
            priority,
            status,
            latitude,
            longitude,
            location_text,
            address_text,
            created_at,
            updated_at,
            issue_images(id, storage_bucket, storage_path, image_type, created_at),
            reporter_profile:profiles!issues_reporter_profile_id_fkey(id, full_name, email, phone)
          ),
          worker_assignments:department_worker_assignments(
            id,
            worker_profile_id,
            status,
            notes,
            assigned_at,
            started_at,
            completed_at,
            worker:profiles!department_worker_assignments_worker_profile_id_fkey(
              id,
              full_name,
              email,
              phone,
              employee_id,
              designation
            )
          )
        `,
        );

      // If lookupId is a UUID or matches assignment ID
      const { data: primaryData } = await taskQuery.eq("id", lookupId!).maybeSingle();

      let taskData = primaryData;
      if (!taskData) {
        // Fallback: search by issue_id and manager's department_id
        const { data: fallbackData, error: fallbackError } = await taskQuery
          .eq("issue_id", lookupId!)
          .eq("department_id", departmentId)
          .maybeSingle();

        if (fallbackError) {
          if (import.meta.env.DEV) console.error("Fallback load failed", fallbackError);
        }
        taskData = fallbackData;
      }

      if (cancelled) return;

      if (!taskData) {
        setError("This task could not be found or does not belong to your department.");
        setLoading(false);
        return;
      }

      const parsedTask = taskData as unknown as TaskDetail;

      // Verify department isolation
      if (parsedTask.department_id !== departmentId) {
        setError("This task belongs to another municipal department.");
        setLoading(false);
        return;
      }

      // Load sibling assignments for multi-department overview & department workers
      const [siblingsRes, workersRes] = await Promise.all([
        supabase
          .from("issue_department_assignments")
          .select("id, department_id, status, department:departments(name)")
          .eq("issue_id", parsedTask.issue_id),
        supabase
          .from("profiles")
          .select("id, full_name, email, phone, employee_id, designation, role:roles!inner(code)")
          .eq("department_id", departmentId)
          .eq("role.code", "FIELD_WORKER")
          .eq("is_active", true)
          .order("full_name", { ascending: true }),
      ]);

      if (cancelled) return;

      setTask(parsedTask);
      setSiblingAssignments(siblingsRes.data ?? []);
      setDepartmentWorkers(workersRes.data ?? []);

      const activeWorker = parsedTask.worker_assignments?.find(
        (w) => w.status === "ASSIGNED" || w.status === "IN_PROGRESS",
      );
      if (activeWorker) {
        setSelectedWorkerId(activeWorker.worker_profile_id);
      }

      setLoading(false);
    }

    void loadTaskDetail();

    return () => {
      cancelled = true;
    };
  }, [lookupId, profileId, departmentId, refreshNonce, sessionStatus]);

  const activeWorkerAssignment = useMemo(() => {
    return task?.worker_assignments?.find(
      (w) => w.status === "ASSIGNED" || w.status === "IN_PROGRESS" || w.status === "COMPLETED",
    );
  }, [task]);

  const resolutionImages = useMemo(() => {
    return (task?.issue.issue_images ?? []).filter(
      (img) => img.image_type === "RESOLUTION_EVIDENCE",
    );
  }, [task]);

  const initialImages = useMemo(() => {
    return (task?.issue.issue_images ?? []).filter(
      (img) => img.image_type === "INITIAL_REPORT",
    );
  }, [task]);

  function formatImageUrl(image: { storage_bucket: string; storage_path: string }) {
    const { data } = supabase.storage
      .from(image.storage_bucket)
      .getPublicUrl(image.storage_path);
    return data.publicUrl;
  }

  async function handleAssignWorker() {
    if (!task || !profileId || !selectedWorkerId || assignSubmitting) return;

    setAssignSubmitting(true);
    setAssignError(null);

    try {
      // 1. Reassign any existing active assignments for this task to avoid unique constraint collisions
      await supabase
        .from("department_worker_assignments")
        .update({ status: "REASSIGNED", updated_at: new Date().toISOString() })
        .eq("issue_department_assignment_id", task.id)
        .in("status", ["ASSIGNED", "IN_PROGRESS"]);

      // 2. Insert new worker assignment
      const { error: workerAssignError } = await supabase
        .from("department_worker_assignments")
        .insert({
          issue_department_assignment_id: task.id,
          worker_profile_id: selectedWorkerId,
          assigned_by_profile_id: profileId,
          status: "ASSIGNED",
        });

      if (workerAssignError) throw workerAssignError;

      // 3. Update status of issue_department_assignments if needed
      if (task.status === "ASSIGNED" || task.status === "REOPENED") {
        await supabase
          .from("issue_department_assignments")
          .update({ status: "ASSIGNED", updated_at: new Date().toISOString() })
          .eq("id", task.id);
      }

      // 4. Send notification to field worker
      await supabase.from("notifications").insert({
        recipient_profile_id: selectedWorkerId,
        notification_type: "ASSIGNMENT",
        title: "New Field Task Assigned",
        message: `You have been assigned to task "${task.issue.title}".`,
        related_issue_id: task.issue_id,
        is_read: false,
      });

      setAssignDialogOpen(false);
      setActionSuccess("Worker assigned successfully.");
      setRefreshNonce((v) => v + 1);
    } catch (err) {
      if (import.meta.env.DEV) console.error("Worker assignment failed", err);
      setAssignError(err instanceof Error ? err.message : "Failed to assign worker.");
    } finally {
      setAssignSubmitting(false);
    }
  }

  async function handleApproveTask() {
    if (!task || !profileId || actionState !== "idle") return;

    setActionError(null);
    setActionSuccess(null);
    setActionState("approving");

    try {
      const now = new Date().toISOString();

      // 1. Update issue_department_assignments to COMPLETED
      const { error: deptError } = await supabase
        .from("issue_department_assignments")
        .update({
          status: "COMPLETED",
          completed_at: now,
          reviewed_at: now,
        })
        .eq("id", task.id);

      if (deptError) throw deptError;

      // 2. Update worker assignment to COMPLETED
      if (activeWorkerAssignment) {
        await supabase
          .from("department_worker_assignments")
          .update({
            status: "COMPLETED",
            completed_at: now,
          })
          .eq("id", activeWorkerAssignment.id);
      }

      // 3. Status History
      await supabase.from("issue_status_history").insert({
        issue_id: task.issue_id,
        old_status: "UNDER_REVIEW",
        new_status: "PARTIALLY_COMPLETED",
        changed_by_profile_id: profileId,
        notes: `Department Manager approved completed repairs for ${task.department.name}.`,
      });

      // 4. Notify Worker
      if (activeWorkerAssignment?.worker_profile_id) {
        await supabase.from("notifications").insert({
          recipient_profile_id: activeWorkerAssignment.worker_profile_id,
          notification_type: "VERIFICATION",
          title: "Repairs Approved",
          message: `Your work on "${task.issue.title}" has been approved by the Department Manager.`,
          related_issue_id: task.issue_id,
          is_read: false,
        });
      }

      setActionSuccess("Department task approved successfully!");
      setRefreshNonce((v) => v + 1);
    } catch (err) {
      if (import.meta.env.DEV) console.error("Approve failed", err);
      setActionError(err instanceof Error ? err.message : "Failed to approve task.");
    } finally {
      setActionState("idle");
    }
  }

  async function handleRequestRework() {
    if (!task || !profileId || !reworkFeedback.trim() || actionState !== "idle") return;

    setActionError(null);
    setActionSuccess(null);
    setActionState("reworking");

    try {
      // 1. Update issue_department_assignments to REJECTED (Rework required)
      const { error: deptError } = await supabase
        .from("issue_department_assignments")
        .update({
          status: "REJECTED",
          notes: reworkFeedback.trim(),
        })
        .eq("id", task.id);

      if (deptError) throw deptError;

      // 2. Status History
      await supabase.from("issue_status_history").insert({
        issue_id: task.issue_id,
        old_status: "UNDER_REVIEW",
        new_status: "REJECTED",
        changed_by_profile_id: profileId,
        notes: `Department Manager requested rework: ${reworkFeedback.trim()}`,
      });

      // 3. Notify Worker
      if (activeWorkerAssignment?.worker_profile_id) {
        await supabase.from("notifications").insert({
          recipient_profile_id: activeWorkerAssignment.worker_profile_id,
          notification_type: "STATUS_CHANGE",
          title: "Rework Requested on Field Task",
          message: `Manager feedback: ${reworkFeedback.trim()}`,
          related_issue_id: task.issue_id,
          is_read: false,
        });
      }

      setReworkDialogOpen(false);
      setReworkFeedback("");
      setActionSuccess("Rework feedback sent to worker.");
      setRefreshNonce((v) => v + 1);
    } catch (err) {
      if (import.meta.env.DEV) console.error("Rework request failed", err);
      setActionError(err instanceof Error ? err.message : "Failed to request rework.");
    } finally {
      setActionState("idle");
    }
  }

  if (sessionProblem || error) {
    return (
      <EmptyState
        icon={AlertCircle}
        variant="error"
        title="Task Detail Unavailable"
        description={sessionProblem ?? error ?? "We could not load this department task."}
        action={
          <div className="flex gap-2">
            <Button onClick={() => setRefreshNonce((v) => v + 1)} type="button">
              <RotateCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button asChild variant="outline">
              <Link to="/app/manager/tasks">Back to Tasks</Link>
            </Button>
          </div>
        }
      />
    );
  }

  if (loading || !task) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-muted/40" />
        <div className="h-44 w-full animate-pulse rounded-[1.85rem] border border-teal-100/80 bg-teal-50/40" />
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="h-96 animate-pulse rounded-3xl border border-border/70 bg-muted/30" />
          <div className="h-96 animate-pulse rounded-3xl border border-border/70 bg-muted/30" />
        </div>
      </div>
    );
  }

  const isUnderReview = task.status === "UNDER_REVIEW";
  const isCompleted = task.status === "COMPLETED";
  const isRework = task.status === "REJECTED" || task.status === "REOPENED";
  const assignedWorker = activeWorkerAssignment?.worker;

  return (
    <div className="space-y-6">
      {/* Back Link & Page Title */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="text-xs -ml-2 text-muted-foreground hover:text-foreground">
          <Link to="/app/manager/tasks">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Back to Department Tasks
          </Link>
        </Button>
        <span className="font-mono text-xs text-muted-foreground bg-muted/60 px-2 py-1 rounded-lg">
          TASK: #{task.id.slice(0, 8).toUpperCase()}
        </span>
      </div>

      {actionSuccess && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-900 flex items-center gap-2 shadow-sm">
          <AlertCircle className="h-4 w-4 text-red-700 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Task Header Banner */}
      <PageHeader
        tag={`Department Task · ${task.department.name}`}
        title={task.issue.title}
        description={task.issue.description || "No additional description provided by citizen report."}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={getDepartmentAssignmentStatusTone(task.status)} size="lg">
              {getDepartmentAssignmentStatusLabel(task.status)}
            </Badge>
            <Badge variant={formatCitizenIssuePriority(task.issue.priority) === "High" || task.issue.priority === "URGENT" ? "danger" : "outline"} size="lg">
              {formatCitizenIssuePriority(task.issue.priority)} Priority
            </Badge>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>Assigned: {formatCitizenIssueDate(task.assigned_at)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span>{task.issue.address_text || task.issue.location_text || "Location recorded"}</span>
          </div>
        </div>
      </PageHeader>

      {/* Main Grid: Left = Issue & Multi-Dept Context, Right = Worker Assignment & Review */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] items-start">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Location & Map Card */}
          <Card className="rounded-3xl border border-border/80 bg-surface/95 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4 text-teal-700" />
                Incident Location
              </h3>
              {task.issue.latitude && task.issue.longitude && (
                <a
                  href={`https://www.google.com/maps?q=${task.issue.latitude},${task.issue.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-teal-800 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open Map
                </a>
              )}
            </div>
            <p className="text-xs text-foreground font-medium">
              {task.issue.address_text || task.issue.location_text || "No exact address recorded"}
            </p>
            {task.issue.latitude && task.issue.longitude && (
              <p className="font-mono text-[11px] text-muted-foreground">
                Coordinates: {task.issue.latitude.toFixed(6)}, {task.issue.longitude.toFixed(6)}
              </p>
            )}
          </Card>

          {/* Citizen Initial Photo Evidence */}
          <Card className="rounded-3xl border border-border/80 bg-surface/95 p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
              <Camera className="h-4 w-4 text-teal-700" />
              <h3 className="text-sm font-bold text-foreground">Citizen Report Photo Evidence</h3>
            </div>
            {initialImages.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No citizen photos attached to this report.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {initialImages.map((img) => (
                  <div key={img.id} className="overflow-hidden rounded-2xl border border-border/70 bg-background">
                    <IssueImage
                      alt="Citizen report evidence"
                      className="h-48 w-full"
                      imageClassName="object-cover"
                      src={formatImageUrl(img)}
                      variant="preview"
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Multi-Department Sibling Assignments */}
          <Card className="rounded-3xl border border-border/80 bg-surface/95 p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
              <Layers className="h-4 w-4 text-sky-700" />
              <h3 className="text-sm font-bold text-foreground">Civic Issue Department Assignments</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Overall issue: #{task.issue_id.slice(0, 8).toUpperCase()} ({task.issue.status})
            </p>

            <div className="space-y-2">
              {siblingAssignments.map((sibling) => {
                const isCurrentDept = sibling.department_id === departmentId;
                return (
                  <div
                    key={sibling.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-xs ${
                      isCurrentDept
                        ? "border-teal-300 bg-teal-50/50 font-bold"
                        : "border-border/60 bg-background/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>{sibling.department?.name || "Department"}</span>
                      {isCurrentDept && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full">
                          Your Department
                        </span>
                      )}
                    </div>
                    <Badge variant={getDepartmentAssignmentStatusTone(sibling.status)} size="sm">
                      {getDepartmentAssignmentStatusLabel(sibling.status)}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right Column: Worker Dispatch & Review Controls */}
        <div className="space-y-6">
          {/* Worker Assignment Card */}
          <Card className="rounded-3xl border border-border/80 bg-surface/95 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <HardHat className="h-4 w-4 text-teal-700" />
                <h3 className="text-sm font-bold text-foreground">Field Crew Assignment</h3>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setAssignDialogOpen(true);
                  setAssignError(null);
                }}
                className="text-xs h-7"
              >
                {assignedWorker ? "Reassign" : "Assign Worker"}
              </Button>
            </div>

            {assignedWorker ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-200 text-teal-900 font-bold text-sm">
                    {assignedWorker.full_name ? assignedWorker.full_name[0].toUpperCase() : "W"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-teal-950 text-sm truncate">{assignedWorker.full_name || "Field Worker"}</p>
                    <p className="text-xs text-teal-800 font-medium truncate">{assignedWorker.designation || "Technician"}</p>
                    {assignedWorker.employee_id && (
                      <span className="font-mono text-[10px] text-teal-700 bg-teal-100/80 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                        {assignedWorker.employee_id}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {assignedWorker.email && (
                    <p className="truncate">Email: <strong className="text-foreground">{assignedWorker.email}</strong></p>
                  )}
                  {assignedWorker.phone && (
                    <p>Phone: <strong className="text-foreground">{assignedWorker.phone}</strong></p>
                  )}
                  {activeWorkerAssignment?.assigned_at && (
                    <p>Assigned At: {formatCitizenIssueDateTime(activeWorkerAssignment.assigned_at)}</p>
                  )}
                  {activeWorkerAssignment?.started_at && (
                    <p>Started Work: {formatCitizenIssueDateTime(activeWorkerAssignment.started_at)}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 text-center space-y-2">
                <p className="text-xs font-bold text-amber-900">Awaiting Worker Assignment</p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  No field worker has been assigned to this task yet.
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    setAssignDialogOpen(true);
                    setAssignError(null);
                  }}
                  className="bg-gradient-to-r from-teal-600 to-cyan-600 text-xs shadow-sm font-semibold"
                >
                  <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                  Assign Crew Now
                </Button>
              </div>
            )}
          </Card>

          {/* Review & Resolution Evidence Card */}
          <Card className="rounded-3xl border border-border/80 bg-surface/95 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <Sparkles className="h-4 w-4 text-violet-700" />
              <h3 className="text-sm font-bold text-foreground">Completion Evidence & Sign-Off</h3>
            </div>

            {/* Resolution Images */}
            {resolutionImages.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Worker Submitted Evidence
                </p>
                <div className="grid gap-2">
                  {resolutionImages.map((img) => (
                    <div key={img.id} className="overflow-hidden rounded-2xl border border-border/70 bg-background">
                      <IssueImage
                        alt="Worker completion evidence"
                        className="h-48 w-full"
                        imageClassName="object-contain"
                        src={formatImageUrl(img)}
                        variant="preview"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-2">
                No resolution photo submitted yet by field crew.
              </p>
            )}

            {/* Existing Task Notes / Feedback */}
            {task.notes && (
              <div className="p-3 rounded-2xl border border-border/70 bg-muted/20 text-xs space-y-1">
                <span className="font-semibold text-muted-foreground block">Task Notes:</span>
                <p className="text-foreground leading-relaxed">{task.notes}</p>
              </div>
            )}

            {/* Action Buttons for Manager Review */}
            {isUnderReview && (
              <div className="space-y-2.5 pt-2 border-t border-border/60">
                <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-3 text-xs text-violet-900 font-medium">
                  Worker has submitted repairs for review. Please inspect evidence and choose an action.
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    onClick={() => void handleApproveTask()}
                    disabled={actionState !== "idle"}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 text-xs font-bold shadow-sm"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    {actionState === "approving" ? "Approving..." : "Approve Work"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setReworkDialogOpen(true)}
                    disabled={actionState !== "idle"}
                    className="border-amber-300 text-amber-800 hover:bg-amber-50 text-xs font-bold"
                  >
                    <RotateCcw className="h-4 w-4 mr-1.5 text-amber-600" />
                    Request Rework
                  </Button>
                </div>
              </div>
            )}

            {isCompleted && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs font-semibold text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                <span>Department task approved and marked completed.</span>
              </div>
            )}

            {isRework && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3 text-xs font-semibold text-amber-900 flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-amber-700 shrink-0" />
                <span>Task is currently in rework status awaiting new worker submission.</span>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Assign Worker Modal */}
      {assignDialogOpen && (
        <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)}>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-foreground">Assign Department Field Worker</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Task: <strong className="text-foreground">{task.issue.title}</strong>
              </p>
            </div>

            {assignError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800">
                {assignError}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Select Department Worker ({departmentWorkers.length} eligible)
              </label>

              {departmentWorkers.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3 rounded-xl border border-dashed border-border/80 text-center">
                  No active field workers found in your department.
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {departmentWorkers.map((worker) => {
                    const isSelected = selectedWorkerId === worker.id;

                    return (
                      <button
                        key={worker.id}
                        type="button"
                        onClick={() => setSelectedWorkerId(worker.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition ${
                          isSelected
                            ? "border-teal-500 bg-teal-50/70 ring-2 ring-teal-200"
                            : "border-border/70 hover:bg-muted/20"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-900 font-bold text-xs">
                            {worker.full_name ? worker.full_name[0].toUpperCase() : "W"}
                          </div>
                          <div className="min-w-0 truncate">
                            <p className="font-bold text-foreground text-xs truncate">{worker.full_name || "Field Worker"}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{worker.designation || "Technician"}</p>
                          </div>
                        </div>

                        {isSelected && <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
              <Button type="button" variant="outline" size="sm" onClick={() => setAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!selectedWorkerId || assignSubmitting}
                onClick={() => void handleAssignWorker()}
                className="bg-gradient-to-r from-teal-600 to-cyan-600 shadow-sm"
              >
                {assignSubmitting ? "Assigning..." : "Confirm Assignment"}
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Request Rework Modal */}
      {reworkDialogOpen && (
        <Dialog open={reworkDialogOpen} onClose={() => setReworkDialogOpen(false)}>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-foreground">Request Rework from Field Crew</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Explain clearly what adjustments or additional work are required before approval.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="rework-reason" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Rework Reason & Instructions <span className="text-destructive">*</span>
              </label>
              <textarea
                id="rework-reason"
                className="w-full min-h-[6rem] rounded-2xl border border-border/80 bg-background px-3.5 py-2.5 text-xs sm:text-sm text-foreground outline-none focus:border-primary/50"
                onChange={(e) => setReworkFeedback(e.target.value)}
                placeholder="E.g. Asphalt compaction is incomplete around the edges. Please reseal and provide a new photo."
                value={reworkFeedback}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
              <Button type="button" variant="outline" size="sm" onClick={() => setReworkDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!reworkFeedback.trim() || actionState !== "idle"}
                onClick={() => void handleRequestRework()}
                className="bg-gradient-to-r from-amber-600 to-red-600 text-white shadow-sm font-semibold"
              >
                {actionState === "reworking" ? "Submitting..." : "Send Rework Request"}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
