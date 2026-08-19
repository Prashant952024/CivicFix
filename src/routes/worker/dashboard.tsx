import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, Bell, CheckCircle2, ClipboardList, Gauge, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { CitizenEmptyState } from "@/components/citizen/citizen-empty-state";
import { IssueImage } from "@/components/issues/issue-image";
import { Button } from "@/components/ui/button";
import {
  formatWorkerIssueDateTime,
  formatWorkerIssuePriority,
  formatWorkerIssueCoordinates,
  getWorkerIssuePriorityTone,
  getWorkerIssueStatusLabel,
  getWorkerIssueStatusTone,
  pickWorkerIssueThumbnail,
  type WorkerDepartmentRow,
  type WorkerIssueImageRow,
  type WorkerProfileRow,
} from "@/lib/worker-issues";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type WorkerAssignmentCard = Pick<
  Database["public"]["Tables"]["issue_assignments"]["Row"],
  "id" | "issue_id" | "department_id" | "worker_id" | "assigned_by_profile_id" | "status" | "assigned_at" | "unassigned_at"
> & {
  issue?: Pick<
    Database["public"]["Tables"]["issues"]["Row"],
    | "id"
    | "title"
    | "description"
    | "category"
    | "priority"
    | "status"
    | "latitude"
    | "longitude"
    | "location_text"
    | "address_text"
    | "created_at"
    | "updated_at"
  > & {
    issue_images?: WorkerIssueImageRow[] | null;
  } | null;
  department?: Pick<WorkerDepartmentRow, "id" | "name"> | null;
  assigned_by?: Pick<WorkerProfileRow, "id" | "full_name" | "email"> | null;
  worker?: Pick<WorkerProfileRow, "id" | "full_name" | "email"> | null;
};

function badgeToneClasses(tone: "default" | "success" | "warning" | "danger" | "info") {
  return tone === "success"
    ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20"
    : tone === "warning"
      ? "bg-amber-500/10 text-amber-300 ring-amber-500/20"
      : tone === "danger"
        ? "bg-red-500/10 text-red-300 ring-red-500/20"
        : tone === "info"
          ? "bg-blue-500/10 text-blue-300 ring-blue-500/20"
          : "bg-slate-500/10 text-slate-300 ring-slate-500/20";
}

function isCompletedStatus(status: Database["public"]["Enums"]["issue_status"]) {
  return status === "RESOLVED" || status === "CITIZEN_VERIFIED";
}

export function WorkerDashboardPage() {
  const { profile, status: sessionStatus, error: sessionError } = useAppSession();
  const [assignments, setAssignments] = useState<WorkerAssignmentCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const profileId = profile?.id;
  const sessionProblem = sessionStatus === "error" ? sessionError ?? "CivicFix profile is unavailable." : null;

  useEffect(() => {
    if (sessionStatus !== "ready" || !profileId) {
      return;
    }

    const currentProfileId = profileId;
    let cancelled = false;

    async function loadAssignments() {
      setLoading(true);
      setError(null);

      const { data, error: loadError } = await supabase
        .from("issue_assignments")
        .select(
          `
          id,
          issue_id,
          department_id,
          worker_id,
          assigned_by_profile_id,
          status,
          assigned_at,
          unassigned_at,
          department:departments(id, name),
          assigned_by:profiles!issue_assignments_assigned_by_profile_id_fkey(id, full_name, email),
          worker:profiles!issue_assignments_worker_id_fkey(id, full_name, email),
          issue:issues(
            id,
            title,
            description,
            category,
            priority,
            status,
            latitude,
            longitude,
            location_text,
            address_text,
            created_at,
            updated_at,
            issue_images(id, storage_bucket, storage_path, image_type, created_at)
          )
        `,
        )
        .eq("worker_id", currentProfileId)
        .is("unassigned_at", null)
        .order("assigned_at", { ascending: false });

      if (cancelled) {
        return;
      }

      if (loadError) {
        if (import.meta.env.DEV) {
          console.error("Worker dashboard load failed", loadError);
        }
        setError("Unable to load your assigned issues right now.");
        setAssignments([]);
        setLoading(false);
        return;
      }

      setAssignments((data ?? []) as WorkerAssignmentCard[]);
      setLoading(false);
    }

    void loadAssignments();

    return () => {
      cancelled = true;
    };
  }, [profileId, refreshNonce, sessionStatus]);

  const stats = useMemo(() => {
    const issues = assignments.map((assignment) => assignment.issue).filter(Boolean) as NonNullable<WorkerAssignmentCard["issue"]>[];

    return {
      assigned: issues.length,
      inProgress: issues.filter((issue) => issue.status === "IN_PROGRESS").length,
      completed: issues.filter((issue) => isCompletedStatus(issue.status)).length,
      highPriority: issues.filter((issue) => issue.priority === "HIGH" || issue.priority === "URGENT").length,
    };
  }, [assignments]);

  const recentAssignments = useMemo(
    () =>
      [...assignments]
        .filter((assignment) => assignment.issue)
        .sort((a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime())
        .slice(0, 6),
    [assignments],
  );

  if (sessionProblem || error) {
    return (
      <section className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-black/20">
        <div className="max-w-2xl space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Unable to load worker dashboard</h2>
            <p className="text-sm leading-6 text-muted-foreground">{sessionProblem ?? error}</p>
          </div>
          <Button onClick={() => setRefreshNonce((value) => value + 1)} type="button">
            Try Again
          </Button>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-black/20">
          <div className="space-y-3">
            <div className="h-4 w-44 animate-pulse rounded-full bg-muted/60" />
            <div className="h-9 w-full max-w-3xl animate-pulse rounded-2xl bg-muted/60" />
            <div className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-muted/40" />
          </div>
        </section>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-[1.5rem] border border-border/80 bg-surface/90" />
          ))}
        </section>
        <section className="space-y-4">
          <div className="h-6 w-44 animate-pulse rounded-full bg-muted/50" />
          <div className="grid gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-40 animate-pulse rounded-[1.5rem] border border-border/80 bg-surface/90" />
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[1.75rem] border border-border/80 bg-surface/90 shadow-lg shadow-black/20">
        <div className="border-b border-border/70 bg-gradient-to-r from-background/30 to-background/5 px-6 py-5">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center rounded-full border border-border/70 bg-background/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Field worker workspace
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight text-foreground">Field Worker Dashboard</h2>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  Your live assignment queue, progress snapshots, and the tasks ready to be completed today.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/40 px-4 py-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" aria-hidden="true" />
                Live assignment queue
              </div>
              <Button asChild>
                <Link to="/app/worker/assigned-issues">
                  Open work queue
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Assigned Issues", value: stats.assigned, icon: ClipboardList, tone: "default" as const },
          { label: "In Progress", value: stats.inProgress, icon: Gauge, tone: "info" as const },
          { label: "Completed", value: stats.completed, icon: CheckCircle2, tone: "success" as const },
          { label: "High Priority", value: stats.highPriority, icon: Bell, tone: "warning" as const },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border border-border/80 bg-surface/90 p-5 shadow-sm shadow-black/10">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <span
                className={[
                  "inline-flex h-9 w-9 items-center justify-center rounded-full",
                  tone === "success"
                    ? "bg-emerald-500/10 text-emerald-300"
                    : tone === "warning"
                      ? "bg-amber-500/10 text-amber-300"
                      : tone === "info"
                        ? "bg-blue-500/10 text-blue-300"
                        : "bg-primary/10 text-primary",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">My Assigned Issues</p>
              <h3 className="mt-1 text-xl font-semibold text-foreground">Recent work queue</h3>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/app/worker/assigned-issues">View all</Link>
            </Button>
          </div>

          <div className="mt-6 space-y-3">
            {recentAssignments.length > 0 ? (
              recentAssignments.map((assignment) => {
                const issue = assignment.issue;
                if (!issue) {
                  return null;
                }

                const thumbnail = pickWorkerIssueThumbnail(issue);
                const location = formatWorkerIssueCoordinates(issue.latitude, issue.longitude);

                return (
                  <Link
                    key={assignment.id}
                    className="block rounded-2xl border border-border/70 bg-surface-elevated p-4 transition hover:border-primary/40 hover:bg-background/40"
                    to={`/app/worker/assigned-issues/${issue.id}`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex gap-4">
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-border/70 bg-background/30">
                          {thumbnail ? (
                            <IssueImage alt={issue.title} className="h-full w-full rounded-none" src={thumbnail} variant="thumbnail" />
                          ) : (
                            <div className="flex h-full items-center justify-center px-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              No image
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${badgeToneClasses(getWorkerIssueStatusTone(issue.status))}`}>
                              {getWorkerIssueStatusLabel(issue.status)}
                            </span>
                            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${badgeToneClasses(getWorkerIssuePriorityTone(issue.priority))}`}>
                              Priority {formatWorkerIssuePriority(issue.priority)}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-lg font-semibold tracking-tight text-foreground">{issue.title}</h4>
                            <p className="text-sm leading-6 text-muted-foreground">{issue.category}</p>
                          </div>
                        </div>
                      </div>

                      <div className="text-sm text-muted-foreground lg:text-right">
                        <p>{formatWorkerIssueDateTime(assignment.assigned_at)}</p>
                        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">Assigned</p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-border/70 bg-background/30 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Location</p>
                        <p className="mt-2 text-sm font-medium text-foreground">{location ?? "No GPS captured"}</p>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-background/30 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Department</p>
                        <p className="mt-2 text-sm font-medium text-foreground">{assignment.department?.name ?? "Unassigned"}</p>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-background/30 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Assigned by</p>
                        <p className="mt-2 text-sm font-medium text-foreground">
                          {assignment.assigned_by?.full_name?.trim() || assignment.assigned_by?.email || "Municipal officer"}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <CitizenEmptyState
                description="You do not have any active assigned issues right now. When municipal officers route work to you, it will appear here."
                primaryActionHref="/app/worker/assigned-issues"
                primaryActionLabel="Open Work Queue"
                title="No assigned issues yet"
              />
            )}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-black/20">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Workflow</p>
          <div className="mt-4 grid gap-3">
            {["ASSIGNED", "IN_PROGRESS", "RESOLVED"].map((step, index) => (
              <div key={step} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-surface-elevated px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {index + 1}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{step}</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Field execution</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
