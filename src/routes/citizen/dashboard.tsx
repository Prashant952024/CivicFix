import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/react";
import { AlertCircle, CheckCircle2, Clock3, ClipboardList, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { CitizenEmptyState } from "@/components/citizen/citizen-empty-state";
import { CitizenSummaryCard } from "@/components/citizen/citizen-summary-card";
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
type CitizenDashboardIssue = CitizenIssueCardItem & {
  issue_images?: Database["public"]["Tables"]["issue_images"]["Row"][] | null;
};

type DashboardData = {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  recentIssues: CitizenIssueCardItem[];
};

function createEmptyData(): DashboardData {
  return {
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    recentIssues: [],
  };
}

function getGreetingPeriod(hour: number) {
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function getDisplayName(userName: string | null | undefined, profileName: string | null | undefined) {
  return userName?.trim() || profileName?.trim() || "CivicFix citizen";
}

function pickIssueThumbnail(issue: CitizenDashboardIssue) {
  return pickCitizenIssueThumbnail(issue);
}

export function CitizenDashboardPage() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { profile, status: sessionStatus, error: sessionError } = useAppSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const profileId = profile?.id;
  const sessionProblem = sessionStatus === "error" ? sessionError ?? "CivicFix profile is unavailable." : null;

  const displayName = getDisplayName(user?.fullName, profile?.full_name);
  const greeting = getGreetingPeriod(new Date().getHours());

  useEffect(() => {
    if (sessionStatus !== "ready" || !profileId) {
      return;
    }

    const currentProfileId = profileId;
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError(null);

      const [statusResult, recentResult] = await Promise.all([
        supabase
          .from("issues")
          .select("status")
          .eq("reporter_profile_id", currentProfileId),
        supabase
          .from("issues")
          .select(
            "id, title, description, category, priority, status, location_text, address_text, created_at, issue_images(id, storage_bucket, storage_path, image_type, created_at)",
          )
          .eq("reporter_profile_id", currentProfileId)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (cancelled) {
        return;
      }

      if (statusResult.error || recentResult.error) {
        const nextError = statusResult.error ?? recentResult.error;
        if (import.meta.env.DEV && nextError) {
          console.error("Citizen dashboard load failed", nextError);
        }
        setError("Unable to load your reports.");
        setData(null);
        setLoading(false);
        return;
      }

      const statusRows = (statusResult.data ?? []) as Array<{ status: IssueStatus }>;
      const recentIssues = (recentResult.data ?? []) as CitizenDashboardIssue[];
      const summary = statusRows.reduce(
        (acc, row) => {
          acc.total += 1;
          const bucket = getCitizenIssueSummaryBucket(row.status);
          if (bucket) {
            acc[bucket] += 1;
          }
          return acc;
        },
        { ...createEmptyData() },
      );

      setData({
        ...summary,
        recentIssues,
      });
      setLoading(false);
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [profileId, refreshNonce, sessionError, sessionStatus]);

  const summaryCards = useMemo(
    () => [
      { label: "Total Reports", value: data?.total ?? 0, icon: ClipboardList, tone: "default" as const },
      { label: "Pending", value: data?.pending ?? 0, icon: Clock3, tone: "warning" as const },
      { label: "In Progress", value: data?.inProgress ?? 0, icon: RefreshCw, tone: "info" as const },
      { label: "Resolved", value: data?.resolved ?? 0, icon: CheckCircle2, tone: "success" as const },
    ],
    [data],
  );

  const hasReports = (data?.recentIssues.length ?? 0) > 0;

  if (sessionProblem || error) {
    return (
      <section className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-black/20">
        <div className="max-w-2xl space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Unable to load your reports.</h2>
            <p className="text-sm leading-6 text-muted-foreground">{sessionProblem ?? error}</p>
          </div>
          <Button onClick={() => setRefreshNonce((value) => value + 1)} type="button">
            Try Again
          </Button>
        </div>
      </section>
    );
  }

  if (!isUserLoaded || loading) {
    return (
      <div className="space-y-6">
        <section className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-black/20">
          <div className="space-y-3">
            <div className="h-4 w-40 animate-pulse rounded-full bg-muted/60" />
            <div className="h-9 w-full max-w-md animate-pulse rounded-2xl bg-muted/60" />
            <div className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-muted/40" />
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-border/80 bg-surface/90 p-5">
              <div className="h-4 w-24 animate-pulse rounded-full bg-muted/50" />
              <div className="mt-5 h-8 w-16 animate-pulse rounded-2xl bg-muted/50" />
            </div>
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
              Citizen workspace
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                Good {greeting}, {displayName} <span aria-hidden="true">👋</span>
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Track your civic reports and help make your community better.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link to="/app/citizen/report">+ Report an Issue</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/app/citizen/issues">View All Issues</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ label, value, icon, tone }) => (
          <CitizenSummaryCard key={label} icon={icon} label={label} tone={tone} value={value} />
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Recent Reports</p>
            <h3 className="mt-1 text-xl font-semibold text-foreground">Latest civic issues you submitted</h3>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/app/citizen/issues">View All Issues</Link>
          </Button>
        </div>

        {hasReports ? (
          <div className="grid gap-4">
            {data?.recentIssues.map((issue) => (
              <RecentIssueCard
                key={issue.id}
                issue={issue}
                statusLabel={getCitizenIssueStatusLabel(issue.status)}
                statusTone={getCitizenIssueStatusTone(issue.status)}
                thumbnailUrl={pickIssueThumbnail(issue)}
                viewDetailsHref={`/app/citizen/issues/${issue.id}`}
              />
            ))}
          </div>
        ) : (
          <CitizenEmptyState
            description="Report a civic issue and help improve your community."
            primaryActionHref="/app/citizen/report"
            primaryActionLabel="Report Your First Issue"
            secondaryActionHref="/app/citizen/issues"
            secondaryActionLabel="View All Issues"
            title="No reports yet"
          />
        )}
      </section>
    </div>
  );
}
