import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Filter, Search, SlidersHorizontal, SquareArrowOutUpRight, X } from "lucide-react";
import { Link } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { CitizenEmptyState } from "@/components/citizen/citizen-empty-state";
import { Button } from "@/components/ui/button";
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
    ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20"
    : tone === "warning"
      ? "bg-amber-500/10 text-amber-300 ring-amber-500/20"
      : tone === "danger"
        ? "bg-red-500/10 text-red-300 ring-red-500/20"
        : tone === "info"
          ? "bg-blue-500/10 text-blue-300 ring-blue-500/20"
          : "bg-slate-500/10 text-slate-300 ring-slate-500/20";
}

function priorityRank(priority: WorkerIssuePriority) {
  return priority === "URGENT" ? 3 : priority === "HIGH" ? 2 : priority === "MEDIUM" ? 1 : 0;
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

  const hasFiltersActive = search.trim().length > 0 || statusFilter !== "all" || priorityFilter !== "all" || categoryFilter !== "all" || sortOrder !== "newest";
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
      <section className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-black/20">
        <div className="max-w-2xl space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300">
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
        <section className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-black/20">
          <div className="space-y-3">
            <div className="h-4 w-44 animate-pulse rounded-full bg-muted/60" />
            <div className="h-9 w-full max-w-3xl animate-pulse rounded-2xl bg-muted/60" />
            <div className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-muted/40" />
          </div>
        </section>
        <section className="grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-40 animate-pulse rounded-[1.5rem] border border-border/80 bg-surface/90" />
          ))}
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
                Field work queue
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight text-foreground">Assigned Issues</h2>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  Search and filter the issues routed to you for field execution and completion.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/40 px-4 py-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" aria-hidden="true" />
                {filteredAssignments.length} visible
              </div>
              <Button asChild>
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
        <div className="rounded-2xl border border-border/80 bg-surface/90 p-5 shadow-sm shadow-black/10">
          <p className="text-sm font-medium text-muted-foreground">Assigned Issues</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{totalCount}</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-surface/90 p-5 shadow-sm shadow-black/10">
          <p className="text-sm font-medium text-muted-foreground">In Progress</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
            {assignments.filter((assignment) => assignment.issue?.status === "IN_PROGRESS").length}
          </p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-surface/90 p-5 shadow-sm shadow-black/10">
          <p className="text-sm font-medium text-muted-foreground">Completed</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
            {assignments.filter((assignment) => assignment.issue?.status === "RESOLVED" || assignment.issue?.status === "CITIZEN_VERIFIED").length}
          </p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-surface/90 p-5 shadow-sm shadow-black/10">
          <p className="text-sm font-medium text-muted-foreground">High Priority</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
            {assignments.filter((assignment) => assignment.issue?.priority === "HIGH" || assignment.issue?.priority === "URGENT").length}
          </p>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-5 shadow-lg shadow-black/20">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.75fr_0.75fr_0.75fr_0.75fr_auto]">
          <label className="relative">
            <span className="sr-only">Search issues</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full rounded-2xl border border-border/80 bg-background/50 py-3 pl-11 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, location, department, or officer"
              value={search}
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Status</span>
            <select
              className="w-full rounded-2xl border border-border/80 bg-background/50 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              onChange={(event) => setStatusFilter(event.target.value as "all" | ReturnType<typeof getWorkerIssueStatusFilterBucket>)}
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
              className="w-full rounded-2xl border border-border/80 bg-background/50 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              onChange={(event) => setPriorityFilter(event.target.value as "all" | WorkerIssuePriority)}
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
              className="w-full rounded-2xl border border-border/80 bg-background/50 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              onChange={(event) => setCategoryFilter(event.target.value)}
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
              className="w-full rounded-2xl border border-border/80 bg-background/50 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              onChange={(event) => setSortOrder(event.target.value as SortOrder)}
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
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/40 px-3 py-2 text-xs font-medium text-muted-foreground">
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

              return (
                <article key={assignment.id} className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-5 shadow-lg shadow-black/20">
                  <div className="grid gap-5 lg:grid-cols-[0.22fr_1fr]">
                    <div className="overflow-hidden rounded-2xl border border-border/70 bg-surface-elevated">
                      {thumb ? (
                        <img alt={issue.title} className="h-full min-h-[10rem] w-full object-cover" src={thumb} />
                      ) : (
                        <div className="flex min-h-[10rem] items-center justify-center px-4 py-6 text-center">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">No image</p>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">Citizen photo not attached.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${badgeToneClasses(getWorkerIssueStatusTone(issue.status))}`}>
                              {getWorkerIssueStatusLabel(issue.status)}
                            </span>
                            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${badgeToneClasses(getWorkerIssuePriorityTone(issue.priority))}`}>
                              Priority {formatWorkerIssuePriority(issue.priority)}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-border/70 bg-background/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              {issue.category}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-2xl font-semibold tracking-tight text-foreground">{issue.title}</h4>
                            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{issue.description}</p>
                          </div>
                        </div>

                        <Button asChild size="sm" variant="outline">
                          <Link to={`/app/worker/assigned-issues/${issue.id}`}>
                            Open issue
                            <SquareArrowOutUpRight className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        </Button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Assigned</p>
                          <p className="mt-2 text-sm font-medium text-foreground">{formatWorkerIssueDateTime(assignment.assigned_at)}</p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Location</p>
                          <p className="mt-2 text-sm font-medium text-foreground">{location ?? "No GPS captured"}</p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Department</p>
                          <p className="mt-2 text-sm font-medium text-foreground">{assignment.department?.name ?? "Unassigned"}</p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Assigned by</p>
                          <p className="mt-2 text-sm font-medium text-foreground">
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
