import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Filter } from "lucide-react";
import { Link } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { CitizenEmptyState } from "@/components/citizen/citizen-empty-state";
import { RecentIssueCard, type CitizenIssueCardItem } from "@/components/citizen/recent-issue-card";
import { Button } from "@/components/ui/button";
import {
  getCitizenIssueStatusLabel,
  getCitizenIssueStatusTone,
  getCitizenIssueSummaryBucket,
  pickCitizenIssueThumbnail,
} from "@/lib/citizen-issues";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type IssueStatus = Database["public"]["Enums"]["issue_status"];
type IssueImageRow = Database["public"]["Tables"]["issue_images"]["Row"];

type FilterKey = "all" | "pending" | "inProgress" | "resolved";

type CitizenIssuesIssue = CitizenIssueCardItem & {
  issue_images?: IssueImageRow[] | null;
};

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "inProgress", label: "In Progress" },
  { key: "resolved", label: "Resolved" },
];

function getFilterBucket(status: IssueStatus) {
  return getCitizenIssueSummaryBucket(status);
}

export function CitizenIssuesPage() {
  const { profile, status: sessionStatus, error: sessionError } = useAppSession();
  const [issues, setIssues] = useState<CitizenIssuesIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
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

  const filteredIssues = useMemo(() => {
    if (activeFilter === "all") {
      return issues;
    }

    return issues.filter((issue) => getFilterBucket(issue.status) === activeFilter);
  }, [activeFilter, issues]);

  const filterCounts = useMemo(
    () =>
      FILTERS.reduce(
        (acc, filter) => {
          acc[filter.key] =
            filter.key === "all" ? issues.length : issues.filter((issue) => getFilterBucket(issue.status) === filter.key).length;
          return acc;
        },
        { all: issues.length, pending: 0, inProgress: 0, resolved: 0 } as Record<FilterKey, number>,
      ),
    [issues],
  );

  if (sessionProblem || error) {
    return (
      <section className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-black/20">
        <div className="max-w-2xl space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300">
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
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">My Issues</h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Review every issue you have reported, filter by progress, and open the details view for more context.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link to="/app/citizen/report">Report Another Issue</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/app/citizen">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap gap-3">
        {FILTERS.map((filter) => {
          const isActive = activeFilter === filter.key;
          return (
            <Button
              key={filter.key}
              className="min-w-[120px]"
              onClick={() => setActiveFilter(filter.key)}
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
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Showing {filteredIssues.length} reports</p>
              <h3 className="mt-1 text-xl font-semibold text-foreground">Track your community impact</h3>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/app/citizen/report">
                New report
              </Link>
            </Button>
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
            activeFilter === "all"
              ? "You have not reported any issues yet. Start by creating your first CivicFix report."
              : "No issues match the selected filter. Try another status or open All."
          }
          primaryActionHref="/app/citizen/report"
          primaryActionLabel="Report an Issue"
          secondaryActionHref="/app/citizen"
          secondaryActionLabel="Back to Dashboard"
          title={activeFilter === "all" ? "No reports yet" : "No issues in this filter"}
        />
      )}
    </div>
  );
}
