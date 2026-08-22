import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  PlusCircle,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { CitizenEmptyState } from "@/components/citizen/citizen-empty-state";
import { RecentIssueCard, type CitizenIssueCardItem } from "@/components/citizen/recent-issue-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
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
    setMobileFiltersOpen(false);
  }

  if (sessionProblem || error) {
    return (
      <Card className="page-container-standard p-6 sm:p-8">
        <div className="max-w-2xl space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-700">
            <AlertCircle className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Unable to load your issues</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{sessionProblem ?? error}</p>
          </div>
          <Button onClick={() => setRefreshNonce((value) => value + 1)} type="button">
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="page-container-standard space-y-6">
        <Card className="p-6 sm:p-8">
          <div className="space-y-3">
            <div className="h-4 w-32 animate-pulse rounded-full bg-muted/60" />
            <div className="h-8 w-full max-w-md animate-pulse rounded-2xl bg-muted/60" />
            <div className="h-4 w-full max-w-xl animate-pulse rounded-full bg-muted/40" />
          </div>
        </Card>

        <div className="grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-11 animate-pulse rounded-xl border border-border/80 bg-surface/90" />
          ))}
        </div>

        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-40 animate-pulse rounded-2xl border border-border/80 bg-surface/80" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container-standard space-y-6 sm:space-y-8">
      <PageHeader
        tag="Issue Registry"
        title="My Civic Reports"
        description="Search, filter, and monitor every civic complaint you have filed across your city."
        actions={
          <>
            <Button asChild size="default" className="shadow-md shadow-teal-950/15">
              <Link to="/app/citizen/report">
                <PlusCircle className="h-4 w-4 mr-1" aria-hidden="true" />
                Report an Issue
              </Link>
            </Button>
            <Button asChild size="default" variant="outline">
              <Link to="/app/citizen">Dashboard</Link>
            </Button>
          </>
        }
      />

      {/* Quick Search & Filters Bar */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              className="w-full rounded-xl border border-border/80 bg-background/60 py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title, location, category, description..."
              value={search}
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search query"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          {/* Desktop Selects */}
          <div className="hidden lg:flex items-center gap-2.5 shrink-0">
            <select
              className="rounded-xl border border-border/80 bg-background/60 px-3.5 py-2.5 text-xs font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
              onChange={(event) => setPriorityFilter(event.target.value as "all" | CitizenIssuePriority)}
              value={priorityFilter}
              aria-label="Filter by priority"
            >
              {PRIORITY_FILTERS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              className="rounded-xl border border-border/80 bg-background/60 px-3.5 py-2.5 text-xs font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
              onChange={(event) => setSortOrder(event.target.value as SortOrder)}
              value={sortOrder}
              aria-label="Sort issues"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>

          {/* Mobile Filter Button */}
          <div className="flex items-center gap-2 lg:hidden">
            <Button
              type="button"
              variant={hasFiltersActive ? "default" : "outline"}
              size="sm"
              onClick={() => setMobileFiltersOpen(true)}
              className="flex-1 min-h-[44px]"
            >
              <SlidersHorizontal className="h-4 w-4 mr-1.5" aria-hidden="true" />
              <span>Filters & Sort</span>
              {hasFiltersActive ? (
                <Badge variant="outline" size="sm" className="ml-1.5 bg-white/20 text-white border-white/40">
                  Active
                </Badge>
              ) : null}
            </Button>
            {hasFiltersActive ? (
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters} className="min-h-[44px]">
                <X className="h-4 w-4" aria-hidden="true" />
                Reset
              </Button>
            ) : null}
          </div>

          {/* Clear Filters (Desktop) */}
          {hasFiltersActive ? (
            <Button
              disabled={!hasFiltersActive}
              onClick={clearFilters}
              type="button"
              variant="ghost"
              size="sm"
              className="hidden lg:inline-flex shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" aria-hidden="true" />
              Reset filters
            </Button>
          ) : null}
        </div>

        {/* Status Pills Carousel / Row */}
        <div className="mt-4 pt-3.5 border-t border-border/60 flex items-center gap-1.5 overflow-x-auto pb-1 -mb-1">
          {STATUS_FILTERS.map((filter) => {
            const isActive = statusFilter === filter.key;
            return (
              <button
                key={filter.key}
                onClick={() => setStatusFilter(filter.key)}
                type="button"
                className={[
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer shrink-0 min-h-[36px]",
                  isActive
                    ? "bg-primary text-white shadow-sm shadow-teal-950/15"
                    : "bg-surface-elevated text-muted-foreground hover:bg-teal-50 hover:text-foreground border border-border/70",
                ].join(" ")}
              >
                <span>{filter.label}</span>
                <span
                  className={[
                    "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                    isActive ? "bg-white/25 text-white" : "bg-background/80 text-muted-foreground",
                  ].join(" ")}
                >
                  {filterCounts[filter.key]}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Mobile Filter Dialog / Bottom Sheet */}
      <Dialog
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        title="Filter & Sort Reports"
        description="Refine your issue view by status, priority, and date."
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Status
            </label>
            <select
              className="w-full rounded-xl border border-border/80 bg-background/80 px-3.5 py-3 text-sm font-medium text-foreground outline-none"
              onChange={(event) => setStatusFilter(event.target.value as CitizenIssueStatusFilterBucket)}
              value={statusFilter}
            >
              {STATUS_FILTERS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label} ({filterCounts[option.key]})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Priority
            </label>
            <select
              className="w-full rounded-xl border border-border/80 bg-background/80 px-3.5 py-3 text-sm font-medium text-foreground outline-none"
              onChange={(event) => setPriorityFilter(event.target.value as "all" | CitizenIssuePriority)}
              value={priorityFilter}
            >
              {PRIORITY_FILTERS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Sort Order
            </label>
            <select
              className="w-full rounded-xl border border-border/80 bg-background/80 px-3.5 py-3 text-sm font-medium text-foreground outline-none"
              onChange={(event) => setSortOrder(event.target.value as SortOrder)}
              value={sortOrder}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>

          <div className="pt-3 flex gap-3">
            <Button
              className="flex-1"
              onClick={() => setMobileFiltersOpen(false)}
              type="button"
            >
              Apply Filters
            </Button>
            <Button
              variant="outline"
              onClick={clearFilters}
              type="button"
            >
              Reset
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Results Header & Cards List */}
      {filteredIssues.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 text-xs sm:text-sm text-muted-foreground px-1">
            <p>
              Showing <span className="font-bold text-foreground">{filteredIssues.length}</span> of{" "}
              <span className="font-bold text-foreground">{totalCount}</span> reports
            </p>
            <span className="font-medium">
              Sorted by: {sortOrder === "newest" ? "Newest" : "Oldest"}
            </span>
          </div>

          <div className="grid gap-3.5 sm:gap-4">
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
        </div>
      ) : (
        <CitizenEmptyState
          description={
            totalCount === 0
              ? "You have not reported any issues yet. Start by creating your first CivicFix report."
              : hasFiltersActive
                ? "No issues match the current search or filter criteria. Try resetting filters."
                : "No issues are available right now."
          }
          primaryActionHref="/app/citizen/report"
          primaryActionLabel="Report an Issue Now"
          secondaryActionHref="/app/citizen"
          secondaryActionLabel="Back to Dashboard"
          title={totalCount === 0 ? "No reports found" : hasFiltersActive ? "No matching issues" : "No issues available"}
        />
      )}
    </div>
  );
}

