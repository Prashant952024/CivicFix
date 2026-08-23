import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Flame,
  HardHat,
  MapPin,
  RefreshCw,
  RotateCcw,
  Sparkles,
  SquarePen,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { IssueImage } from "@/components/issues/issue-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import {
  formatWorkerIssueCoordinates,
  formatWorkerIssueDateTime,
  formatWorkerIssuePriority,
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

function isCompletedStatus(status: Database["public"]["Enums"]["issue_status"]) {
  return status === "RESOLVED" || status === "CITIZEN_VERIFIED";
}

function CompactMetricCard({
  label,
  value,
  caption,
  icon: Icon,
  variant,
}: {
  label: string;
  value: number;
  caption: string;
  icon: LucideIcon;
  variant: "sky" | "amber" | "violet" | "emerald";
}) {
  const styles = {
    sky: {
      card: "border-sky-200/80 bg-gradient-to-br from-sky-50/70 via-white to-teal-50/50",
      icon: "border-sky-200 bg-sky-50 text-sky-700",
      pill: "text-sky-700",
    },
    amber: {
      card: "border-amber-200/80 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/50",
      icon: "border-amber-200 bg-amber-50 text-amber-700",
      pill: "text-amber-700",
    },
    violet: {
      card: "border-violet-200/80 bg-gradient-to-br from-violet-50/70 via-white to-fuchsia-50/50",
      icon: "border-violet-200 bg-violet-50 text-violet-700",
      pill: "text-violet-700",
    },
    emerald: {
      card: "border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/50",
      icon: "border-emerald-200 bg-emerald-50 text-emerald-700",
      pill: "text-emerald-700",
    },
  }[variant];

  return (
    <div className={cn("relative overflow-hidden rounded-[1.5rem] border p-4 sm:p-5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md", styles.card)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{caption}</p>
        </div>
        <div className={cn("rounded-2xl border p-2.5 sm:p-3 shadow-sm shrink-0", styles.icon)}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
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
      notStarted: issues.filter((issue) => issue.status === "ASSIGNED").length,
      inProgress: issues.filter((issue) => issue.status === "IN_PROGRESS").length,
      rework: issues.filter((issue) => issue.status === "REJECTED" || issue.status === "REOPENED").length,
      underReview: issues.filter((issue) => issue.status === "UNDER_REVIEW").length,
      completed: issues.filter((issue) => isCompletedStatus(issue.status)).length,
      critical: issues.filter((issue) => (issue.priority === "HIGH" || issue.priority === "URGENT") && !isCompletedStatus(issue.status)).length,
    };
  }, [assignments]);

  // Actionable issues needing attention right now
  const actionRequiredIssues = useMemo(() => {
    return assignments
      .filter((assignment) => {
        const status = assignment.issue?.status;
        return status === "ASSIGNED" || status === "IN_PROGRESS" || status === "REJECTED" || status === "REOPENED";
      })
      .sort((a, b) => {
        // Prioritize REJECTED, then IN_PROGRESS, then ASSIGNED
        const order: Record<string, number> = { REJECTED: 0, REOPENED: 1, IN_PROGRESS: 2, ASSIGNED: 3 };
        const aStatus = a.issue?.status ?? "ASSIGNED";
        const bStatus = b.issue?.status ?? "ASSIGNED";
        return (order[aStatus] ?? 4) - (order[bStatus] ?? 4);
      })
      .slice(0, 4);
  }, [assignments]);

  // Active / recent work queue
  const activeAssignments = useMemo(
    () =>
      assignments
        .filter((assignment) => assignment.issue && !isCompletedStatus(assignment.issue.status))
        .slice(0, 6),
    [assignments],
  );

  // Completed work
  const completedAssignments = useMemo(
    () =>
      assignments
        .filter((assignment) => assignment.issue && (isCompletedStatus(assignment.issue.status) || assignment.issue.status === "UNDER_REVIEW"))
        .slice(0, 4),
    [assignments],
  );

  if (sessionProblem || error) {
    return (
      <EmptyState
        icon={AlertCircle}
        variant="error"
        title="Unable to load worker dashboard"
        description={sessionProblem ?? error ?? "An error occurred while loading your field tasks."}
        action={
          <Button onClick={() => setRefreshNonce((v) => v + 1)} type="button">
            <RefreshCw className="h-4 w-4 mr-2" />
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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-[1.5rem] border border-border/70 bg-surface/80" />
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-6 w-48 animate-pulse rounded-full bg-muted/50" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="h-44 animate-pulse rounded-[1.6rem] border border-border/70 bg-surface/80" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Operational Header / Hero */}
      <PageHeader
        tag="Field Operations"
        title="Field Worker Dashboard"
        description="Review active assignments, start field tasks, capture resolution photos, and keep urban repairs moving forward."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button asChild className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 shadow-md shadow-teal-950/15">
              <Link to="/app/worker/assigned-issues">
                <HardHat className="h-4 w-4 mr-2" aria-hidden="true" />
                Open Task Queue
                <ArrowRight className="h-4 w-4 ml-1.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        }
      >
        {/* Quick highlight bar within page header */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 pt-2">
          <div className="rounded-2xl border border-sky-200/70 bg-white/75 p-3 backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Total Assigned</p>
            <p className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-foreground">{stats.assigned}</p>
          </div>
          <div className="rounded-2xl border border-amber-200/70 bg-white/75 p-3 backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700">In Progress</p>
            <p className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-foreground">{stats.inProgress}</p>
          </div>
          <div className="rounded-2xl border border-violet-200/70 bg-white/75 p-3 backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-700">Under Review</p>
            <p className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-foreground">{stats.underReview}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200/70 bg-white/75 p-3 backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700">Completed</p>
            <p className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-foreground">{stats.completed}</p>
          </div>
        </div>
      </PageHeader>

      {/* 2. Worker Summary Metrics */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CompactMetricCard
          label="Assigned Tasks"
          value={stats.assigned}
          caption="Open field assignments routed to you"
          icon={ClipboardList}
          variant="sky"
        />
        <CompactMetricCard
          label="Active Work"
          value={stats.inProgress}
          caption="Repairs currently being executed"
          icon={SquarePen}
          variant="amber"
        />
        <CompactMetricCard
          label="Awaiting Review"
          value={stats.underReview}
          caption="Evidence submitted to officer"
          icon={Clock3}
          variant="violet"
        />
        <CompactMetricCard
          label="Resolved / Done"
          value={stats.completed}
          caption="Successfully closed repairs"
          icon={CheckCircle2}
          variant="emerald"
        />
      </section>

      {/* 3. Needs Action Section */}
      {actionRequiredIssues.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
                <Flame className="h-4 w-4" aria-hidden="true" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">Needs Immediate Action</h2>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {actionRequiredIssues.length} actionable {actionRequiredIssues.length === 1 ? "task" : "tasks"}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {actionRequiredIssues.map((assignment) => {
              const issue = assignment.issue;
              if (!issue) return null;

              const isRework = issue.status === "REJECTED" || issue.status === "REOPENED";
              const isInProgress = issue.status === "IN_PROGRESS";
              const location = issue.address_text?.trim() || issue.location_text?.trim() || formatWorkerIssueCoordinates(issue.latitude, issue.longitude);

              return (
                <div
                  key={assignment.id}
                  className={cn(
                    "relative overflow-hidden rounded-[1.5rem] border p-4 sm:p-5 shadow-sm transition-all hover:shadow-md",
                    isRework
                      ? "border-red-200 bg-gradient-to-br from-red-50/80 via-white to-amber-50/50"
                      : isInProgress
                        ? "border-amber-200 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/50"
                        : "border-sky-200 bg-gradient-to-br from-sky-50/80 via-white to-teal-50/50",
                  )}
                >
                  <div className="flex flex-col justify-between h-full space-y-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={getWorkerIssueStatusTone(issue.status)} size="sm">
                          {getWorkerIssueStatusLabel(issue.status)}
                        </Badge>
                        <Badge variant={getWorkerIssuePriorityTone(issue.priority)} size="sm">
                          Priority {formatWorkerIssuePriority(issue.priority)}
                        </Badge>
                        <Badge variant="outline" size="sm">
                          {issue.category}
                        </Badge>
                      </div>

                      <h3 className="text-base font-semibold text-foreground line-clamp-1 break-words">
                        {issue.title}
                      </h3>

                      {location && (
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground line-clamp-1">
                          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                          <span>{location}</span>
                        </p>
                      )}

                      {isRework && (
                        <p className="rounded-xl border border-red-200 bg-red-50/90 px-2.5 py-1.5 text-xs font-medium text-red-800">
                          Officer requested changes. Resume work and provide updated resolution evidence.
                        </p>
                      )}
                      {isInProgress && (
                        <p className="rounded-xl border border-amber-200 bg-amber-50/90 px-2.5 py-1.5 text-xs font-medium text-amber-800">
                          Repair is ongoing. Capture resolution photo once fixed.
                        </p>
                      )}
                    </div>

                    <div className="pt-1">
                      <Button asChild size="sm" className="w-full bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600">
                        <Link to={`/app/worker/assigned-issues/${issue.id}`}>
                          {isRework ? (
                            <>
                              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                              Resume Work
                            </>
                          ) : isInProgress ? (
                            <>
                              <SquarePen className="h-3.5 w-3.5 mr-1.5" />
                              Submit Resolution
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                              Start Work
                            </>
                          )}
                          <ArrowRight className="h-3.5 w-3.5 ml-auto" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. Active Field Work Queue */}
      {activeAssignments.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 text-teal-700">
                <HardHat className="h-4 w-4" aria-hidden="true" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">Active Task Queue</h2>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs text-primary">
              <Link to="/app/worker/assigned-issues">
                View All ({assignments.length})
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-3">
            {activeAssignments.map((assignment) => {
              const issue = assignment.issue;
              if (!issue) return null;

              const thumb = pickWorkerIssueThumbnail(issue);
              const location = issue.address_text?.trim() || issue.location_text?.trim() || formatWorkerIssueCoordinates(issue.latitude, issue.longitude);
              const isCritical = issue.priority === "HIGH" || issue.priority === "URGENT";

              return (
                <Card
                  key={assignment.id}
                  className="overflow-hidden p-0 border border-border/80 bg-surface/90 hover:border-teal-200 transition-all duration-200"
                >
                  <div className="grid gap-0 sm:grid-cols-[11rem_1fr] md:grid-cols-[14rem_1fr]">
                    {/* Bounded Task Thumbnail */}
                    <div className="relative bg-muted/40 sm:border-r border-border/60">
                      {thumb ? (
                        <IssueImage
                          alt={issue.title}
                          className="h-44 sm:h-full w-full min-h-[9rem]"
                          imageClassName="object-cover"
                          src={thumb}
                          variant="card"
                        />
                      ) : (
                        <div className="flex h-36 sm:h-full min-h-[8rem] items-center justify-center bg-slate-50 p-4 text-center">
                          <div className="space-y-1">
                            <ClipboardList className="mx-auto h-5 w-5 text-muted-foreground/60" aria-hidden="true" />
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">No Photo</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Task Information */}
                    <div className="flex flex-col justify-between p-4 sm:p-5 space-y-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant={getWorkerIssueStatusTone(issue.status)} size="sm">
                            {getWorkerIssueStatusLabel(issue.status)}
                          </Badge>
                          <Badge variant={isCritical ? "danger" : getWorkerIssuePriorityTone(issue.priority)} size="sm">
                            {formatWorkerIssuePriority(issue.priority)} Priority
                          </Badge>
                          <Badge variant="outline" size="sm">
                            {issue.category}
                          </Badge>
                        </div>

                        <div>
                          <h3 className="text-base sm:text-lg font-bold text-foreground break-words line-clamp-2">
                            {issue.title}
                          </h3>
                          <p className="mt-1 text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                            {issue.description}
                          </p>
                        </div>

                        {location && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                            <span className="truncate">{location}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-border/50">
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span>Assigned {formatWorkerIssueDateTime(assignment.assigned_at)}</span>
                          {assignment.department?.name && (
                            <>
                              <span>•</span>
                              <span>{assignment.department.name}</span>
                            </>
                          )}
                        </div>

                        <Button asChild size="sm" className="w-full sm:w-auto bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600">
                          <Link to={`/app/worker/assigned-issues/${issue.id}`}>
                            Open Issue
                            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      ) : (
        <EmptyState
          icon={HardHat}
          title="All Caught Up!"
          description="You currently have no active field tasks assigned. New tasks routed to you will appear here."
          action={
            <Button asChild variant="outline">
              <Link to="/app/worker/assigned-issues">View All Assigned Issues</Link>
            </Button>
          }
        />
      )}

      {/* 5. Recently Completed / Under Review Section (Calmer visual weight) */}
      {completedAssignments.length > 0 && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">Recent Submissions & Completed Work</h2>
            </div>
            <span className="text-xs text-muted-foreground">{completedAssignments.length} items</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {completedAssignments.map((assignment) => {
              const issue = assignment.issue;
              if (!issue) return null;

              const isReview = issue.status === "UNDER_REVIEW";

              return (
                <div
                  key={assignment.id}
                  className="rounded-[1.4rem] border border-border/70 bg-background/50 p-4 transition hover:bg-surface/80"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={getWorkerIssueStatusTone(issue.status)} size="sm">
                          {getWorkerIssueStatusLabel(issue.status)}
                        </Badge>
                        <Badge variant="outline" size="sm">
                          {issue.category}
                        </Badge>
                      </div>
                      <h4 className="text-sm font-semibold text-foreground line-clamp-1">{issue.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {isReview ? "Awaiting officer review" : "Work resolved successfully"}
                      </p>
                    </div>

                    <Button asChild size="sm" variant="ghost" className="shrink-0 text-xs">
                      <Link to={`/app/worker/assigned-issues/${issue.id}`}>
                        View
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
