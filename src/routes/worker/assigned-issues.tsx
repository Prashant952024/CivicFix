import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  AlertCircle,
  ArrowRight,
  Filter,
  MapPin,
  Search,
  SlidersHorizontal,
  SquareArrowOutUpRight,
  X,
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
  getWorkerIssuePriorityTone,
  getWorkerIssueStatusFilterBucket,
  getWorkerIssueStatusLabel,
  getWorkerIssueStatusOptions,
  getWorkerIssueStatusTone,
  pickWorkerIssueThumbnail,
  type WorkerIssueImageRow,
  type WorkerIssuePriority,
} from "@/lib/worker-issues";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type SortOrder = "newest" | "oldest" | "priority";

type WorkerIssueCardRow = Pick<
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
};

type WorkerAssignmentRow = Pick<
  Database["public"]["Tables"]["issue_assignments"]["Row"],
  "id" | "issue_id" | "department_id" | "worker_id" | "assigned_by_profile_id" | "status" | "assigned_at" | "unassigned_at"
> & {
  issue?: WorkerIssueCardRow | null;
  department?: Pick<Database["public"]["Tables"]["departments"]["Row"], "id" | "name"> | null;
  assigned_by?: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email"> | null;
  worker?: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email"> | null;
};

type CategoryOption = { key: string; label: string };

function badgeToneClasses(tone: "default" | "success" | "warning" | "danger" | "info") {
  return tone === "success"
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : tone === "warning"
      ? "bg-amber-50 text-amber-700 ring-amber-200"
      : tone === "danger"
        ? "bg-red-50 text-red-700 ring-red-200"
        : tone === "info"
          ? "bg-sky-50 text-sky-700 ring-sky-200"
          : "bg-slate-100 text-slate-700 ring-slate-200";
}

function priorityRank(priority: WorkerIssuePriority) {
  return priority === "URGENT" ? 3 : priority === "HIGH" ? 2 : priority === "MEDIUM" ? 1 : 0;
}

function QueueMetricCard({
  label,
  value,
  description,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  description: string;
  icon: ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/82 p-5 shadow-[0_18px_42px_rgba(15,23,42,0.1)]", accent)}>
      <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/35 blur-3xl" aria-hidden="true" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
          <p className="text-3xl font-semibold tracking-tight text-foreground">{value}</p>
          <p className="max-w-[16rem] text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/80 p-3 text-primary shadow-sm">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

export function WorkerAssignedIssuesPage() {
  const { profile, status: sessionStatus, error: sessionError } = useAppSession();
  const [assignments, setAssignments] = useState<WorkerAssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ReturnType<typeof getWorkerIssueStatusFilterBucket>>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | WorkerIssuePriority>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
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
          console.error("Worker assigned issues load failed", loadError);
        }
        setError("Unable to load your assigned issues right now.");
        setAssignments([]);
        setLoading(false);
        return;
      }

      setAssignments((data ?? []) as WorkerAssignmentRow[]);
      setLoading(false);
    }

    void loadAssignments();

    return () => {
      cancelled = true;
    };
  }, [profileId, refreshNonce, sessionStatus]);

  const categories = useMemo<CategoryOption[]>(() => {
    const unique = new Set(
      assignments
        .map((assignment) => assignment.issue?.category)
        .filter((value): value is string => Boolean(value)),
    );

    return [{ key: "all", label: "All categories" }, ...Array.from(unique).sort().map((category) => ({ key: category, label: category }))];
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    const query = search.trim().toLowerCase();

    const nextAssignments = assignments.filter((assignment) => {
      const issue = assignment.issue;
      if (!issue) {
        return false;
      }

      const searchFields = [
        issue.title,
        issue.description,
        issue.category,
        issue.location_text,
        issue.address_text,
        assignment.department?.name,
        assignment.assigned_by?.full_name,
        assignment.assigned_by?.email,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());

      const matchesSearch = !query || searchFields.some((value) => value.includes(query));
      const matchesStatus = statusFilter === "all" || getWorkerIssueStatusFilterBucket(issue.status) === statusFilter;
      const matchesPriority = priorityFilter === "all" || issue.priority === priorityFilter;
      const matchesCategory = categoryFilter === "all" || issue.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
    });

    return nextAssignments.sort((a, b) => {
      const aIssue = a.issue!;
      const bIssue = b.issue!;

      switch (sortOrder) {
        case "oldest":
          return new Date(a.assigned_at).getTime() - new Date(b.assigned_at).getTime();
        case "priority":
          return priorityRank(bIssue.priority) - priorityRank(aIssue.priority) || new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime();
        case "newest":
        default:
          return new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime();
      }
    });
  }, [assignments, categoryFilter, priorityFilter, search, sortOrder, statusFilter]);

  const hasFiltersActive =
    search.trim().length > 0 || statusFilter !== "all" || priorityFilter !== "all" || categoryFilter !== "all" || sortOrder !== "newest";
  const statusFilters = getWorkerIssueStatusOptions();
  const totalCount = assignments.length;

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setCategoryFilter("all");
    setSortOrder("newest");
  }

  if (sessionProblem || error) {
    return (
      <section className="rounded-[1.75rem] border border-white/70 bg-white/84 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.12)]">
        <div className="max-w-2xl space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-700">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Unable to load assigned issues</h2>
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
        <section className="rounded-[1.75rem] border border-teal-100/80 bg-[linear-gradient(135deg,rgba(15,118,110,0.10)_0%,rgba(2,132,199,0.10)_48%,rgba(124,58,237,0.08)_100%)] p-6 shadow-[0_18px_42px_rgba(15,23,42,0.12)]">
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
              <div key={index} className="h-40 animate-pulse rounded-[1.75rem] border border-white/70 bg-white/80" />
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[1.85rem] border border-teal-100/80 bg-[linear-gradient(135deg,rgba(15,118,110,0.12)_0%,rgba(2,132,199,0.10)_42%,rgba(124,58,237,0.08)_100%)] shadow-[0_22px_55px_rgba(15,23,42,0.12)]">
        <div className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-sky-400/10 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" aria-hidden="true" />
        <div className="border-b border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.88)_0%,rgba(249,252,251,0.72)_100%)] px-6 py-6 backdrop-blur-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center rounded-full border border-sky-200/80 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-800 shadow-sm shadow-sky-950/5">
                Field task queue
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Assigned Issues</h2>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Search, sort, and prioritize the issues routed to you for field execution and completion.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-sky-50/80 px-4 py-2 text-sm text-sky-800 shadow-sm shadow-sky-950/5">
                <Filter className="h-4 w-4" aria-hidden="true" />
                {filteredAssignments.length} visible
              </div>
              <Button asChild className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 shadow-md shadow-teal-950/15">
                <Link to="/app/worker">
                  Back to dashboard
                  <SquareArrowOutUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <QueueMetricCard
          accent="bg-gradient-to-br from-sky-500/14 via-cyan-500/10 to-teal-500/12"
          description="All live assignments routed to your field queue."
          icon={Filter}
          label="Assigned issues"
          value={totalCount}
        />
        <QueueMetricCard
          accent="bg-gradient-to-br from-amber-500/14 via-orange-500/10 to-red-500/10"
          description="Tasks that are currently moving in the field."
          icon={ArrowRight}
          label="In progress"
          value={assignments.filter((assignment) => assignment.issue?.status === "IN_PROGRESS").length}
        />
        <QueueMetricCard
          accent="bg-gradient-to-br from-violet-500/14 via-fuchsia-500/10 to-sky-500/10"
          description="Work submitted and waiting for officer review."
          icon={SlidersHorizontal}
          label="Under review"
          value={assignments.filter((assignment) => assignment.issue?.status === "UNDER_REVIEW").length}
        />
        <QueueMetricCard
          accent="bg-gradient-to-br from-emerald-500/14 via-teal-500/10 to-lime-500/10"
          description="Completed and closed issues in your queue."
          icon={MapPin}
          label="Completed"
          value={assignments.filter((assignment) => assignment.issue?.status === "RESOLVED" || assignment.issue?.status === "CITIZEN_VERIFIED").length}
        />
      </section>

      <section className="rounded-[1.75rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.86)_0%,rgba(243,248,246,0.94)_100%)] p-5 shadow-[0_16px_45px_rgba(15,23,42,0.09)]">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.75fr_0.75fr_0.75fr_0.75fr_auto]">
          <label className="relative">
            <span className="sr-only">Search issues</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full rounded-2xl border border-border/70 bg-white/82 py-3 pl-11 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              onChange={(event) => setSearch(event.currentTarget.value)}
              placeholder="Search title, location, department, or officer"
              value={search}
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Status</span>
            <select
              className="w-full rounded-2xl border border-border/70 bg-white/82 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              onChange={(event) => setStatusFilter(event.currentTarget.value as "all" | ReturnType<typeof getWorkerIssueStatusFilterBucket>)}
              value={statusFilter}
            >
              {statusFilters.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Priority</span>
            <select
              className="w-full rounded-2xl border border-border/70 bg-white/82 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              onChange={(event) => setPriorityFilter(event.currentTarget.value as "all" | WorkerIssuePriority)}
              value={priorityFilter}
            >
              {["all", "LOW", "MEDIUM", "HIGH", "URGENT"].map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All priorities" : option}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Category</span>
            <select
              className="w-full rounded-2xl border border-border/70 bg-white/82 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              onChange={(event) => setCategoryFilter(event.currentTarget.value)}
              value={categoryFilter}
            >
              {categories.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Sort</span>
            <select
              className="w-full rounded-2xl border border-border/70 bg-white/82 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              onChange={(event) => setSortOrder(event.currentTarget.value as SortOrder)}
              value={sortOrder}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="priority">Priority first</option>
            </select>
          </label>

          <div className="flex items-end">
            <Button disabled={!hasFiltersActive} onClick={clearFilters} type="button" variant="outline">
              <X className="h-4 w-4" aria-hidden="true" />
              Clear
            </Button>
          </div>
        </div>
      </section>

      {filteredAssignments.length > 0 ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Showing {filteredAssignments.length} of {totalCount} assigned issues
              </p>
              <h3 className="mt-1 text-xl font-semibold text-foreground">Your field work queue</h3>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/70 bg-violet-50/80 px-3 py-2 text-xs font-medium text-violet-800">
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              {sortOrder === "newest" ? "Newest first" : sortOrder === "oldest" ? "Oldest first" : "Priority first"}
            </div>
          </div>

          <div className="grid gap-4">
            {filteredAssignments.map((assignment) => {
              const issue = assignment.issue;
              if (!issue) {
                return null;
              }

              const thumb = pickWorkerIssueThumbnail(issue);
              const location = formatWorkerIssueCoordinates(issue.latitude, issue.longitude);
              const isCritical = issue.priority === "HIGH" || issue.priority === "URGENT";

              return (
                <article
                  key={assignment.id}
                  className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/86 shadow-[0_16px_42px_rgba(15,23,42,0.12)]"
                >
                  <div className="grid gap-0 lg:grid-cols-[0.34fr_1fr]">
                    <div className="bg-gradient-to-br from-slate-50 via-white to-teal-50 p-4 lg:p-5">
                      <div className="overflow-hidden rounded-[1.35rem] border border-white/70 bg-surface-elevated shadow-sm">
                        {thumb ? (
                          <IssueImage alt={issue.title} className="min-h-[12rem] rounded-none" src={thumb} variant="card" />
                        ) : (
                          <div className="flex min-h-[12rem] items-center justify-center px-4 py-6 text-center">
                            <div className="space-y-2">
                              <Search className="mx-auto h-6 w-6 text-primary" aria-hidden="true" />
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
                            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${badgeToneClasses(getWorkerIssueStatusTone(issue.status))}`}>
                              {getWorkerIssueStatusLabel(issue.status)}
                            </span>
                            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${badgeToneClasses(isCritical ? "danger" : getWorkerIssuePriorityTone(issue.priority))}`}>
                              Priority {formatWorkerIssuePriority(issue.priority)}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-sky-200/80 bg-sky-50/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-800">
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
                            <SquareArrowOutUpRight className="h-4 w-4" aria-hidden="true" />
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
            totalCount === 0
              ? "No issues are assigned to you right now. Once officers route work to your account, it will appear here."
              : hasFiltersActive
                ? "No assigned issues match your current filters. Try clearing them."
                : "No assigned issues are available right now."
          }
          primaryActionHref="/app/worker"
          primaryActionLabel="Back to Dashboard"
          secondaryActionHref="/app/worker/assigned-issues"
          secondaryActionLabel="Refresh queue"
          title={totalCount === 0 ? "No assigned issues yet" : hasFiltersActive ? "No issues match your filters" : "No assigned issues available"}
        />
      )}
    </div>
  );
}
