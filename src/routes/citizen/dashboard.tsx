import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  ClipboardList,
  RefreshCw,
  PlusCircle,
  Sparkles,
  ShieldCheck,
  Building2,
  TreePine,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { CitizenEmptyState } from "@/components/citizen/citizen-empty-state";
import { CitizenSummaryCard } from "@/components/citizen/citizen-summary-card";
import { RecentIssueCard, type CitizenIssueCardItem } from "@/components/citizen/recent-issue-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getCitizenIssueStatusLabel,
  getCitizenIssueStatusTone,
  getCitizenIssueSummaryBucket,
  pickCitizenIssueThumbnail,
} from "@/lib/citizen-issues";
import { useTranslation } from "@/lib/i18n";
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

function getDisplayName(userName: string | null | undefined, profileName: string | null | undefined) {
  return userName?.trim() || profileName?.trim() || "Civic Citizen";
}

function pickIssueThumbnail(issue: CitizenDashboardIssue) {
  return pickCitizenIssueThumbnail(issue);
}

export function CitizenDashboardPage() {
  const { t } = useTranslation();
  const { user, isLoaded: isUserLoaded } = useUser();
  const { profile, status: sessionStatus, error: sessionError } = useAppSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const profileId = profile?.id;
  const sessionProblem = sessionStatus === "error" ? sessionError ?? "CivicFix profile is unavailable." : null;

  const displayName = getDisplayName(user?.fullName, profile?.full_name);

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
        setError(t("citizen.dashboard.loadError"));
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
  }, [profileId, refreshNonce, sessionError, sessionStatus, t]);

  const summaryCards = useMemo(
    () => [
      {
        label: t("citizen.dashboard.stats.total"),
        value: data?.total ?? 0,
        icon: ClipboardList,
        tone: "default" as const,
        description: t("citizen.dashboard.stats.totalDesc"),
      },
      {
        label: t("citizen.dashboard.stats.pending"),
        value: data?.pending ?? 0,
        icon: Clock3,
        tone: "warning" as const,
        description: t("citizen.dashboard.stats.pendingDesc"),
      },
      {
        label: t("citizen.dashboard.stats.inProgress"),
        value: data?.inProgress ?? 0,
        icon: RefreshCw,
        tone: "info" as const,
        description: t("citizen.dashboard.stats.inProgressDesc"),
      },
      {
        label: t("citizen.dashboard.stats.resolved"),
        value: data?.resolved ?? 0,
        icon: CheckCircle2,
        tone: "success" as const,
        description: t("citizen.dashboard.stats.resolvedDesc"),
      },
    ],
    [data, t],
  );

  const awaitingVerificationIssues = useMemo(
    () => (data?.recentIssues ?? []).filter((issue) => issue.status === "RESOLVED"),
    [data],
  );

  const hasReports = (data?.recentIssues.length ?? 0) > 0;

  if (sessionProblem || error) {
    return (
      <Card className="p-6 sm:p-8">
        <div className="max-w-2xl space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-700">
            <AlertCircle className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">{t("citizen.dashboard.loadError")}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{sessionProblem ?? error}</p>
          </div>
          <Button onClick={() => setRefreshNonce((value) => value + 1)} type="button">
            {t("common.tryAgain")}
          </Button>
        </div>
      </Card>
    );
  }

  if (!isUserLoaded || loading) {
    return (
      <div className="space-y-6">
        <Card className="p-6 sm:p-8">
          <div className="space-y-3">
            <div className="h-4 w-32 animate-pulse rounded-full bg-muted/60" />
            <div className="h-8 w-full max-w-md animate-pulse rounded-2xl bg-muted/60" />
            <div className="h-4 w-full max-w-xl animate-pulse rounded-full bg-muted/40" />
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl border border-border/80 bg-surface/90" />
          ))}
        </div>

        <div className="space-y-4">
          <div className="h-6 w-40 animate-pulse rounded-full bg-muted/50" />
          <div className="grid gap-4">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="h-40 animate-pulse rounded-2xl border border-border/80 bg-surface/80" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Welcome Hero Section */}
      <section className="relative overflow-hidden rounded-[2rem] border border-teal-100/90 bg-[linear-gradient(135deg,rgba(15,118,110,0.14)_0%,rgba(2,132,199,0.10)_45%,rgba(5,150,105,0.10)_100%)] p-6 sm:p-8 lg:p-10 shadow-xl shadow-teal-950/8">
        <div className="pointer-events-none absolute -right-10 top-0 h-48 w-48 rounded-full bg-sky-400/20 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-10 left-10 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl" aria-hidden="true" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3 min-w-0 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-200/90 bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-[#0f5f59] shadow-sm shadow-teal-950/5">
              <Sparkles className="h-3.5 w-3.5 text-[#0f766e]" aria-hidden="true" />
              <span>{t("citizen.dashboard.tag")}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground break-words">
              {t("citizen.dashboard.welcome", { name: displayName })}
            </h1>

            <p className="text-sm sm:text-base leading-relaxed text-muted-foreground">
              {t("citizen.dashboard.subtitle")}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Button asChild size="lg" className="shadow-lg shadow-teal-950/20 hover:shadow-xl hover:shadow-teal-950/25">
              <Link to="/app/citizen/report">
                <PlusCircle className="h-5 w-5 mr-1" aria-hidden="true" />
                {t("citizen.dashboard.reportButton")}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-white/80 hover:bg-white">
              <Link to="/app/citizen/issues">{t("citizen.dashboard.viewReportsButton")}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Verification Notice Banner if any issue is in RESOLVED status */}
      {awaitingVerificationIssues.length > 0 ? (
        <Card className="border-emerald-300 bg-gradient-to-r from-emerald-50/95 via-teal-50/90 to-sky-50/90 p-5 sm:p-6 shadow-md shadow-emerald-950/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-bold text-emerald-950">
                  {awaitingVerificationIssues.length === 1
                    ? t("citizen.dashboard.verificationNotice.single")
                    : t("citizen.dashboard.verificationNotice.multiple", { count: awaitingVerificationIssues.length })}
                </h2>
                <p className="text-xs sm:text-sm text-emerald-800/90 mt-0.5">
                  {t("citizen.dashboard.verificationNotice.description")}
                </p>
              </div>
            </div>
            <Button asChild size="sm" className="shrink-0 bg-emerald-700 text-white hover:bg-emerald-800">
              <Link to={`/app/citizen/issues/${awaitingVerificationIssues[0]?.id}`}>
                {t("citizen.dashboard.verificationNotice.action")}
              </Link>
            </Button>
          </div>
        </Card>
      ) : null}

      {/* Summary Metrics Grid */}
      <section aria-label="Citizen reports summary">
        <div className="grid gap-3.5 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map(({ label, value, icon, tone, description }) => (
            <CitizenSummaryCard
              key={label}
              icon={icon}
              label={label}
              tone={tone}
              value={value}
              description={description}
            />
          ))}
        </div>
      </section>

      {/* Recent Issues Section */}
      <section className="space-y-4" aria-label="Recent reports list">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#0f766e]">
              {t("citizen.dashboard.recentActivity")}
            </p>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-0.5">
              {t("citizen.dashboard.latestReports")}
            </h2>
          </div>
          {hasReports ? (
            <Button asChild size="sm" variant="outline">
              <Link to="/app/citizen/issues">{t("citizen.dashboard.viewAll", { count: data?.total ?? 0 })}</Link>
            </Button>
          ) : null}
        </div>

        {hasReports ? (
          <div className="grid gap-3.5 sm:gap-4">
            {data?.recentIssues.map((issue) => (
              <RecentIssueCard
                key={issue.id}
                issue={issue}
                statusLabel={t(`statuses.${issue.status}`)}
                statusTone={getCitizenIssueStatusTone(issue.status)}
                thumbnailUrl={pickIssueThumbnail(issue)}
                viewDetailsHref={`/app/citizen/issues/${issue.id}`}
              />
            ))}
          </div>
        ) : (
          <CitizenEmptyState
            description={t("citizen.dashboard.empty.description")}
            primaryActionHref="/app/citizen/report"
            primaryActionLabel={t("citizen.dashboard.empty.primaryAction")}
            secondaryActionHref="/app/citizen/issues"
            secondaryActionLabel={t("citizen.dashboard.empty.secondaryAction")}
            title={t("citizen.dashboard.empty.title")}
          />
        )}
      </section>

      {/* Community Impact & Transparency Banner */}
      <section aria-label="Community impact metrics">
        <Card className="p-6 sm:p-8 bg-[linear-gradient(135deg,rgba(255,255,255,0.95)_0%,rgba(240,248,247,0.90)_100%)]">
          <div className="grid gap-6 md:grid-cols-3 items-center">
            <div className="space-y-2 md:col-span-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#0f766e]">
                <TreePine className="h-4 w-4" aria-hidden="true" />
                <span>{t("citizen.dashboard.impact.tag")}</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-foreground">
                {t("citizen.dashboard.impact.title")}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {t("citizen.dashboard.impact.description")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 md:col-span-2">
              <div className="rounded-2xl border border-teal-100 bg-white/90 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Building2 className="h-4 w-4 text-[#0f766e]" aria-hidden="true" />
                  <span>{t("citizen.dashboard.impact.totalImpact")}</span>
                </div>
                <p className="mt-2 text-2xl font-extrabold text-foreground">
                  {data?.total ?? 0} <span className="text-xs font-normal text-muted-foreground">{t("citizen.dashboard.impact.reports")}</span>
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">{t("citizen.dashboard.impact.registry")}</p>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-white/90 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  <span>{t("citizen.dashboard.impact.resolutionRate")}</span>
                </div>
                <p className="mt-2 text-2xl font-extrabold text-emerald-700">
                  {data?.total ? Math.round(((data?.resolved ?? 0) / data.total) * 100) : 0}%
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {t("citizen.dashboard.impact.resolvedCount", { resolved: data?.resolved ?? 0, total: data?.total ?? 0 })}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}

