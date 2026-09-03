import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  HardHat,
  MapPin,
  RotateCcw,
  Search,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  formatCitizenIssuePriority,
  getDepartmentAssignmentStatusLabel,
  getDepartmentAssignmentStatusTone,
} from "@/lib/department-issues";
import { supabase } from "@/lib/supabase";

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
  } | null;
  worker_assignments?: Array<{
    id: string;
    worker_profile_id: string;
    status: string;
    worker?: { id: string; full_name: string | null; email: string | null; employee_id?: string | null } | null;
  }> | null;
};

type DepartmentWorkerRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  employee_id: string | null;
  designation: string | null;
  is_active: boolean;
};

type StatusFilterKey = "all" | "unassigned" | "assigned" | "inProgress" | "underReview" | "completed" | "rework";
type SortOrder = "newest" | "oldest" | "priority";

export function DepartmentIssuesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, status: sessionStatus, error: sessionError } = useAppSession();
  const [tasks, setTasks] = useState<DepartmentTaskRow[]>([]);
  const [workers, setWorkers] = useState<DepartmentWorkerRow[]>([]);
  const [departmentName, setDepartmentName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "LOW" | "MEDIUM" | "HIGH" | "URGENT">("all");
  const [workerFilter, setWorkerFilter] = useState<string>(searchParams.get("worker") || "all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  const activeTab = (searchParams.get("filter") as StatusFilterKey) || "all";
  const setActiveTab = (tab: StatusFilterKey) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === "all") {
        next.delete("filter");
      } else {
        next.set("filter", tab);
      }
      return next;
    });
  };

  // Assign Worker Dialog
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

    async function loadTasksAndWorkers() {
      if (!departmentId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const [deptRes, tasksRes, workersRes] = await Promise.all([
        supabase.from("departments").select("name").eq("id", departmentId).maybeSingle(),
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
              address_text
            ),
            worker_assignments:department_worker_assignments(
              id,
              worker_profile_id,
              status,
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
          .select("id, full_name, email, employee_id, designation, is_active, role:roles!inner(code)")
          .eq("department_id", departmentId)
          .eq("role.code", "FIELD_WORKER")
          .eq("is_active", true)
          .order("full_name", { ascending: true }),
      ]);

      if (cancelled) return;

      if (tasksRes.error || workersRes.error) {
        if (import.meta.env.DEV) {
          console.error("Department tasks load failed", tasksRes.error ?? workersRes.error);
        }
        setError("Unable to load department tasks right now.");
        setTasks([]);
        setLoading(false);
        return;
      }

      if (deptRes.data) setDepartmentName(deptRes.data.name);
      setTasks(tasksRes.data ?? []);
      setWorkers(workersRes.data ?? []);
      setLoading(false);
    }

    void loadTasksAndWorkers();

    return () => {
      cancelled = true;
    };
  }, [profileId, departmentId, refreshNonce, sessionStatus]);

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return tasks
      .filter((task) => {
        // Tab Status Filter
        const activeWorker = task.worker_assignments?.find(
          (w) => w.status === "ASSIGNED" || w.status === "IN_PROGRESS",
        );

        if (activeTab === "unassigned" && (Boolean(activeWorker) || task.status === "COMPLETED")) return false;
        if (activeTab === "assigned" && (!activeWorker || task.status === "COMPLETED")) return false;
        if (activeTab === "inProgress" && task.status !== "IN_PROGRESS") return false;
        if (activeTab === "underReview" && task.status !== "UNDER_REVIEW") return false;
        if (activeTab === "completed" && task.status !== "COMPLETED") return false;
        if (activeTab === "rework" && task.status !== "REJECTED" && task.status !== "REOPENED") return false;

        // Priority Filter
        if (priorityFilter !== "all" && task.issue?.priority !== priorityFilter) return false;

        // Worker Filter
        if (workerFilter !== "all") {
          const hasWorker = task.worker_assignments?.some((w) => w.worker_profile_id === workerFilter);
          if (!hasWorker) return false;
        }

        // Search Query
        if (query) {
          const title = task.issue?.title?.toLowerCase() || "";
          const location = (task.issue?.address_text || task.issue?.location_text || "").toLowerCase();
          const issueId = task.issue_id.toLowerCase();
          const assignedWorker = task.worker_assignments?.[0]?.worker?.full_name?.toLowerCase() || "";
          if (!title.includes(query) && !location.includes(query) && !issueId.includes(query) && !assignedWorker.includes(query)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === "oldest") return new Date(a.assigned_at).getTime() - new Date(b.assigned_at).getTime();
        if (sortOrder === "priority") {
          const rank = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
          return (rank[b.issue?.priority || "LOW"] || 0) - (rank[a.issue?.priority || "LOW"] || 0);
        }
        return new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime();
      });
  }, [tasks, activeTab, priorityFilter, workerFilter, searchQuery, sortOrder]);

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
        title="Tasks Unavailable"
        description={sessionProblem ?? error ?? "We could not load department tasks."}
        action={
          <Button onClick={() => setRefreshNonce((v) => v + 1)} type="button">
            <RotateCcw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        tag="Department Dispatch"
        title="Department Tasks Queue"
        description={
          departmentName
            ? `Active municipal repair tasks assigned to ${departmentName}.`
            : "Review, filter, dispatch, and sign off on departmental field tasks."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm" className="text-xs">
              <Link to="/app/manager/workers">
                <Users className="h-3.5 w-3.5 mr-1.5" />
                Crew Workload
              </Link>
            </Button>
            <Button asChild size="sm" className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 text-xs shadow-sm">
              <Link to="/app/manager">
                Dashboard
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>
        }
      />

      {/* 2. Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-muted/40 border border-border/60">
        {(
          [
            { key: "all", label: `All Tasks (${tasks.length})` },
            {
              key: "unassigned",
              label: `Unassigned (${tasks.filter((t) => !t.worker_assignments?.some((w) => w.status === "ASSIGNED" || w.status === "IN_PROGRESS") && t.status !== "COMPLETED").length})`,
            },
            {
              key: "assigned",
              label: `Assigned (${tasks.filter((t) => t.worker_assignments?.some((w) => w.status === "ASSIGNED" || w.status === "IN_PROGRESS") && t.status !== "COMPLETED").length})`,
            },
            {
              key: "inProgress",
              label: `In Progress (${tasks.filter((t) => t.status === "IN_PROGRESS").length})`,
            },
            {
              key: "underReview",
              label: `Awaiting Review (${tasks.filter((t) => t.status === "UNDER_REVIEW").length})`,
            },
            {
              key: "completed",
              label: `Completed (${tasks.filter((t) => t.status === "COMPLETED").length})`,
            },
            {
              key: "rework",
              label: `Rework (${tasks.filter((t) => t.status === "REJECTED" || t.status === "REOPENED").length})`,
            },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
              activeTab === tab.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. Search & Multi-Filter Bar */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 rounded-2xl border border-border/80 bg-surface/90 p-4 shadow-sm">
        {/* Search Input */}
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded-xl border border-border/70 bg-background py-2 pl-10 pr-3.5 text-xs sm:text-sm text-foreground outline-none focus:border-primary/50"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks by title, location, ID, worker..."
            value={searchQuery}
          />
        </div>

        {/* Priority Filter */}
        <select
          className="rounded-xl border border-border/70 bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50"
          onChange={(e) => setPriorityFilter(e.target.value as "all" | "LOW" | "MEDIUM" | "HIGH" | "URGENT")}
          value={priorityFilter}
        >
          <option value="all">All Priorities</option>
          <option value="URGENT">Urgent Priority</option>
          <option value="HIGH">High Priority</option>
          <option value="MEDIUM">Medium Priority</option>
          <option value="LOW">Low Priority</option>
        </select>

        {/* Worker Filter */}
        <select
          className="rounded-xl border border-border/70 bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50"
          onChange={(e) => setWorkerFilter(e.target.value)}
          value={workerFilter}
        >
          <option value="all">All Field Workers</option>
          {workers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.full_name || w.email}
            </option>
          ))}
        </select>

        {/* Sort Order */}
        <select
          className="rounded-xl border border-border/70 bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 sm:col-span-2 lg:col-span-4"
          onChange={(e) => setSortOrder(e.target.value as SortOrder)}
          value={sortOrder}
        >
          <option value="newest">Sort by: Newest Assigned</option>
          <option value="oldest">Sort by: Oldest Assigned</option>
          <option value="priority">Sort by: Highest Priority</option>
        </select>
      </div>

      {/* 4. Tasks List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-3xl border border-border/60 bg-muted/30" />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <Card className="p-8 text-center rounded-3xl border border-dashed border-border/80">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 border border-teal-200">
            <Briefcase className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-foreground">No tasks match your filters</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            Try adjusting your search query, priority, or status filters.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.map((task) => {
            const activeWorker = task.worker_assignments?.find(
              (w) => w.status === "ASSIGNED" || w.status === "IN_PROGRESS",
            )?.worker;

            const isUnderReview = task.status === "UNDER_REVIEW";
            const isUnassigned = !activeWorker && task.status !== "COMPLETED";

            return (
              <Card
                key={task.id}
                className="overflow-hidden rounded-3xl border border-border/80 bg-surface/95 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant={getDepartmentAssignmentStatusTone(task.status)} size="sm">
                      {getDepartmentAssignmentStatusLabel(task.status)}
                    </Badge>
                    {task.issue && (
                      <Badge variant={formatCitizenIssuePriority(task.issue.priority) === "High" || task.issue.priority === "URGENT" ? "danger" : "outline"} size="sm">
                        {formatCitizenIssuePriority(task.issue.priority)} Priority
                      </Badge>
                    )}
                  </div>

                  <div>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      #{task.issue_id.slice(0, 8).toUpperCase()}
                    </span>
                    <h4 className="font-bold text-foreground text-sm line-clamp-1">{task.issue?.title || "Department Task"}</h4>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{task.issue?.address_text || task.issue?.location_text || "Location recorded"}</span>
                    </p>
                  </div>

                  {/* Worker Assignment Info */}
                  <div className="p-2.5 rounded-2xl bg-muted/30 border border-border/60 text-xs">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Assigned Worker</span>
                    {activeWorker ? (
                      <p className="font-bold text-teal-900 flex items-center gap-1.5 mt-0.5">
                        <HardHat className="h-3.5 w-3.5 text-teal-700 shrink-0" />
                        <span className="truncate">{activeWorker.full_name || activeWorker.email}</span>
                      </p>
                    ) : (
                      <p className="font-semibold text-amber-800 flex items-center gap-1.5 mt-0.5">
                        <UserPlus className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        Awaiting Worker Assignment
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-border/60 mt-3 flex items-center justify-between gap-2">
                  {isUnassigned ? (
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
                  ) : isUnderReview ? (
                    <Button asChild size="sm" className="bg-gradient-to-r from-violet-600 to-indigo-600 text-xs h-8 shadow-sm font-semibold">
                      <Link to={`/app/manager/tasks/${task.id}`}>
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        Review Work
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild size="sm" variant="outline" className="text-xs h-8">
                      <Link to={`/app/manager/tasks/${task.id}`}>
                        View Details
                      </Link>
                    </Button>
                  )}

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
      )}

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
