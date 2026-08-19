import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Filter, Search, SlidersHorizontal, X } from "lucide-react";
import { Link } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { CitizenEmptyState } from "@/components/citizen/citizen-empty-state";
import { RecentIssueCard, type CitizenIssueCardItem } from "@/components/citizen/recent-issue-card";
import { Button } from "@/components/ui/button";
import {
  getCitizenIssueStatusFilterBucket,
  getCitizenIssueStatusLabel,
  getCitizenIssueStatusTone,
  pickCitizenIssueThumbnail,
  type CitizenIssuePriority,
  type CitizenIssueStatusFilterBucket,
} from "@/lib/citizen-issues";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type IssueStatus = Database["public"]["Enums"]["issue_status"];
type IssueImageRow = Database["public"]["Tables"]["issue_images"]["Row"];

type SortOrder = "newest" | "oldest";

type CitizenIssuesIssue = CitizenIssueCardItem & {
  issue_images?: IssueImageRow[] | null;
};

type StatusFilterOption = {
  key: CitizenIssueStatusFilterBucket;
  label: string;
};

const STATUS_FILTERS: StatusFilterOption[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "verified", label: "Verified" },
  { key: "inProgress", label: "In Progress" },
  { key: "resolved", label: "Resolved" },
  { key: "reopened", label: "Reopened" },
  { key: "rejected", label: "Rejected" },
];

const PRIORITY_FILTERS: Array<{ key: "all" | CitizenIssuePriority; label: string }> = [
  { key: "all", label: "All priorities" },
  { key: "LOW", label: "Low" },
  { key: "MEDIUM", label: "Medium" },
  { key: "HIGH", label: "High" },
  { key: "URGENT", label: "Urgent" },
];

function getFilterBucket(status: IssueStatus) {
  return getCitizenIssueStatusFilterBucket(status);
}

export function CitizenIssuesPage() {
  const { profile, status: sessionStatus, error: sessionError } = useAppSession();
  const [issues, setIssues] = useState<CitizenIssuesIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CitizenIssueStatusFilterBucket>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | CitizenIssuePriority>("all");
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

    async function loadIssues() {
      setLoading(true);
      setError(null);

      const { data, error: loadError } = await supabase
        .from("issues")
        .select(
          "id, title, description, category, priority, status, location_text, address_text, created_at, issue_images(id, storage_bucket, storage_path, image_type, created_at)",
        )
        .eq("reporter_profile_id", currentProfileId)
        .order("created_at", { ascending: false });

      if (cancelled) {
        return;
      }

      if (loadError) {
        if (import.meta.env.DEV) {
          console.error("Citizen issues load failed", loadError);
        }
        setError("Unable to load your issues right now.");
        setIssues([]);
        setLoading(false);
        return;
      }

      setIssues((data ?? []) as CitizenIssuesIssue[]);
      setLoading(false);
    }

    void loadIssues();

    return () => {
      cancelled = true;
    };
  }, [profileId, refreshNonce, sessionStatus]);

  const filterCounts = useMemo(
    () =>
      STATUS_FILTERS.reduce(
        (acc, filter) => {
          if (filter.key === "all") {
            acc.all = issues.length;
          } else {
            acc[filter.key] = issues.filter((issue) => getFilterBucket(issue.status) === filter.key).length;
          }
          return acc;
        },
        { all: issues.length, pending: 0, verified: 0, inProgress: 0, resolved: 0, reopened: 0, rejected: 0 } as Record<
          CitizenIssueStatusFilterBucket,
          number
        >,
      ),
    [issues],
  );

  const filteredIssues = useMemo(() => {
    const query = search.trim().toLowerCase();

    const nextIssues = issues.filter((issue) => {
      const matchesSearch =
        !query ||
        [issue.title, issue.description, issue.category, issue.location_text, issue.address_text]
          .filter(Boolean)
          .some((value) => typeof value === "string" && value.toLowerCase().includes(query));
      const matchesStatus = statusFilter === "all" || getFilterBucket(issue.status) === statusFilter;
      const matchesPriority = priorityFilter === "all" || issue.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });

    return nextIssues.sort((a, b) =>
      sortOrder === "newest"
        ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        : new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }, [issues, priorityFilter, search, sortOrder, statusFilter]);

  const hasFiltersActive = search.trim().length > 0 || statusFilter !== "all" || priorityFilter !== "all" || sortOrder !== "newest";
  const totalCount = issues.length;

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setSortOrder("newest");
  }

  if (sessionProblem || error) {
    return (
      <section className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-black/20">
        <div className="max-w-2xl space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-700">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Unable to load your issues</h2>
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
            <div className="h-4 w-36 animate-pulse rounded-full bg-muted/60" />
            <div className="h-9 w-full max-w-lg animate-pulse rounded-2xl bg-muted/60" />
            <div className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-muted/40" />
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-11 animate-pulse rounded-2xl border border-border/80 bg-surface/90" />
          ))}
        </section>

        <section className="space-y-4">
          <div className="h-6 w-40 animate-pulse rounded-full bg-muted/50" />
          <div className="grid gap-4">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="h-48 animate-pulse rounded-[1.5rem] border border-border/80 bg-surface/80" />
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-black/20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center rounded-full border border-border/70 bg-background/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              CivicFix issue history
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">My Civic Issues</h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Search, sort, and track every civic issue you have submitted.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link to="/app/citizen/report">Report an Issue</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/app/citizen">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-border/80 bg-surface/90 p-5 shadow-sm shadow-black/10">
          <p className="text-sm font-medium text-muted-foreground">Total Reports</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{totalCount}</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-surface/90 p-5 shadow-sm shadow-black/10">
          <p className="text-sm font-medium text-muted-foreground">Pending</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{filterCounts.pending}</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-surface/90 p-5 shadow-sm shadow-black/10">
          <p className="text-sm font-medium text-muted-foreground">In Progress</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{filterCounts.inProgress}</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-surface/90 p-5 shadow-sm shadow-black/10">
          <p className="text-sm font-medium text-muted-foreground">Resolved</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{filterCounts.resolved}</p>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-5 shadow-lg shadow-black/20">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.75fr_0.75fr_0.75fr_auto]">
          <label className="relative">
            <span className="sr-only">Search issues</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full rounded-2xl border border-border/80 bg-background/50 py-3 pl-11 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, location, description, or category"
              value={search}
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Status</span>
            <select
              className="w-full rounded-2xl border border-border/80 bg-background/50 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              onChange={(event) => setStatusFilter(event.target.value as CitizenIssueStatusFilterBucket)}
              value={statusFilter}
            >
              {STATUS_FILTERS.map((option) => (
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
              onChange={(event) => setPriorityFilter(event.target.value as "all" | CitizenIssuePriority)}
              value={priorityFilter}
            >
              {PRIORITY_FILTERS.map((option) => (
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

      <section className="flex flex-wrap gap-3">
        {STATUS_FILTERS.map((filter) => {
          const isActive = statusFilter === filter.key;
          return (
            <Button
              key={filter.key}
              className="min-w-[120px]"
              onClick={() => setStatusFilter(filter.key)}
              type="button"
              variant={isActive ? "default" : "outline"}
            >
              <Filter className="h-4 w-4" aria-hidden="true" />
              {filter.label}
              <span className="rounded-full bg-background/20 px-2 py-0.5 text-[11px] font-semibold">
                {filterCounts[filter.key]}
              </span>
            </Button>
          );
        })}
      </section>

      {filteredIssues.length > 0 ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Showing {filteredIssues.length} of {totalCount} reports
              </p>
              <h3 className="mt-1 text-xl font-semibold text-foreground">Track your community impact</h3>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/40 px-3 py-2 text-xs font-medium text-muted-foreground">
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              {sortOrder === "newest" ? "Newest first" : "Oldest first"}
            </div>
          </div>

          <div className="grid gap-4">
            {filteredIssues.map((issue) => (
              <RecentIssueCard
                key={issue.id}
                issue={issue}
                statusLabel={getCitizenIssueStatusLabel(issue.status)}
                statusTone={getCitizenIssueStatusTone(issue.status)}
                thumbnailUrl={pickCitizenIssueThumbnail(issue)}
                viewDetailsHref={`/app/citizen/issues/${issue.id}`}
              />
            ))}
          </div>
        </section>
      ) : (
        <CitizenEmptyState
          description={
            totalCount === 0
              ? "You have not reported any issues yet. Start by creating your first CivicFix report."
              : hasFiltersActive
                ? "No issues match the current search or filter settings. Try clearing filters."
                : "No issues are available right now."
          }
          primaryActionHref="/app/citizen/report"
          primaryActionLabel="Report an Issue"
          secondaryActionHref="/app/citizen"
          secondaryActionLabel="Back to Dashboard"
          title={totalCount === 0 ? "No reports yet" : hasFiltersActive ? "No issues match your filters" : "No issues available"}
        />
      )}
    </div>
  );
}
