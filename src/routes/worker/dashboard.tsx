import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Gauge,
  Clock3,
  MapPin,
  TrendingUp,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { CitizenEmptyState } from "@/components/citizen/citizen-empty-state";
import { IssueImage } from "@/components/issues/issue-image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatWorkerIssueCoordinates,
  formatWorkerIssueDateTime,
  formatWorkerIssuePriority,
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

type MetricTone = {
  shell: string;
  icon: string;
  rail: string;
  copy: string;
};

function badgeToneClasses(tone: "default" | "success" | "warning" | "danger" | "info") {
  return tone === "success"
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : tone === "warning"
      ? "bg-amber-50 text-amber-700 ring-amber-200"
      : tone === "danger"
        ? "bg-red-50 text-red-700 ring-red-200"
        : tone === "info"
          ? "bg-sky-50 text-sky-700 ring-sky-200"
          : "bg-teal-50 text-teal-700 ring-teal-200";
}

function isCompletedStatus(status: Database["public"]["Enums"]["issue_status"]) {
  return status === "RESOLVED" || status === "CITIZEN_VERIFIED";
}

function WorkerMetricCard({
  label,
  value,
  caption,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  caption: string;
  icon: LucideIcon;
  tone: MetricTone;
}) {
  return (
    <div className="relative overflow-hidden rounded-[1.5rem] border border-white/60 bg-white/78 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm">
      <div className={cn("absolute inset-y-0 left-0 w-1.5", tone.rail)} aria-hidden="true" />
      <div className={cn("absolute -right-12 -top-12 h-32 w-32 rounded-full blur-3xl", tone.shell)} aria-hidden="true" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
          <p className="text-3xl font-semibold tracking-tight text-foreground">{value}</p>
          <p className="max-w-[16rem] text-sm leading-6 text-muted-foreground">{caption}</p>
        </div>
        <div className={cn("rounded-2xl border p-3 shadow-sm", tone.icon)}>
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
      inProgress: issues.filter((issue) => issue.status === "IN_PROGRESS").length,
      underReview: issues.filter((issue) => issue.status === "UNDER_REVIEW").length,
      completed: issues.filter((issue) => isCompletedStatus(issue.status)).length,
      critical: issues.filter((issue) => issue.priority === "HIGH" || issue.priority === "URGENT").length,
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

  const heroHighlights = [
    { label: "Assigned", value: stats.assigned, tone: "from-sky-500/15 via-cyan-500/10 to-teal-500/10" },
    { label: "In Progress", value: stats.inProgress, tone: "from-amber-500/15 via-orange-500/10 to-rose-500/10" },
    { label: "Under Review", value: stats.underReview, tone: "from-violet-500/15 via-fuchsia-500/10 to-sky-500/10" },
    { label: "Resolved", value: stats.completed, tone: "from-emerald-500/18 via-lime-500/10 to-teal-500/10" },
  ];

  if (sessionProblem || error) {
    return (
      <section className="rounded-[1.75rem] border border-white/70 bg-white/82 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
        <div className="max-w-2xl space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-700">
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
        <section className="relative overflow-hidden rounded-[1.75rem] border border-teal-100/80 bg-[linear-gradient(135deg,rgba(15,118,110,0.10)_0%,rgba(2,132,199,0.10)_48%,rgba(124,58,237,0.08)_100%)] p-6 shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
          <div className="space-y-3">
            <div className="h-4 w-44 animate-pulse rounded-full bg-muted/60" />
            <div className="h-9 w-full max-w-3xl animate-pulse rounded-2xl bg-muted/60" />
            <div className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-muted/40" />
          </div>
        </section>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-[1.5rem] border border-white/70 bg-white/80" />
          ))}
        </section>
        <section className="space-y-4">
          <div className="h-6 w-44 animate-pulse rounded-full bg-muted/50" />
          <div className="grid gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-40 animate-pulse rounded-[1.5rem] border border-white/70 bg-white/80" />
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[1.85rem] border border-teal-100/80 bg-[linear-gradient(135deg,rgba(15,118,110,0.14)_0%,rgba(2,132,199,0.12)_42%,rgba(124,58,237,0.08)_100%)] shadow-[0_22px_55px_rgba(15,23,42,0.12)]">
        <div className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-sky-400/10 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" aria-hidden="true" />
        <div className="border-b border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.88)_0%,rgba(249,252,251,0.72)_100%)] px-6 py-6 backdrop-blur-sm">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="space-y-4">
              <div className="inline-flex items-center rounded-full border border-teal-200/80 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-teal-800 shadow-sm shadow-teal-950/5">
                Field operations command
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Your Field Operations</h2>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Track live assignments, balance active work, and keep the resolution pipeline moving from the street to review.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {heroHighlights.map((item) => (
                  <div
                    key={item.label}
                    className={cn(
                      "rounded-2xl border border-white/70 bg-white/72 px-4 py-3 shadow-sm",
                      item.tone,
                    )}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{item.label}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-[1.5rem] border border-white/70 bg-white/72 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sky-700">
                    <TrendingUp className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Live assignment queue</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">Open the active work list and focus on the most urgent field tasks.</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-white/70 bg-gradient-to-br from-sky-500/12 via-cyan-500/10 to-teal-500/12 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Critical work</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{stats.critical}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">High and urgent items needing attention.</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/70 bg-gradient-to-br from-violet-500/12 via-fuchsia-500/10 to-sky-500/10 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-700">Resolved today</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{stats.completed}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">Completed work ready to move forward.</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-sky-50/80 px-4 py-2 text-sm text-sky-800 shadow-sm shadow-sky-950/5">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  Location-based work stream
                </div>
                <Button asChild className="min-w-fit">
                  <Link to="/app/worker/assigned-issues">
                    Open work queue
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <WorkerMetricCard
          caption="All open assignments currently routed to you."
          icon={ClipboardList}
          label="Assigned work"
          tone={{ shell: "bg-sky-500/18", icon: "border-sky-200 bg-sky-50 text-sky-700", rail: "bg-gradient-to-b from-sky-500 to-teal-500", copy: "sky" }}
          value={stats.assigned}
        />
        <WorkerMetricCard
          caption="Tasks actively being handled in the field."
          icon={Gauge}
          label="In progress"
          tone={{ shell: "bg-amber-500/18", icon: "border-amber-200 bg-amber-50 text-amber-700", rail: "bg-gradient-to-b from-amber-500 to-orange-500", copy: "amber" }}
          value={stats.inProgress}
        />
        <WorkerMetricCard
          caption="Submitted work awaiting officer review."
          icon={Clock3}
          label="Under review"
          tone={{ shell: "bg-violet-500/18", icon: "border-violet-200 bg-violet-50 text-violet-700", rail: "bg-gradient-to-b from-violet-500 to-sky-500", copy: "violet" }}
          value={stats.underReview}
        />
        <WorkerMetricCard
          caption="Resolved and ready for the next workflow step."
          icon={CheckCircle2}
          label="Completed"
          tone={{ shell: "bg-emerald-500/18", icon: "border-emerald-200 bg-emerald-50 text-emerald-700", rail: "bg-gradient-to-b from-emerald-500 to-teal-500", copy: "emerald" }}
          value={stats.completed}
        />
      </section>

      <section className="rounded-[1.75rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.84)_0%,rgba(243,248,246,0.94)_100%)] p-5 shadow-[0_16px_45px_rgba(15,23,42,0.09)]">
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr_0.85fr]">
          <div className="rounded-[1.35rem] border border-sky-100/80 bg-sky-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Dispatch note</p>
            <p className="mt-2 text-sm leading-6 text-foreground">
              Your queue is organized around live field assignments, with the most urgent work surfaced in the cards below.
            </p>
          </div>
          <div className="rounded-[1.35rem] border border-amber-100/80 bg-amber-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">Critical load</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{stats.critical}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">High and urgent work needs attention first.</p>
          </div>
          <div className="rounded-[1.35rem] border border-violet-100/80 bg-violet-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-700">Quick action</p>
            <Button asChild className="mt-3 w-full bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 shadow-md shadow-teal-950/15">
              <Link to="/app/worker/assigned-issues">
                Open the queue
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {recentAssignments.length > 0 ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Showing {recentAssignments.length} of {assignments.length} assigned issues
              </p>
              <h3 className="mt-1 text-xl font-semibold text-foreground">Live field queue</h3>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200/70 bg-sky-50/80 px-3 py-2 text-xs font-medium text-sky-800">
              <TriangleAlert className="h-4 w-4" aria-hidden="true" />
              Priority first workflow
            </div>
          </div>

          <div className="grid gap-4">
            {recentAssignments.map((assignment) => {
              const issue = assignment.issue;
              if (!issue) {
                return null;
              }

              const thumb = pickWorkerIssueThumbnail(issue);
              const location = formatWorkerIssueCoordinates(issue.latitude, issue.longitude);
              const statusTone = getWorkerIssueStatusTone(issue.status);
              const isCritical = issue.priority === "HIGH" || issue.priority === "URGENT";

              return (
                <article
                  key={assignment.id}
                  className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/84 shadow-[0_16px_42px_rgba(15,23,42,0.12)]"
                >
                  <div className="grid gap-0 lg:grid-cols-[0.35fr_1fr]">
                    <div className="bg-gradient-to-br from-slate-50 via-white to-teal-50 p-4 lg:p-5">
                      <div className="overflow-hidden rounded-[1.35rem] border border-white/70 bg-surface-elevated shadow-sm">
                        {thumb ? (
                          <IssueImage alt={issue.title} className="min-h-[12rem] rounded-none" src={thumb} variant="card" />
                        ) : (
                          <div className="flex min-h-[12rem] items-center justify-center px-4 py-6 text-center">
                            <div className="space-y-2">
                              <ClipboardList className="mx-auto h-6 w-6 text-primary" aria-hidden="true" />
                              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">No image</p>
                              <p className="text-sm leading-6 text-muted-foreground">Citizen photo not attached.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="min-w-0 space-y-5 p-5 lg:p-6">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${badgeToneClasses(statusTone)}`}>
                              {getWorkerIssueStatusLabel(issue.status)}
                            </span>
                            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${badgeToneClasses(isCritical ? "danger" : "info")}`}>
                              Priority {formatWorkerIssuePriority(issue.priority)}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-border/70 bg-sky-50/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-800">
                              {issue.category}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <h4 className="break-words text-2xl font-semibold tracking-tight text-foreground">{issue.title}</h4>
                            <p className="max-w-3xl break-words text-sm leading-6 text-muted-foreground">{issue.description}</p>
                          </div>
                        </div>

                        <Button asChild size="sm" className="shrink-0 bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 shadow-md shadow-teal-950/15" variant="default">
                          <Link to={`/app/worker/assigned-issues/${issue.id}`}>
                            Open issue
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        </Button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-sky-50/80 to-teal-50/70 p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Assigned</p>
                          <p className="mt-2 text-sm font-medium text-foreground">{formatWorkerIssueDateTime(assignment.assigned_at)}</p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-emerald-50/80 to-teal-50/70 p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Location</p>
                          <p className="mt-2 break-words text-sm font-medium text-foreground">{location ?? "No GPS captured"}</p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-violet-50/80 to-sky-50/70 p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Department</p>
                          <p className="mt-2 break-words text-sm font-medium text-foreground">{assignment.department?.name ?? "Unassigned"}</p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-amber-50/80 to-orange-50/70 p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Assigned by</p>
                          <p className="mt-2 break-words text-sm font-medium text-foreground">
                            {assignment.assigned_by?.full_name?.trim() || assignment.assigned_by?.email || "Municipal officer"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : (
        <CitizenEmptyState
          description={
            assignments.length === 0
              ? "No issues are assigned to you right now. Once officers route work to your account, it will appear here."
              : "No assigned issues match your current filters. Try clearing them."
          }
          primaryActionHref="/app/worker"
          primaryActionLabel="Back to Dashboard"
          secondaryActionHref="/app/worker/assigned-issues"
          secondaryActionLabel="Refresh queue"
          title={assignments.length === 0 ? "No assigned issues yet" : "No issues match your filters"}
        />
      )}
    </div>
  );
}
