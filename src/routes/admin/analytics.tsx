import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock3,
  Download,
  Flame,
  Layers,
  MapPin,
  PieChart,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  formatAdminDateTime,
  getAdminIssueStatusTone,
  getAdminPriorityTone,
  getAdminSeverityTone,
} from "@/lib/admin";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type IssueRow = Pick<
  Database["public"]["Tables"]["issues"]["Row"],
  "id" | "title" | "status" | "priority" | "severity" | "category" | "created_at" | "department_id" | "latitude" | "longitude" | "location_text" | "address_text" | "resolved_at"
>;

type DepartmentRow = Pick<Database["public"]["Tables"]["departments"]["Row"], "id" | "name" | "is_active">;

type TimeRangeKey = "7d" | "30d" | "3m" | "6m" | "1y" | "all";

const TIME_RANGES: Record<TimeRangeKey, { label: string; days: number }> = {
  "7d": { label: "Past 7 Days", days: 7 },
  "30d": { label: "Past 30 Days", days: 30 },
  "3m": { label: "Past 3 Months", days: 90 },
  "6m": { label: "Past 6 Months", days: 180 },
  "1y": { label: "Past Year", days: 365 },
  all: { label: "All Time", days: 9999 },
};

function isResolvedLike(status: Database["public"]["Enums"]["issue_status"]) {
  return status === "RESOLVED" || status === "CITIZEN_VERIFIED";
}

function formatDurationFromHours(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)} mins`;
  }
  if (hours < 24) {
    return `${hours.toFixed(1)} hrs`;
  }
  const days = hours / 24;
  return `${days.toFixed(1)} days`;
}

function getRangeStartDate(now: Date, range: TimeRangeKey): Date {
  const days = TIME_RANGES[range].days;
  if (days >= 9999) return new Date(0);
  const start = new Date(now.getTime());
  start.setDate(start.getDate() - days);
  return start;
}

export function AdminAnalyticsPage() {
  const { profile, status: sessionStatus, error: sessionError } = useAppSession();
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRangeKey>("30d");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [activeHoverPoint, setActiveHoverPoint] = useState<number | null>(null);

  const profileId = profile?.id;
  const sessionProblem = sessionStatus === "error" ? sessionError ?? "CivicFix profile is unavailable." : null;

  useEffect(() => {
    if (sessionStatus !== "ready" || !profileId) {
      return;
    }

    let cancelled = false;

    async function loadAnalytics() {
      setLoading(true);
      setError(null);

      const [issuesResult, departmentsResult] = await Promise.all([
        supabase
          .from("issues")
          .select("id, title, status, priority, severity, category, created_at, department_id, latitude, longitude, location_text, address_text, resolved_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("departments")
          .select("id, name, is_active")
          .order("name", { ascending: true }),
      ]);

      if (cancelled) return;

      if (issuesResult.error || departmentsResult.error) {
        if (import.meta.env.DEV) {
          console.error("Admin analytics load error", {
            issues: issuesResult.error,
            departments: departmentsResult.error,
          });
        }
        setError("Unable to load platform analytics.");
        setLoading(false);
        return;
      }

      setIssues(issuesResult.data ?? []);
      setDepartments(departmentsResult.data ?? []);
      setLastRefreshedAt(new Date().toISOString());
      setLoading(false);
    }

    void loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [profileId, refreshNonce, sessionStatus]);

  // Filter issues based on selected time range
  const filteredIssues = useMemo(() => {
    const now = new Date();
    const startDate = getRangeStartDate(now, timeRange);
    return issues.filter((issue) => new Date(issue.created_at) >= startDate);
  }, [issues, timeRange]);

  // Executive KPIs
  const kpis = useMemo(() => {
    const total = filteredIssues.length;
    const resolved = filteredIssues.filter((i) => isResolvedLike(i.status)).length;
    const open = total - resolved;
    const critical = filteredIssues.filter((i) => i.severity === "CRITICAL" || i.priority === "URGENT").length;
    const citizenVerified = filteredIssues.filter((i) => i.status === "CITIZEN_VERIFIED").length;

    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    const citizenVerificationRate = resolved > 0 ? Math.round((citizenVerified / resolved) * 100) : 0;

    // Average resolution time (in hours)
    const resolvedWithTimes = filteredIssues.filter((i) => isResolvedLike(i.status) && i.resolved_at);
    let avgHours: number | null = null;
    if (resolvedWithTimes.length > 0) {
      const sumHours = resolvedWithTimes.reduce((acc, curr) => {
        const createdMs = new Date(curr.created_at).getTime();
        const resolvedMs = new Date(curr.resolved_at!).getTime();
        return acc + Math.max(0, (resolvedMs - createdMs) / (1000 * 60 * 60));
      }, 0);
      avgHours = sumHours / resolvedWithTimes.length;
    }

    return {
      total,
      resolved,
      open,
      critical,
      resolutionRate,
      citizenVerificationRate,
      avgHours,
    };
  }, [filteredIssues]);

  // Issue Trends Over Time (Intake vs Resolution timeline)
  const timeSeriesData = useMemo(() => {
    const bucketCount = timeRange === "7d" ? 7 : timeRange === "30d" ? 10 : 12;
    const now = new Date();
    const startDate = getRangeStartDate(now, timeRange);
    const totalMs = now.getTime() - startDate.getTime();
    const stepMs = totalMs / bucketCount;

    const points: Array<{ label: string; intake: number; resolved: number }> = [];

    for (let i = 0; i < bucketCount; i++) {
      const bStart = new Date(startDate.getTime() + i * stepMs);
      const bEnd = new Date(startDate.getTime() + (i + 1) * stepMs);

      const label =
        timeRange === "7d"
          ? bStart.toLocaleDateString(undefined, { weekday: "short" })
          : bStart.toLocaleDateString(undefined, { month: "short", day: "numeric" });

      const intake = filteredIssues.filter((iss) => {
        const d = new Date(iss.created_at);
        return d >= bStart && d < bEnd;
      }).length;

      const resolved = filteredIssues.filter((iss) => {
        if (!iss.resolved_at) return false;
        const d = new Date(iss.resolved_at);
        return d >= bStart && d < bEnd;
      }).length;

      points.push({ label, intake, resolved });
    }

    return points;
  }, [filteredIssues, timeRange]);

  // Status Distribution
  const statusDistribution = useMemo(() => {
    const statuses: Array<{ key: Database["public"]["Enums"]["issue_status"]; label: string; color: string }> = [
      { key: "SUBMITTED", label: "Submitted", color: "bg-sky-500" },
      { key: "AI_ANALYZED", label: "AI Analyzed", color: "bg-indigo-500" },
      { key: "UNDER_REVIEW", label: "Under Review", color: "bg-violet-500" },
      { key: "VERIFIED", label: "Officer Verified", color: "bg-cyan-500" },
      { key: "ASSIGNED", label: "Assigned", color: "bg-teal-500" },
      { key: "IN_PROGRESS", label: "In Progress", color: "bg-amber-500" },
      { key: "PARTIALLY_COMPLETED", label: "Partially Done", color: "bg-blue-500" },
      { key: "RESOLVED", label: "Resolved", color: "bg-emerald-500" },
      { key: "CITIZEN_VERIFIED", label: "Citizen Verified", color: "bg-green-600" },
      { key: "REOPENED", label: "Reopened / Rework", color: "bg-rose-500" },
    ];

    const total = Math.max(1, filteredIssues.length);
    return statuses.map((st) => {
      const count = filteredIssues.filter((i) => i.status === st.key).length;
      const pct = Math.round((count / total) * 100);
      return { ...st, count, pct };
    });
  }, [filteredIssues]);

  // Priority Breakdown
  const priorityDistribution = useMemo(() => {
    const priorities: Array<{ key: Database["public"]["Enums"]["issue_priority"]; label: string; color: string }> = [
      { key: "LOW", label: "Low Priority", color: "bg-slate-400" },
      { key: "MEDIUM", label: "Medium Priority", color: "bg-sky-500" },
      { key: "HIGH", label: "High Priority", color: "bg-amber-500" },
      { key: "URGENT", label: "Urgent Priority", color: "bg-rose-500" },
    ];
    const total = Math.max(1, filteredIssues.length);
    return priorities.map((p) => {
      const count = filteredIssues.filter((i) => i.priority === p.key).length;
      const pct = Math.round((count / total) * 100);
      return { ...p, count, pct };
    });
  }, [filteredIssues]);

  // Severity Breakdown
  const severityDistribution = useMemo(() => {
    const severities: Array<{ key: Database["public"]["Enums"]["issue_severity"]; label: string; color: string }> = [
      { key: "LOW", label: "Low Severity", color: "bg-emerald-500" },
      { key: "MEDIUM", label: "Medium Severity", color: "bg-blue-500" },
      { key: "HIGH", label: "High Severity", color: "bg-amber-500" },
      { key: "CRITICAL", label: "Critical Hazard", color: "bg-rose-600" },
    ];
    const total = Math.max(1, filteredIssues.length);
    return severities.map((s) => {
      const count = filteredIssues.filter((i) => i.severity === s.key).length;
      const pct = Math.round((count / total) * 100);
      return { ...s, count, pct };
    });
  }, [filteredIssues]);

  // Department Performance Table & Resolution Velocity
  const departmentStats = useMemo(() => {
    return departments.map((dept) => {
      const deptIssues = filteredIssues.filter((i) => i.department_id === dept.id);
      const total = deptIssues.length;
      const inProgress = deptIssues.filter((i) => ["ASSIGNED", "IN_PROGRESS", "UNDER_REVIEW"].includes(i.status)).length;
      const completed = deptIssues.filter((i) => isResolvedLike(i.status)).length;
      const pending = total - completed;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Avg resolution time
      const resolvedWithTime = deptIssues.filter((i) => isResolvedLike(i.status) && i.resolved_at);
      let avgHours: number | null = null;
      if (resolvedWithTime.length > 0) {
        const sum = resolvedWithTime.reduce((acc, curr) => {
          const created = new Date(curr.created_at).getTime();
          const resolved = new Date(curr.resolved_at!).getTime();
          return acc + Math.max(0, (resolved - created) / (1000 * 60 * 60));
        }, 0);
        avgHours = sum / resolvedWithTime.length;
      }

      return {
        id: dept.id,
        name: dept.name,
        total,
        inProgress,
        completed,
        pending,
        rate,
        avgHours,
      };
    }).sort((a, b) => b.total - a.total);
  }, [departments, filteredIssues]);

  // Geographic Hotspots
  const locationHotspots = useMemo(() => {
    const map = new Map<string, number>();
    for (const issue of filteredIssues) {
      const loc = (issue.address_text || issue.location_text || "Unspecified Area").trim();
      map.set(loc, (map.get(loc) ?? 0) + 1);
    }
    const total = Math.max(1, filteredIssues.length);
    return Array.from(map.entries())
      .map(([name, count]) => ({
        name,
        count,
        pct: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredIssues]);

  // Recent Issues sample
  const recentIssues = useMemo(() => {
    return filteredIssues.slice(0, 5);
  }, [filteredIssues]);

  function handleExportCsv() {
    const headers = ["Issue ID", "Title", "Category", "Priority", "Severity", "Status", "Location", "Created At", "Resolved At"];
    const rows = filteredIssues.map((i) => [
      i.id,
      `"${i.title.replace(/"/g, '""')}"`,
      i.category,
      i.priority,
      i.severity,
      i.status,
      `"${(i.address_text || i.location_text || "").replace(/"/g, '""')}"`,
      i.created_at,
      i.resolved_at || "",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `civicfix-analytics-${timeRange}-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (sessionProblem || error) {
    return (
      <EmptyState
        icon={AlertCircle}
        variant="error"
        title="Analytics Unavailable"
        description={sessionProblem ?? error ?? "We could not load municipal analytics."}
        action={
          <Button onClick={() => setRefreshNonce((v) => v + 1)} type="button">
            <RotateCcw className="h-4 w-4 mr-2" />
            Retry Analytics
          </Button>
        }
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-28 w-full animate-pulse rounded-2xl border border-border/60 bg-muted/20" />
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-border/70 bg-muted/30" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="h-72 animate-pulse rounded-3xl border border-border/70 bg-muted/20" />
          <div className="h-72 animate-pulse rounded-3xl border border-border/70 bg-muted/20" />
        </div>
      </div>
    );
  }

  const maxTimelineVal = Math.max(1, ...timeSeriesData.flatMap((p) => [p.intake, p.resolved]));
  const activePoint = timeSeriesData[activeHoverPoint ?? timeSeriesData.length - 1];

  return (
    <div className="space-y-6">
      {/* 1. Header with Time Range Selectors and Export */}
      <PageHeader
        tag="Municipal Intelligence"
        title="Analytics & Insights"
        description="Monitor civic issue trends, resolution performance, and departmental efficiency across all municipal wards."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Range Toggle Buttons */}
            <div className="flex items-center rounded-xl border border-border/80 bg-surface/90 p-1 shadow-sm text-xs">
              {(Object.keys(TIME_RANGES) as TimeRangeKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTimeRange(key)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    timeRange === key
                      ? "bg-teal-700 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>

            <Button variant="outline" size="sm" onClick={handleExportCsv} className="text-xs h-8">
              <Download className="h-3.5 w-3.5 mr-1" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => setRefreshNonce((v) => v + 1)} className="text-xs h-8">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        }
      >
        {lastRefreshedAt && (
          <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
            <span>Period: <strong className="text-foreground">{TIME_RANGES[timeRange].label}</strong></span>
            <span>·</span>
            <span>Refreshed: <strong className="text-foreground">{formatAdminDateTime(lastRefreshedAt)}</strong></span>
          </div>
        )}
      </PageHeader>

      {/* 2. Section 1 — Executive KPIs */}
      <section className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {/* KPI 1: Total Issues */}
        <div className="flex flex-col justify-between h-28 rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50/70 via-surface to-teal-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800">Total Issues</span>
            <div className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
              <Layers className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="my-auto">
            <p className="text-2xl font-bold tracking-tight text-sky-950">{kpis.total}</p>
          </div>
          <p className="text-[11px] text-muted-foreground">In selected window</p>
        </div>

        {/* KPI 2: Resolution Rate */}
        <div className="flex flex-col justify-between h-28 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 via-surface to-teal-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Resolution Rate</span>
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="my-auto">
            <p className="text-2xl font-bold tracking-tight text-emerald-950">{kpis.resolutionRate}%</p>
          </div>
          <p className="text-[11px] text-muted-foreground">{kpis.resolved} of {kpis.total} closed</p>
        </div>

        {/* KPI 3: Avg Resolution Time */}
        <div className="flex flex-col justify-between h-28 rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 via-surface to-sky-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800">Avg Fix Time</span>
            <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
              <Clock3 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="my-auto">
            <p className="text-2xl font-bold tracking-tight text-indigo-950">
              {kpis.avgHours !== null ? formatDurationFromHours(kpis.avgHours) : "N/A"}
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground">Intake to sign-off</p>
        </div>

        {/* KPI 4: Open Issues */}
        <div className="flex flex-col justify-between h-28 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 via-surface to-orange-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Open Backlog</span>
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
              <Clock3 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="my-auto">
            <p className="text-2xl font-bold tracking-tight text-amber-950">{kpis.open}</p>
          </div>
          <p className="text-[11px] text-muted-foreground">{kpis.total > 0 ? Math.round((kpis.open / kpis.total) * 100) : 0}% active load</p>
        </div>

        {/* KPI 5: Critical / Urgent */}
        <div className="flex flex-col justify-between h-28 rounded-2xl border border-rose-200/80 bg-gradient-to-br from-rose-50/70 via-surface to-pink-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">Critical / Urgent</span>
            <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
              <ShieldAlert className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="my-auto">
            <p className="text-2xl font-bold tracking-tight text-rose-950">{kpis.critical}</p>
          </div>
          <p className="text-[11px] text-muted-foreground">High hazard load</p>
        </div>

        {/* KPI 6: Citizen Verified */}
        <div className="flex flex-col justify-between h-28 rounded-2xl border border-teal-200/80 bg-gradient-to-br from-teal-50/70 via-surface to-cyan-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800">Citizen Verified</span>
            <div className="p-1.5 rounded-lg bg-teal-100 text-teal-700">
              <UserCheck className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="my-auto">
            <p className="text-2xl font-bold tracking-tight text-teal-950">{kpis.citizenVerificationRate}%</p>
          </div>
          <p className="text-[11px] text-muted-foreground">Of completed repairs</p>
        </div>
      </section>

      {/* 3. Section 2 — Issues Over Time & Status Breakdown */}
      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        {/* Left: Issues Over Time Chart */}
        <Card className="rounded-3xl border border-border/80 bg-surface/95 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-teal-700" />
              <h3 className="text-sm font-bold text-foreground">Issues Over Time</h3>
            </div>
            {activePoint && (
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span>{activePoint.label}:</span>
                <span className="font-bold text-sky-700">{activePoint.intake} Reported</span>
                <span>·</span>
                <span className="font-bold text-emerald-700">{activePoint.resolved} Resolved</span>
              </div>
            )}
          </div>

          <div className="h-56 w-full flex items-end gap-2 pt-4 pb-2 px-1">
            {timeSeriesData.map((pt, idx) => {
              const intakeHeight = Math.max(8, (pt.intake / maxTimelineVal) * 100);
              const resolvedHeight = Math.max(8, (pt.resolved / maxTimelineVal) * 100);

              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center gap-1 h-full justify-end group cursor-pointer"
                  onMouseEnter={() => setActiveHoverPoint(idx)}
                >
                  <div className="w-full flex items-end justify-center gap-1 h-44">
                    {/* Intake Bar */}
                    <div
                      className="w-1/2 max-w-[14px] bg-sky-500 rounded-t-sm transition group-hover:bg-sky-400"
                      style={{ height: `${intakeHeight}%` }}
                      title={`Intake: ${pt.intake}`}
                    />
                    {/* Resolved Bar */}
                    <div
                      className="w-1/2 max-w-[14px] bg-emerald-500 rounded-t-sm transition group-hover:bg-emerald-400"
                      style={{ height: `${resolvedHeight}%` }}
                      title={`Resolved: ${pt.resolved}`}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate w-full text-center group-hover:text-foreground font-semibold">
                    {pt.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground border-t border-border/40 pt-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-sky-500" />
              <span>Reported Intake</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-emerald-500" />
              <span>Resolved Issues</span>
            </div>
          </div>
        </Card>

        {/* Right: Issue Status Distribution */}
        <Card className="rounded-3xl border border-border/80 bg-surface/95 p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-teal-700" />
              <h3 className="text-sm font-bold text-foreground">Status Distribution</h3>
            </div>
            <span className="text-xs text-muted-foreground font-semibold">{kpis.total} Total</span>
          </div>

          <div className="space-y-2 text-xs">
            {statusDistribution.map((st) => (
              <div key={st.key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium truncate">{st.label}</span>
                  <span className="font-bold text-foreground shrink-0">{st.count} <span className="text-[10px] font-normal text-muted-foreground">({st.pct}%)</span></span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                  <div className={`h-full rounded-full ${st.color}`} style={{ width: `${st.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* 4. Section 3 — Priority vs Severity Analytics */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* Priority: Operational Urgency */}
        <Card className="rounded-3xl border border-border/80 bg-surface/95 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-bold text-foreground">Issue Priority (Response Speed)</h3>
            </div>
            <span className="text-xs text-muted-foreground">Dispatch SLA</span>
          </div>

          <div className="space-y-3 text-xs">
            {priorityDistribution.map((p) => (
              <div key={p.key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={getAdminPriorityTone(p.key)} size="sm">{p.label}</Badge>
                  </div>
                  <span className="font-bold text-foreground">{p.count} issues <span className="text-muted-foreground font-normal">({p.pct}%)</span></span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                  <div className={`h-full ${p.color} rounded-full`} style={{ width: `${p.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Severity: Structural Hazard Impact */}
        <Card className="rounded-3xl border border-border/80 bg-surface/95 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-600" />
              <h3 className="text-sm font-bold text-foreground">Issue Severity (Physical Hazard)</h3>
            </div>
            <span className="text-xs text-muted-foreground">Risk Rating</span>
          </div>

          <div className="space-y-3 text-xs">
            {severityDistribution.map((s) => (
              <div key={s.key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={getAdminSeverityTone(s.key)} size="sm">{s.label}</Badge>
                  </div>
                  <span className="font-bold text-foreground">{s.count} issues <span className="text-muted-foreground font-normal">({s.pct}%)</span></span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                  <div className={`h-full ${s.color} rounded-full`} style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* 5. Section 4 — Department Performance & Resolution Velocity */}
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Department Performance Matrix Table */}
        <Card className="rounded-3xl border border-border/80 bg-surface/95 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-teal-700" />
              <h3 className="text-sm font-bold text-foreground">Department Performance Matrix</h3>
            </div>
            <span className="text-xs text-muted-foreground">{departmentStats.length} Departments</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/60 text-[10px] uppercase font-bold text-muted-foreground">
                  <th className="text-left py-2 px-1">Department</th>
                  <th className="text-right py-2 px-2">Total</th>
                  <th className="text-right py-2 px-2">Active</th>
                  <th className="text-right py-2 px-2">Done</th>
                  <th className="text-right py-2 px-2">Pending</th>
                  <th className="text-right py-2 px-2">Closure Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {departmentStats.map((dept) => (
                  <tr key={dept.id} className="hover:bg-muted/10 transition">
                    <td className="py-2.5 px-1 font-semibold text-foreground truncate max-w-[150px]">
                      {dept.name}
                    </td>
                    <td className="py-2.5 px-2 text-right font-medium text-foreground">{dept.total}</td>
                    <td className="py-2.5 px-2 text-right font-medium text-amber-700">{dept.inProgress}</td>
                    <td className="py-2.5 px-2 text-right font-medium text-emerald-700">{dept.completed}</td>
                    <td className="py-2.5 px-2 text-right font-medium text-muted-foreground">{dept.pending}</td>
                    <td className="py-2.5 px-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="w-12 h-1.5 rounded-full bg-muted/60 overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${dept.rate}%` }} />
                        </div>
                        <span className="font-bold text-[11px] text-foreground min-w-[28px]">{dept.rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Resolution Velocity by Department */}
        <Card className="rounded-3xl border border-border/80 bg-surface/95 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-teal-700" />
              <h3 className="text-sm font-bold text-foreground">Average Fix Velocity</h3>
            </div>
            <span className="text-xs text-muted-foreground">Department Speed</span>
          </div>

          <div className="space-y-3 text-xs">
            {departmentStats.slice(0, 6).map((dept) => (
              <div key={dept.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-foreground font-semibold truncate max-w-[160px]">{dept.name}</span>
                  <span className="text-muted-foreground font-bold">
                    {dept.avgHours !== null ? formatDurationFromHours(dept.avgHours) : "No data"}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{
                      width: `${Math.min(100, Math.max(10, dept.avgHours ? 100 - (dept.avgHours / 72) * 100 : 0))}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* 6. Section 5 — Geographic Hotspots & Recent Issues Log */}
      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        {/* Geographic Hotspots */}
        <Card className="rounded-3xl border border-border/80 bg-surface/95 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-teal-700" />
              <h3 className="text-sm font-bold text-foreground">Geographic Hotspots</h3>
            </div>
            <span className="text-xs text-muted-foreground">Top Locations</span>
          </div>

          <div className="space-y-2.5 text-xs">
            {locationHotspots.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No location records in this period.</p>
            ) : (
              locationHotspots.map((loc) => (
                <div key={loc.name} className="p-2.5 rounded-2xl border border-border/60 bg-background/50 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground truncate max-w-[180px]">{loc.name}</span>
                    <Badge variant="teal" size="sm">{loc.count} issues</Badge>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                    <div className="h-full bg-teal-600 rounded-full" style={{ width: `${loc.pct}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Recent Issues Table */}
        <Card className="rounded-3xl border border-border/80 bg-surface/95 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-teal-700" />
              <h3 className="text-sm font-bold text-foreground">Recent Issues In Triage</h3>
            </div>
            <Button asChild size="sm" variant="ghost" className="text-xs h-7 text-teal-800 font-semibold">
              <Link to="/app/admin/issues">View All →</Link>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/60 text-[10px] uppercase font-bold text-muted-foreground">
                  <th className="text-left py-2 px-1">ID & Title</th>
                  <th className="text-left py-2 px-2">Priority</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-right py-2 px-1">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {recentIssues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-muted/10 transition">
                    <td className="py-2 px-1 max-w-[160px]">
                      <span className="font-mono text-[10px] text-muted-foreground block">
                        #{issue.id.slice(0, 8).toUpperCase()}
                      </span>
                      <p className="font-semibold text-foreground truncate">{issue.title}</p>
                    </td>
                    <td className="py-2 px-2">
                      <Badge variant={getAdminPriorityTone(issue.priority)} size="sm">{issue.priority}</Badge>
                    </td>
                    <td className="py-2 px-2">
                      <Badge variant={getAdminIssueStatusTone(issue.status)} size="sm">{issue.status}</Badge>
                    </td>
                    <td className="py-2 px-1 text-right">
                      <Button asChild size="sm" variant="ghost" className="text-xs h-6 px-2 text-teal-800">
                        <Link to={`/app/admin/issues/${issue.id}`}>Inspect →</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}
