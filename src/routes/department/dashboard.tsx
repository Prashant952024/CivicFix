import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  Flame,
  MapPin,
  RotateCcw,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  formatCitizenIssueDate,
  formatCitizenIssuePriority,
} from "@/lib/department-issues";
import { supabase } from "@/lib/supabase";

type DepartmentInfo = {
  id: string;
  name: string;
  description: string | null;
};

type DepartmentTaskRow = {
  id: string;
  issue_id: string;
  department_id: string;
  status: "ASSIGNED" | "IN_PROGRESS" | "UNDER_REVIEW" | "COMPLETED" | "REJECTED" | "REOPENED";
  assigned_at: string;
  completed_at: string | null;
  issue: {
    id: string;
    title: string;
    category: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    created_at: string;
    location_text: string | null;
    address_text: string | null;
    issue_images?: Array<{
      id: string;
      storage_bucket: string;
      storage_path: string;
      image_type: "INITIAL_REPORT" | "RESOLUTION_EVIDENCE";
    }> | null;
  } | null;
  worker_assignments?: Array<{
    id: string;
    worker_profile_id: string;
    status: string;
    assigned_at: string;
    worker?: { id: string; full_name: string | null; email: string | null; employee_id?: string | null } | null;
  }> | null;
};

type DepartmentWorkerRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  employee_id: string | null;
  designation: string | null;
  is_active: boolean;
};

export function DepartmentDashboardPage() {
  const { profile, status: sessionStatus, error: sessionError } = useAppSession();
  const [department, setDepartment] = useState<DepartmentInfo | null>(null);
  const [tasks, setTasks] = useState<DepartmentTaskRow[]>([]);
  const [workers, setWorkers] = useState<DepartmentWorkerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  // Quick Assign Worker Dialog State
  const [assignTargetTask, setAssignTargetTask] = useState<DepartmentTaskRow | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const profileId = profile?.id;
  const departmentId = profile?.department_id;
  const sessionProblem = sessionStatus === "error" ? sessionError ?? "CivicFix profile is unavailable." : null;

  useEffect(() => {
    if (sessionStatus !== "ready" || !profileId) {
      return;
    }

    let cancelled = false;

    async function loadDepartmentData() {
      if (!departmentId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const [deptRes, tasksRes, workersRes] = await Promise.all([
        supabase
          .from("departments")
          .select("id, name, description")
          .eq("id", departmentId)
          .maybeSingle(),
        supabase
          .from("issue_department_assignments")
          .select(
            `
            id,
            issue_id,
            department_id,
            status,
            assigned_at,
            completed_at,
            issue:issues(
              id,
              title,
              category,
              priority,
              severity,
              created_at,
              location_text,
              address_text,
              issue_images(id, storage_bucket, storage_path, image_type)
            ),
            worker_assignments:department_worker_assignments(
              id,
              worker_profile_id,
              status,
              assigned_at,
              worker:profiles!department_worker_assignments_worker_profile_id_fkey(
                id,
                full_name,
                email,
                employee_id
              )
            )
          `,
          )
          .eq("department_id", departmentId)
          .order("assigned_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("id, full_name, email, phone, employee_id, designation, is_active, role:roles!inner(code)")
          .eq("department_id", departmentId)
          .eq("role.code", "FIELD_WORKER")
          .eq("is_active", true)
          .order("full_name", { ascending: true }),
      ]);

      if (cancelled) {
        return;
      }

      if (deptRes.error || tasksRes.error) {
        if (import.meta.env.DEV) {
          console.error("Department dashboard load failed", deptRes.error ?? tasksRes.error);
        }
        setError("Unable to load department operations right now.");
        setLoading(false);
        return;
      }

      setDepartment(deptRes.data);
      setTasks(tasksRes.data ?? []);
      setWorkers(workersRes.data ?? []);
      setLoading(false);
    }

    void loadDepartmentData();

    return () => {
      cancelled = true;
    };
  }, [profileId, departmentId, refreshNonce, sessionStatus]);

  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const unassignedTasks = tasks.filter((t) => {
      const activeWorker = t.worker_assignments?.find(
        (w) => w.status === "ASSIGNED" || w.status === "IN_PROGRESS",
      );
      return !activeWorker && t.status !== "COMPLETED";
    }).length;
    const assignedTasks = tasks.filter((t) => {
      const activeWorker = t.worker_assignments?.find(
        (w) => w.status === "ASSIGNED" || w.status === "IN_PROGRESS",
      );
      return Boolean(activeWorker) && t.status !== "COMPLETED";
    }).length;
    const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const underReviewTasks = tasks.filter((t) => t.status === "UNDER_REVIEW").length;
    const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;
    const reworkTasks = tasks.filter((t) => t.status === "REJECTED" || t.status === "REOPENED").length;

    return {
      totalTasks,
      unassignedTasks,
      assignedTasks,
      inProgressTasks,
      underReviewTasks,
      completedTasks,
      reworkTasks,
      workerCount: workers.length,
    };
  }, [tasks, workers]);

  const tasksNeedingWorker = useMemo(() => {
    return tasks
      .filter((t) => {
        const activeWorker = t.worker_assignments?.find(
          (w) => w.status === "ASSIGNED" || w.status === "IN_PROGRESS",
        );
        return !activeWorker && t.status !== "COMPLETED";
      })
      .slice(0, 5);
  }, [tasks]);

  const tasksAwaitingReview = useMemo(() => {
    return tasks.filter((t) => t.status === "UNDER_REVIEW").slice(0, 5);
  }, [tasks]);

  const workerWorkloads = useMemo(() => {
    return workers.map((w) => {
      const activeCount = tasks.filter(
        (t) =>
          t.status !== "COMPLETED" &&
          t.worker_assignments?.some(
            (wa) => wa.worker_profile_id === w.id && (wa.status === "ASSIGNED" || wa.status === "IN_PROGRESS"),
          ),
      ).length;
      return { worker: w, activeCount };
    });
  }, [workers, tasks]);

  async function handleAssignWorkerSubmit() {
    if (!assignTargetTask || !profileId || !selectedWorkerId || assignSubmitting) {
      return;
    }

    setAssignSubmitting(true);
    setAssignError(null);

    try {
      // 1. Reassign any existing active assignments for this task to avoid unique constraint collisions
      await supabase
        .from("department_worker_assignments")
        .update({ status: "REASSIGNED", updated_at: new Date().toISOString() })
        .eq("issue_department_assignment_id", assignTargetTask.id)
        .in("status", ["ASSIGNED", "IN_PROGRESS"]);

      // 2. Insert new assignment into department_worker_assignments
      const { error: insertError } = await supabase.from("department_worker_assignments").insert({
        issue_department_assignment_id: assignTargetTask.id,
        worker_profile_id: selectedWorkerId,
        assigned_by_profile_id: profileId,
        status: "ASSIGNED",
      });

      if (insertError) throw insertError;

      // 3. Update status of issue_department_assignments if needed
      if (assignTargetTask.status === "ASSIGNED" || assignTargetTask.status === "REOPENED") {
        await supabase
          .from("issue_department_assignments")
          .update({ status: "ASSIGNED", updated_at: new Date().toISOString() })
          .eq("id", assignTargetTask.id);
      }

      // 4. Send notification to field worker
      await supabase.from("notifications").insert({
        recipient_profile_id: selectedWorkerId,
        notification_type: "ASSIGNMENT",
        title: "New Field Task Assigned",
        message: `You have been assigned to task "${assignTargetTask.issue?.title || "Department Work"}".`,
        related_issue_id: assignTargetTask.issue_id,
        is_read: false,
      });

      setAssignTargetTask(null);
      setSelectedWorkerId("");
      setRefreshNonce((v) => v + 1);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error("Assign worker error", err);
      }
      setAssignError(err instanceof Error ? err.message : "Failed to assign worker.");
    } finally {
      setAssignSubmitting(false);
    }
  }

  if (sessionProblem || error) {
    return (
      <EmptyState
        icon={AlertCircle}
        variant="error"
        title="Department Portal Unavailable"
        description={sessionProblem ?? error ?? "We could not load your department operations."}
        action={
          <Button onClick={() => setRefreshNonce((v) => v + 1)} type="button">
            <RotateCcw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        }
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-44 w-full animate-pulse rounded-[1.85rem] border border-teal-100/80 bg-teal-50/40" />
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        tag="Department Operations"
        title={department?.name ? `${department.name} · Management Portal` : "Department Manager Portal"}
        description={
          department?.description ||
          "Manage departmental dispatch, assign field workers, review completed repairs, and balance team capacity."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm" className="text-xs">
              <Link to="/app/manager/workers">
                <Users className="h-3.5 w-3.5 mr-1.5" />
                Crew & Workload ({workers.length})
              </Link>
            </Button>
            <Button asChild size="sm" className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 shadow-sm text-xs">
              <Link to="/app/manager/tasks">
                <Briefcase className="h-3.5 w-3.5 mr-1.5" />
                All Department Tasks
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
          {department?.name && (
            <div className="flex items-center gap-2 rounded-2xl border border-teal-200/80 bg-teal-50/80 px-3.5 py-1.5 font-bold text-teal-900 shadow-sm">
              <Building2 className="h-4 w-4 text-teal-700" />
              <span>{department.name}</span>
            </div>
          )}
          {profile?.full_name && (
            <div className="rounded-2xl border border-border/80 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-sm">
              Manager: <span className="text-teal-700">{profile.full_name}</span>
            </div>
          )}
        </div>
      </PageHeader>

      {/* 2. Full 7 KPI Cards */}
      <section className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
        <Link to="/app/manager/tasks" className="block group">
          <div className="rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50/70 via-white to-teal-50/50 p-3.5 shadow-sm group-hover:shadow-md transition">
            <p className="text-[10px] font-bold uppercase tracking-wider text-sky-800">Total Tasks</p>
            <p className="text-2xl font-bold text-sky-950 mt-1">{stats.totalTasks}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Department queue</p>
          </div>
        </Link>

        <Link to="/app/manager/tasks?filter=unassigned" className="block group">
          <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/50 p-3.5 shadow-sm group-hover:shadow-md transition">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Unassigned</p>
            <p className="text-2xl font-bold text-amber-950 mt-1">{stats.unassignedTasks}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Needs worker</p>
          </div>
        </Link>

        <Link to="/app/manager/tasks?filter=assigned" className="block group">
          <div className="rounded-2xl border border-sky-200/80 bg-gradient-to-br from-teal-50/70 via-white to-cyan-50/50 p-3.5 shadow-sm group-hover:shadow-md transition">
            <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800">Assigned</p>
            <p className="text-2xl font-bold text-teal-950 mt-1">{stats.assignedTasks}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Dispatched</p>
          </div>
        </Link>

        <Link to="/app/manager/tasks?filter=inProgress" className="block group">
          <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 via-white to-yellow-50/50 p-3.5 shadow-sm group-hover:shadow-md transition">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">In Progress</p>
            <p className="text-2xl font-bold text-amber-950 mt-1">{stats.inProgressTasks}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Under repair</p>
          </div>
        </Link>

        <Link to="/app/manager/tasks?filter=underReview" className="block group">
          <div className="rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50/70 via-white to-fuchsia-50/50 p-3.5 shadow-sm group-hover:shadow-md transition">
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-800">Awaiting Review</p>
            <p className="text-2xl font-bold text-violet-950 mt-1">{stats.underReviewTasks}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Evidence submitted</p>
          </div>
        </Link>

        <Link to="/app/manager/tasks?filter=completed" className="block group">
          <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/50 p-3.5 shadow-sm group-hover:shadow-md transition">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Completed</p>
            <p className="text-2xl font-bold text-emerald-950 mt-1">{stats.completedTasks}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Signed off</p>
          </div>
        </Link>

        <Link to="/app/manager/tasks?filter=rework" className="block group">
          <div className="rounded-2xl border border-rose-200/80 bg-gradient-to-br from-rose-50/70 via-white to-red-50/50 p-3.5 shadow-sm group-hover:shadow-md transition">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-800">Rework</p>
            <p className="text-2xl font-bold text-rose-950 mt-1">{stats.reworkTasks}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Revisions needed</p>
          </div>
        </Link>
      </section>

      {/* 3. High Priority: Tasks Awaiting Worker Assignment */}
      {tasksNeedingWorker.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
                <Flame className="h-4 w-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">Tasks Awaiting Worker Assignment</h2>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {stats.unassignedTasks} unassigned {stats.unassignedTasks === 1 ? "task" : "tasks"}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tasksNeedingWorker.map((task) => {
              const location =
                task.issue?.address_text?.trim() ||
                task.issue?.location_text?.trim() ||
                "Location recorded";

              return (
                <Card
                  key={task.id}
                  className="overflow-hidden rounded-3xl border border-amber-200/90 bg-gradient-to-br from-amber-50/30 via-surface to-white p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-[10px] font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                        #{task.issue_id.slice(0, 8).toUpperCase()}
                      </span>
                      {task.issue && (
                        <Badge variant={formatCitizenIssuePriority(task.issue.priority) === "High" || task.issue.priority === "URGENT" ? "danger" : "warning"} size="sm">
                          {formatCitizenIssuePriority(task.issue.priority)} Priority
                        </Badge>
                      )}
                    </div>

                    <div>
                      <p className="font-bold text-foreground text-sm line-clamp-1">{task.issue?.title || "Department Task"}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{location}</span>
                      </p>
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      Assigned: {formatCitizenIssueDate(task.assigned_at)}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-border/60 mt-3 flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setAssignTargetTask(task);
                        setSelectedWorkerId("");
                        setAssignError(null);
                      }}
                      className="bg-gradient-to-r from-teal-600 to-cyan-600 text-xs h-8 shadow-sm font-semibold"
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                      Assign Worker
                    </Button>
                    <Button asChild size="sm" variant="ghost" className="text-xs h-8 text-muted-foreground hover:text-foreground">
                      <Link to={`/app/manager/tasks/${task.id}`}>
                        Details →
                      </Link>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. High Priority: Tasks Awaiting Manager Review */}
      {tasksAwaitingReview.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-violet-700">
                <Clock className="h-4 w-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">Completion Evidence Awaiting Sign-Off</h2>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {stats.underReviewTasks} submitted {stats.underReviewTasks === 1 ? "task" : "tasks"}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tasksAwaitingReview.map((task) => {
              const activeWorker = task.worker_assignments?.[0]?.worker;
              return (
                <Card
                  key={task.id}
                  className="overflow-hidden rounded-3xl border border-violet-200/90 bg-gradient-to-br from-violet-50/40 via-surface to-white p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="violet" size="sm">
                        Under Review
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {formatCitizenIssueDate(task.assigned_at)}
                      </span>
                    </div>

                    <div>
                      <p className="font-bold text-foreground text-sm line-clamp-1">{task.issue?.title || "Department Task"}</p>
                      <p className="text-xs text-teal-800 font-medium mt-1">
                        Worker: {activeWorker?.full_name || activeWorker?.email || "Assigned Crew"}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/60 mt-3 flex items-center justify-between gap-2">
                    <Button asChild size="sm" className="bg-gradient-to-r from-violet-600 to-indigo-600 text-xs h-8 shadow-sm font-semibold">
                      <Link to={`/app/manager/tasks/${task.id}`}>
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        Review Evidence
                      </Link>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. Workload Balance & Quick Summary */}
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-start">
        {/* Left: Department Crew Workload */}
        <Card className="rounded-3xl border border-border/80 bg-surface/95 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 text-teal-700">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Field Crew Workload Capacity</h3>
                <p className="text-xs text-muted-foreground">{workers.length} active technicians in department</p>
              </div>
            </div>
            <Button asChild size="sm" variant="ghost" className="text-xs h-7 text-teal-800 font-semibold">
              <Link to="/app/manager/workers">Manage Crew →</Link>
            </Button>
          </div>

          <div className="space-y-2.5">
            {workerWorkloads.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No field workers registered in this department.</p>
            ) : (
              workerWorkloads.slice(0, 5).map(({ worker, activeCount }) => {
                const capacityTone = activeCount <= 2 ? "success" : activeCount <= 5 ? "info" : "danger";
                return (
                  <div
                    key={worker.id}
                    className="flex items-center justify-between p-3 rounded-2xl border border-border/60 bg-background/60 hover:bg-muted/30 transition text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-800 font-bold border border-teal-200 text-xs">
                        {worker.full_name ? worker.full_name[0].toUpperCase() : "W"}
                      </div>
                      <div className="truncate">
                        <p className="font-bold text-foreground truncate">{worker.full_name || "Field Worker"}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{worker.designation || "Field Technician"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-medium text-foreground">{activeCount} active tasks</span>
                      <Badge variant={capacityTone} size="sm">
                        {activeCount <= 2 ? "Light" : activeCount <= 5 ? "Balanced" : "Heavy"}
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Right: Department Operations Quick Guide */}
        <Card className="rounded-3xl border border-border/80 bg-surface/95 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 text-sky-700">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Department Dispatch Guidelines</h3>
              <p className="text-xs text-muted-foreground">Standard operating procedure</p>
            </div>
          </div>

          <div className="space-y-3 text-xs leading-relaxed text-muted-foreground">
            <div className="flex gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 font-bold text-[10px] text-teal-800">1</span>
              <p><strong className="text-foreground">Dispatch:</strong> Assign unassigned tasks to eligible field crew in your department.</p>
            </div>
            <div className="flex gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 font-bold text-[10px] text-teal-800">2</span>
              <p><strong className="text-foreground">Field Execution:</strong> Workers start repairs and capture photo completion evidence.</p>
            </div>
            <div className="flex gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 font-bold text-[10px] text-teal-800">3</span>
              <p><strong className="text-foreground">Manager Sign-Off:</strong> Review evidence photos and approve completed work or request rework with clear feedback.</p>
            </div>
          </div>
        </Card>
      </section>

      {/* Quick Assign Worker Modal */}
      {assignTargetTask && (
        <Dialog open={Boolean(assignTargetTask)} onClose={() => setAssignTargetTask(null)}>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-foreground">Assign Field Worker</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Task: <strong className="text-foreground">{assignTargetTask.issue?.title || "Department Task"}</strong>
              </p>
            </div>

            {assignError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800">
                {assignError}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Select Department Worker ({workers.length} eligible)
              </label>

              {workers.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3 rounded-xl border border-dashed border-border/80 text-center">
                  No active field workers found in your department.
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {workers.map((worker) => {
                    const isSelected = selectedWorkerId === worker.id;
                    const activeCount = tasks.filter(
                      (t) =>
                        t.status !== "COMPLETED" &&
                        t.worker_assignments?.some(
                          (wa) => wa.worker_profile_id === worker.id && (wa.status === "ASSIGNED" || wa.status === "IN_PROGRESS"),
                        ),
                    ).length;

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

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-semibold text-muted-foreground">{activeCount} active</span>
                          {isSelected && <CheckCircle2 className="h-4 w-4 text-teal-600" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
              <Button type="button" variant="outline" size="sm" onClick={() => setAssignTargetTask(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!selectedWorkerId || assignSubmitting}
                onClick={() => void handleAssignWorkerSubmit()}
                className="bg-gradient-to-r from-teal-600 to-cyan-600 shadow-sm"
              >
                {assignSubmitting ? "Assigning..." : "Confirm Assignment"}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
