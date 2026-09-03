import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Mail,
  Phone,
  RotateCcw,
  Search,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getDepartmentAssignmentStatusLabel, getDepartmentAssignmentStatusTone } from "@/lib/department-issues";
import { supabase } from "@/lib/supabase";

type WorkerProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  employee_id: string | null;
  designation: string | null;
  avatar_url: string | null;
  is_active: boolean;
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
    created_at: string;
    location_text: string | null;
    address_text: string | null;
  } | null;
  worker_assignments?: Array<{
    id: string;
    worker_profile_id: string;
    status: string;
    assigned_at: string;
  }> | null;
};

type WorkerWorkloadSummary = {
  worker: WorkerProfile;
  assignedCount: number;
  inProgressCount: number;
  underReviewCount: number;
  completedCount: number;
  totalActiveCount: number;
  assignedTasks: DepartmentTaskRow[];
};

export function DepartmentWorkersPage() {
  const { profile, status: sessionStatus, error: sessionError } = useAppSession();
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [departmentName, setDepartmentName] = useState<string | null>(null);
  const [tasks, setTasks] = useState<DepartmentTaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [workloadFilter, setWorkloadFilter] = useState<"all" | "available" | "busy" | "overloaded">("all");
  const [refreshNonce, setRefreshNonce] = useState(0);

  const profileId = profile?.id;
  const departmentId = profile?.department_id;
  const sessionProblem = sessionStatus === "error" ? sessionError ?? "CivicFix profile is unavailable." : null;

  useEffect(() => {
    if (sessionStatus !== "ready" || !profileId) {
      return;
    }

    let cancelled = false;

    async function loadDepartmentWorkers() {
      if (!departmentId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const [deptRes, workersRes, tasksRes] = await Promise.all([
        supabase.from("departments").select("name").eq("id", departmentId).maybeSingle(),
        supabase
          .from("profiles")
          .select("id, full_name, email, phone, employee_id, designation, avatar_url, is_active, role:roles!inner(code)")
          .eq("department_id", departmentId)
          .eq("role.code", "FIELD_WORKER")
          .order("full_name", { ascending: true }),
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
              created_at,
              location_text,
              address_text
            ),
            worker_assignments:department_worker_assignments(
              id,
              worker_profile_id,
              status,
              assigned_at
            )
          `,
          )
          .eq("department_id", departmentId),
      ]);

      if (cancelled) return;

      if (workersRes.error || tasksRes.error) {
        if (import.meta.env.DEV) {
          console.error("Department workers load failed", workersRes.error ?? tasksRes.error);
        }
        setError("Unable to load department workforce.");
        setLoading(false);
        return;
      }

      if (deptRes.data) setDepartmentName(deptRes.data.name);
      setWorkers(workersRes.data ?? []);
      setTasks(tasksRes.data ?? []);
      setLoading(false);
    }

    void loadDepartmentWorkers();

    return () => {
      cancelled = true;
    };
  }, [profileId, departmentId, refreshNonce, sessionStatus]);

  const workloadSummaries = useMemo<WorkerWorkloadSummary[]>(() => {
    return workers.map((worker) => {
      const workerTasks = tasks.filter((t) =>
        t.worker_assignments?.some(
          (w) => w.worker_profile_id === worker.id && (w.status === "ASSIGNED" || w.status === "IN_PROGRESS" || w.status === "COMPLETED"),
        ),
      );

      const assignedCount = tasks.filter((t) =>
        t.worker_assignments?.some((w) => w.worker_profile_id === worker.id && w.status === "ASSIGNED" && t.status === "ASSIGNED"),
      ).length;

      const inProgressCount = tasks.filter((t) =>
        t.worker_assignments?.some((w) => w.worker_profile_id === worker.id && (w.status === "IN_PROGRESS" || t.status === "IN_PROGRESS")),
      ).length;

      const underReviewCount = tasks.filter((t) =>
        t.status === "UNDER_REVIEW" && t.worker_assignments?.some((w) => w.worker_profile_id === worker.id),
      ).length;

      const completedCount = tasks.filter((t) =>
        t.status === "COMPLETED" && t.worker_assignments?.some((w) => w.worker_profile_id === worker.id),
      ).length;

      const totalActiveCount = assignedCount + inProgressCount + underReviewCount;

      return {
        worker,
        assignedCount,
        inProgressCount,
        underReviewCount,
        completedCount,
        totalActiveCount,
        assignedTasks: workerTasks,
      };
    });
  }, [workers, tasks]);

  const filteredWorkloads = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return workloadSummaries.filter((w) => {
      const matchesSearch =
        !query ||
        (w.worker.full_name?.toLowerCase().includes(query) ?? false) ||
        (w.worker.email?.toLowerCase().includes(query) ?? false) ||
        (w.worker.employee_id?.toLowerCase().includes(query) ?? false) ||
        (w.worker.designation?.toLowerCase().includes(query) ?? false);

      const matchesWorkload =
        workloadFilter === "all" ||
        (workloadFilter === "available" && w.totalActiveCount <= 2) ||
        (workloadFilter === "busy" && w.totalActiveCount >= 3 && w.totalActiveCount <= 5) ||
        (workloadFilter === "overloaded" && w.totalActiveCount >= 6);

      return matchesSearch && matchesWorkload;
    });
  }, [workloadSummaries, searchQuery, workloadFilter]);

  if (sessionProblem || error) {
    return (
      <EmptyState
        icon={AlertCircle}
        variant="error"
        title="Workforce Unavailable"
        description={sessionProblem ?? error ?? "We could not load your department workers right now."}
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
        tag="Department Workforce"
        title="Field Crew & Workload Distribution"
        description={
          departmentName
            ? `Manage field crew members and monitor active workload balance for ${departmentName}.`
            : "Review staff capacity and dispatch assignments effectively."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm" className="text-xs">
              <Link to="/app/manager/tasks">
                <Briefcase className="h-3.5 w-3.5 mr-1.5" />
                Department Tasks
              </Link>
            </Button>
            <Button asChild size="sm" className="bg-gradient-to-r from-teal-600 to-cyan-600 shadow-sm text-xs">
              <Link to="/app/manager">
                Dashboard Overview
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>
        }
      >
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="rounded-2xl border border-teal-200/80 bg-white/80 px-3.5 py-2 backdrop-blur-sm shadow-sm">
            <span className="text-[10px] uppercase font-bold tracking-wider text-teal-800">Total Workers</span>
            <p className="text-xl font-bold text-teal-900 mt-0.5">{workers.length}</p>
          </div>
          <div className="rounded-2xl border border-sky-200/80 bg-white/80 px-3.5 py-2 backdrop-blur-sm shadow-sm">
            <span className="text-[10px] uppercase font-bold tracking-wider text-sky-800">Active Tasks</span>
            <p className="text-xl font-bold text-sky-900 mt-0.5">
              {workloadSummaries.reduce((acc, curr) => acc + curr.totalActiveCount, 0)}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200/80 bg-white/80 px-3.5 py-2 backdrop-blur-sm shadow-sm">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800">Available Capacity</span>
            <p className="text-xl font-bold text-emerald-900 mt-0.5">
              {workloadSummaries.filter((w) => w.totalActiveCount <= 2).length} Crew
            </p>
          </div>
        </div>
      </PageHeader>

      {/* 2. Search & Capacity Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-border/80 bg-surface/90 p-4 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded-xl border border-border/70 bg-background py-2 pl-10 pr-3.5 text-xs sm:text-sm text-foreground outline-none focus:border-primary/50"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search workers by name, employee ID, designation..."
            value={searchQuery}
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto p-1 rounded-xl bg-muted/40 border border-border/60">
          {(
            [
              { key: "all", label: `All (${workers.length})` },
              { key: "available", label: "Light (0-2)" },
              { key: "busy", label: "Balanced (3-5)" },
              { key: "overloaded", label: "Heavy (6+)" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setWorkloadFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                workloadFilter === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Workers Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-3xl border border-border/60 bg-muted/30" />
          ))}
        </div>
      ) : filteredWorkloads.length === 0 ? (
        <Card className="p-8 text-center rounded-3xl border border-dashed border-border/80">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 border border-teal-200">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-foreground">No field workers found</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            {searchQuery
              ? "No workers matched your search criteria."
              : "No field workers are currently assigned to your municipal department."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredWorkloads.map(({ worker, assignedCount, inProgressCount, underReviewCount, completedCount, totalActiveCount, assignedTasks }) => {
            const capacityTone =
              totalActiveCount <= 2 ? "success" : totalActiveCount <= 5 ? "info" : "danger";
            const capacityLabel =
              totalActiveCount <= 2 ? "Light Load" : totalActiveCount <= 5 ? "Balanced Load" : "High Capacity";

            return (
              <Card
                key={worker.id}
                className="overflow-hidden rounded-3xl border border-border/80 bg-surface/95 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="p-5 space-y-4">
                  {/* Worker Profile Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-sky-100 text-teal-800 font-bold text-sm shadow-sm">
                        {worker.full_name
                          ? worker.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                          : "FW"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-foreground text-sm truncate">{worker.full_name || "Field Worker"}</p>
                        <p className="text-xs text-teal-700 font-medium truncate">{worker.designation || "Field Technician"}</p>
                        {worker.employee_id && (
                          <span className="font-mono text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-md mt-0.5 inline-block">
                            {worker.employee_id}
                          </span>
                        )}
                      </div>
                    </div>

                    <Badge variant={capacityTone} size="sm">
                      {capacityLabel}
                    </Badge>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1 text-xs text-muted-foreground pt-1 border-t border-border/60">
                    {worker.email && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                        <span className="truncate">{worker.email}</span>
                      </div>
                    )}
                    {worker.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                        <span>{worker.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Workload Meter */}
                  <div className="space-y-1.5 pt-2 border-t border-border/60">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-muted-foreground">Active Workload</span>
                      <span className="text-foreground">{totalActiveCount} Tasks</span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] pt-1">
                      <div className="rounded-xl border border-sky-200/80 bg-sky-50/70 p-1.5">
                        <span className="text-sky-700 block font-semibold">Assigned</span>
                        <span className="font-bold text-sky-900 text-xs">{assignedCount}</span>
                      </div>
                      <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-1.5">
                        <span className="text-amber-700 block font-semibold">In Progress</span>
                        <span className="font-bold text-amber-900 text-xs">{inProgressCount}</span>
                      </div>
                      <div className="rounded-xl border border-violet-200/80 bg-violet-50/70 p-1.5">
                        <span className="text-violet-700 block font-semibold">Review</span>
                        <span className="font-bold text-violet-900 text-xs">{underReviewCount}</span>
                      </div>
                      <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-1.5">
                        <span className="text-emerald-700 block font-semibold">Done</span>
                        <span className="font-bold text-emerald-900 text-xs">{completedCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Active Tasks Preview */}
                  {assignedTasks.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recent Task Focus</p>
                      <div className="space-y-1">
                        {assignedTasks.slice(0, 2).map((t) => (
                          <Link
                            key={t.id}
                            to={`/app/manager/tasks/${t.id}`}
                            className="flex items-center justify-between p-2 rounded-xl bg-background/70 border border-border/70 hover:border-teal-300 transition text-xs group"
                          >
                            <span className="font-medium text-foreground truncate max-w-[180px]">
                              {t.issue?.title || "Department Task"}
                            </span>
                            <Badge variant={getDepartmentAssignmentStatusTone(t.status)} size="sm">
                              {getDepartmentAssignmentStatusLabel(t.status)}
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-muted/20 border-t border-border/60 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {worker.is_active ? "● Active Staff" : "○ Inactive"}
                  </span>
                  <Button asChild size="sm" variant="ghost" className="text-xs h-7 text-teal-800 hover:text-teal-950 font-semibold">
                    <Link to={`/app/manager/tasks?worker=${worker.id}`}>
                      View All Assigned Tasks →
                    </Link>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
