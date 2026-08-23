import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Filter,
  HardHat,
  MapPin,
  RefreshCw,
  Search,
  SlidersHorizontal,
  SquarePen,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { IssueImage } from "@/components/issues/issue-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
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

function priorityRank(priority: WorkerIssuePriority) {
  return priority === "URGENT" ? 3 : priority === "HIGH" ? 2 : priority === "MEDIUM" ? 1 : 0;
}

function QueueMetricCard({
  label,
  value,
  description,
  icon: Icon,
  variant,
}: {
  label: string;
  value: number;
  description: string;
  icon: ComponentType<{ className?: string }>;
  variant: "sky" | "amber" | "violet" | "emerald";
}) {
  const styles = {
    sky: {
      card: "border-sky-200/80 bg-gradient-to-br from-sky-50/70 via-white to-teal-50/50",
      icon: "border-sky-200 bg-sky-50 text-sky-700",
    },
    amber: {
      card: "border-amber-200/80 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/50",
      icon: "border-amber-200 bg-amber-50 text-amber-700",
    },
    violet: {
      card: "border-violet-200/80 bg-gradient-to-br from-violet-50/70 via-white to-fuchsia-50/50",
      icon: "border-violet-200 bg-violet-50 text-violet-700",
    },
    emerald: {
      card: "border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/50",
      icon: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
  }[variant];

  return (
    <div className={cn("relative overflow-hidden rounded-[1.5rem] border p-4 sm:p-5 shadow-sm backdrop-blur-sm", styles.card)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className={cn("rounded-2xl border p-2.5 sm:p-3 shadow-sm shrink-0", styles.icon)}>
          <Icon className="h-5 w-5" />
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
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
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

  const activeFilterCount = [
    statusFilter !== "all",
    priorityFilter !== "all",
    categoryFilter !== "all",
    sortOrder !== "newest",
  ].filter(Boolean).length;

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setCategoryFilter("all");
    setSortOrder("newest");
  }

  if (sessionProblem || error) {
    return (
      <EmptyState
        icon={AlertCircle}
        variant="error"
        title="Unable to load assigned tasks"
        description={sessionProblem ?? error ?? "An error occurred while fetching your assigned work list."}
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
        <div className="h-40 w-full animate-pulse rounded-[1.85rem] border border-teal-100/80 bg-teal-50/40" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-[1.5rem] border border-border/70 bg-surface/80" />
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-12 w-full animate-pulse rounded-2xl bg-surface/80" />
          <div className="grid gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-44 animate-pulse rounded-[1.6rem] border border-border/70 bg-surface/80" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        tag="Field Work Queue"
        title="Assigned Field Tasks"
        description="Search, prioritize, and manage all repair tasks currently assigned to your team."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-200/80 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-sky-800 shadow-sm">
              <Filter className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{filteredAssignments.length} of {totalCount} tasks visible</span>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/app/worker">Dashboard</Link>
            </Button>
          </div>
        }
      />

      {/* 2. Compact Overview Metrics */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <QueueMetricCard
          description="Total active assignments in your queue"
          icon={ClipboardList}
          label="Total Assigned"
          value={totalCount}
          variant="sky"
        />
        <QueueMetricCard
          description="Tasks actively undergoing field repair"
          icon={SquarePen}
          label="In Progress"
          value={assignments.filter((a) => a.issue?.status === "IN_PROGRESS").length}
          variant="amber"
        />
        <QueueMetricCard
          description="Submitted work awaiting officer sign-off"
          icon={Clock3}
          label="Under Review"
          value={assignments.filter((a) => a.issue?.status === "UNDER_REVIEW").length}
          variant="violet"
        />
        <QueueMetricCard
          description="Repairs confirmed and closed"
          icon={CheckCircle2}
          label="Completed"
          value={assignments.filter((a) => a.issue?.status === "RESOLVED" || a.issue?.status === "CITIZEN_VERIFIED").length}
          variant="emerald"
        />
      </section>

      {/* 3. Search & Filter Bar */}
      <section className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full rounded-2xl border border-border/80 bg-background/80 py-2.5 pl-10 pr-10 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, location, category, or officer..."
              value={search}
            />
            {search && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                onClick={() => setSearch("")}
                type="button"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Desktop Filter Controls (Visible on Large screens) */}
          <div className="hidden lg:flex items-center gap-2.5">
            <select
              aria-label="Filter by Status"
              className="rounded-2xl border border-border/80 bg-background/80 px-3.5 py-2.5 text-xs font-medium text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              onChange={(e) => setStatusFilter(e.target.value as "all" | ReturnType<typeof getWorkerIssueStatusFilterBucket>)}
              value={statusFilter}
            >
              {statusFilters.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  Status: {opt.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by Priority"
              className="rounded-2xl border border-border/80 bg-background/80 px-3.5 py-2.5 text-xs font-medium text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              onChange={(e) => setPriorityFilter(e.target.value as "all" | WorkerIssuePriority)}
              value={priorityFilter}
            >
              <option value="all">All Priorities</option>
              <option value="LOW">Low Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="HIGH">High Priority</option>
              <option value="URGENT">Urgent Priority</option>
            </select>

            <select
              aria-label="Filter by Category"
              className="rounded-2xl border border-border/80 bg-background/80 px-3.5 py-2.5 text-xs font-medium text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              onChange={(e) => setCategoryFilter(e.target.value)}
              value={categoryFilter}
            >
              {categories.map((cat) => (
                <option key={cat.key} value={cat.key}>
                  {cat.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Sort issues"
              className="rounded-2xl border border-border/80 bg-background/80 px-3.5 py-2.5 text-xs font-medium text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              value={sortOrder}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="priority">Priority First</option>
            </select>

            {hasFiltersActive && (
              <Button onClick={clearFilters} size="sm" type="button" variant="ghost">
                <X className="h-3.5 w-3.5 mr-1" />
                Reset
              </Button>
            )}
          </div>

          {/* Mobile Filter Trigger Button (Visible on screens < lg) */}
          <div className="flex lg:hidden items-center gap-2">
            <Button
              className="flex-1 justify-center"
              onClick={() => setMobileFilterOpen(true)}
              type="button"
              variant="outline"
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters & Sort
              {activeFilterCount > 0 && (
                <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            {hasFiltersActive && (
              <Button onClick={clearFilters} size="icon" type="button" variant="ghost" aria-label="Clear all filters">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Active Filters Pill Bar */}
        {hasFiltersActive && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            <span className="font-semibold text-muted-foreground mr-1">Active:</span>
            {search && (
              <Badge variant="outline" size="sm" className="gap-1">
                Query: "{search}"
                <button onClick={() => setSearch("")} className="hover:text-destructive" aria-label="Remove search filter">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {statusFilter !== "all" && (
              <Badge variant="sky" size="sm" className="gap-1">
                Status: {statusFilter}
                <button onClick={() => setStatusFilter("all")} className="hover:text-destructive" aria-label="Remove status filter">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {priorityFilter !== "all" && (
              <Badge variant="amber" size="sm" className="gap-1">
                Priority: {priorityFilter}
                <button onClick={() => setPriorityFilter("all")} className="hover:text-destructive" aria-label="Remove priority filter">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {categoryFilter !== "all" && (
              <Badge variant="teal" size="sm" className="gap-1">
                Category: {categoryFilter}
                <button onClick={() => setCategoryFilter("all")} className="hover:text-destructive" aria-label="Remove category filter">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {sortOrder !== "newest" && (
              <Badge variant="violet" size="sm" className="gap-1">
                Sort: {sortOrder}
                <button onClick={() => setSortOrder("newest")} className="hover:text-destructive" aria-label="Reset sort order">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <button onClick={clearFilters} className="text-xs text-primary font-medium hover:underline ml-1">
              Clear all
            </button>
          </div>
        )}
      </section>

      {/* Mobile Filters Modal Dialog */}
      <Dialog
        maxWidth="md"
        open={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        title="Filter & Sort Tasks"
        description="Narrow down your assigned task queue."
      >
        <div className="space-y-4">
          <label className="space-y-1.5 block">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</span>
            <select
              className="w-full rounded-2xl border border-border/80 bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
              onChange={(e) => setStatusFilter(e.target.value as "all" | ReturnType<typeof getWorkerIssueStatusFilterBucket>)}
              value={statusFilter}
            >
              {statusFilters.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5 block">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Priority</span>
            <select
              className="w-full rounded-2xl border border-border/80 bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
              onChange={(e) => setPriorityFilter(e.target.value as "all" | WorkerIssuePriority)}
              value={priorityFilter}
            >
              <option value="all">All Priorities</option>
              <option value="LOW">Low Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="HIGH">High Priority</option>
              <option value="URGENT">Urgent Priority</option>
            </select>
          </label>

          <label className="space-y-1.5 block">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</span>
            <select
              className="w-full rounded-2xl border border-border/80 bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
              onChange={(e) => setCategoryFilter(e.target.value)}
              value={categoryFilter}
            >
              {categories.map((cat) => (
                <option key={cat.key} value={cat.key}>
                  {cat.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5 block">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sort Order</span>
            <select
              className="w-full rounded-2xl border border-border/80 bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              value={sortOrder}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="priority">Priority First</option>
            </select>
          </label>

          <div className="flex gap-2.5 pt-3 border-t border-border/60">
            <Button
              className="flex-1"
              onClick={() => {
                clearFilters();
                setMobileFilterOpen(false);
              }}
              type="button"
              variant="outline"
            >
              Reset All
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600"
              onClick={() => setMobileFilterOpen(false)}
              type="button"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </Dialog>

      {/* 4. Task List */}
      {filteredAssignments.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Showing {filteredAssignments.length} {filteredAssignments.length === 1 ? "task" : "tasks"}
            </h2>
            <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>{sortOrder === "newest" ? "Newest first" : sortOrder === "oldest" ? "Oldest first" : "Priority first"}</span>
            </div>
          </div>

          <div className="grid gap-3">
            {filteredAssignments.map((assignment) => {
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

                    {/* Task Content */}
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
                        <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground flex-wrap">
                          <span>Assigned {formatWorkerIssueDateTime(assignment.assigned_at)}</span>
                          {assignment.department?.name && (
                            <>
                              <span>•</span>
                              <span>{assignment.department.name}</span>
                            </>
                          )}
                          {assignment.assigned_by?.full_name && (
                            <>
                              <span>•</span>
                              <span>By {assignment.assigned_by.full_name}</span>
                            </>
                          )}
                        </div>

                        <Button asChild size="sm" className="w-full sm:w-auto bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 min-h-[42px] sm:min-h-0">
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
          title={totalCount === 0 ? "No Tasks Assigned" : "No Matching Tasks Found"}
          description={
            totalCount === 0
              ? "You're all caught up! No new field tasks are currently assigned to you."
              : "No assigned tasks match your current search and filter criteria. Try adjusting or clearing your filters."
          }
          action={
            hasFiltersActive ? (
              <Button onClick={clearFilters} type="button" variant="outline">
                <X className="h-4 w-4 mr-1.5" />
                Clear Filters
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link to="/app/worker">Back to Dashboard</Link>
              </Button>
            )
          }
        />
      )}
    </div>
  );
}

