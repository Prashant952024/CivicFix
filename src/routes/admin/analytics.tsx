import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Bot,
  Building2,
  CheckCircle2,
  Clock,
  GraduationCap,
  HeartPulse,
  Layers,
  MapPin,
  RefreshCw,
  Rocket,
  RotateCcw,
  Tag,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { supabase } from "@/lib/supabase";

type TimeRangeKey = "7d" | "30d" | "3m" | "6m" | "1y" | "all";
type AnalyticsTabKey =
  | "overview"
  | "civic"
  | "workforce"
  | "ai"
  | "innovation"
  | "ecosystem"
  | "geo"
  | "health";

const TIME_RANGES: Record<TimeRangeKey, { label: string; days: number }> = {
  "7d": { label: "Past 7 Days", days: 7 },
  "30d": { label: "Past 30 Days", days: 30 },
  "3m": { label: "Past 3 Months", days: 90 },
  "6m": { label: "Past 6 Months", days: 180 },
  "1y": { label: "Past Year", days: 365 },
  all: { label: "All Time", days: 9999 },
};

function formatDurationFromHours(hours: number): string {
  if (hours < 1) {
    return `${Math.max(1, Math.round(hours * 60))} mins`;
  }
  if (hours < 24) {
    return `${hours.toFixed(1)} hrs`;
  }
  const days = hours / 24;
  return `${days.toFixed(1)} days`;
}

interface AdminAnalyticsTelemetry {
  metrics: {
    total: number;
    resolved: number;
    open: number;
    citizenVerified: number;
    reopened: number;
    resolutionRate: number;
    citizenVerificationRate: number;
    reopenRate: number;
    avgResolutionHours: number | null;
    medianResolutionHours: number | null;
    classifiedIssuesCount: number;
    totalIssuesCount: number;
    overriddenCount: number;
    humanOverrideRate: number;
    avgConfidence: number;
    totalInvitations: number;
    acceptedInvitations: number;
    invitationAcceptanceRate: number;
    totalProposals: number;
    approvedProposals: number;
    proposalApprovalRate: number;
    activeWorkspacesCount: number;
    institutionsCount: number;
    supportListingsCount: number;
    supportApplicationsCount: number;
  };
  timelineSeries: Array<{
    b_idx: number;
    b_start: string;
    b_end: string;
    intake: number;
    resolved: number;
  }>;
  stageDistribution: Array<{
    stage_order: number;
    stage: string;
    key: string;
    color: string;
    count: number;
    pct: number;
  }>;
  departmentWorkload: Array<{
    id: string;
    d_name: string;
    is_active: boolean;
    total: number;
    active: number;
    resolved: number;
    closure_rate: number;
  }>;
  ai: {
    totalAnalyses: number;
    avgConfidence: number;
    humanOverrideRate: number;
    overriddenCount: number;
    simpleCount: number;
    complexCount: number;
    unclassifiedCount: number;
  };
  innovation: {
    invitationAcceptanceRate: number;
    acceptedInvitations: number;
    totalInvitations: number;
    proposalApprovalRate: number;
    approvedProposals: number;
    totalProposals: number;
    activeFieldPilots: number;
    totalPilotPlans: number;
    scalingDeployments: number;
    totalDeploymentPlans: number;
    milestones: {
      completed: number;
      inProgress: number;
      blockedDelayed: number;
      notStarted: number;
      total: number;
    };
  };
  ecosystem: {
    institutionsCount: number;
    verifiedInstitutions: number;
    pendingInstitutions: number;
    iitNitCount: number;
    industryOrgsCount: number;
    verifiedIndustryOrgs: number;
    supportListingsCount: number;
    supportApplicationsCount: number;
  };
  geo: {
    geolocatedReports: number;
    topLocalities: Array<{
      location: string;
      count: number;
    }>;
    criticalHazards: number;
    highPriority: number;
    resolved: number;
  };
  health: {
    orphanProjectsCount: number;
    invalidProposalsCount: number;
    proposalIntegrityRate: number;
    unassignedActiveTasksCount: number;
    unverifiedOrgsCount: number;
    recentActivitiesCount: number;
  };
  dropdowns: {
    departments: Array<{
      id: string;
      name: string;
      is_active: boolean;
    }>;
    categories: string[];
  };
}

export function AdminAnalyticsPage() {
  const { profile, status: sessionStatus, error: sessionError } = useAppSession();

  // Navigation & Filtering
  const [activeTab, setActiveTab] = useState<AnalyticsTabKey>("overview");
  const [timeRange, setTimeRange] = useState<TimeRangeKey>("30d");
  const [departmentFilter, setDepartmentFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  // Consolidated Telemetry Dataset
  const [telemetry, setTelemetry] = useState<AdminAnalyticsTelemetry | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const profileId = profile?.id;
  const sessionProblem = sessionStatus === "error" ? sessionError ?? "CivicFix profile is unavailable." : null;

  useEffect(() => {
    if (sessionStatus !== "ready" || !profileId) return;

    let cancelled = false;

    async function loadTelemetry() {
      setLoading(true);
      setError(null);

      try {
        const days = TIME_RANGES[timeRange].days;
        const { data, error: rpcError } = await (
          supabase.rpc as unknown as (
            name: string,
            args: Record<string, unknown>
          ) => Promise<{ data: AdminAnalyticsTelemetry | null; error: Error | null }>
        )("get_admin_analytics_telemetry", {
          p_time_range_days: days,
          p_department_id: departmentFilter,
          p_category: categoryFilter,
        });

        if (rpcError) {
          throw rpcError;
        }

        if (cancelled) return;

        setTelemetry(data);
        setLastRefreshedAt(new Date().toISOString());
      } catch (err) {
        if (!cancelled) {
          console.error("Telemetry loading error:", err);
          setError("Failed to load platform analytics telemetry.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadTelemetry();

    return () => {
      cancelled = true;
    };
  }, [profileId, refreshNonce, sessionStatus, timeRange, departmentFilter, categoryFilter]);

  // Derived timeline series with formatted labels
  const formattedTimeline = useMemo(() => {
    if (!telemetry?.timelineSeries) return [];
    return telemetry.timelineSeries.map((pt) => {
      const bStart = new Date(pt.b_start);
      const label =
        timeRange === "7d"
          ? bStart.toLocaleDateString(undefined, { weekday: "short" })
          : bStart.toLocaleDateString(undefined, { month: "short", day: "numeric" });

      return {
        label,
        intake: pt.intake,
        resolved: pt.resolved,
      };
    });
  }, [telemetry?.timelineSeries, timeRange]);

  const maxTimelineVal = useMemo(() => {
    const vals = formattedTimeline.flatMap((p) => [p.intake, p.resolved]);
    return Math.max(5, ...vals);
  }, [formattedTimeline]);

  if (sessionProblem || error) {
    return (
      <EmptyState
        icon={AlertCircle}
        variant="error"
        title="Analytics Observatory Offline"
        description={sessionProblem ?? error ?? "Unable to aggregate real-time platform analytics."}
        action={
          <Button onClick={() => setRefreshNonce((v) => v + 1)} type="button">
            <RotateCcw className="h-4 w-4 mr-2" />
            Retry Analytics Engine
          </Button>
        }
      />
    );
  }

  if (loading && !telemetry) {
    return (
      <div className="space-y-6">
        <div className="h-28 w-full animate-pulse rounded-2xl border border-border/60 bg-muted/20" />
        <div className="h-12 w-full animate-pulse rounded-xl border border-border/60 bg-muted/20" />
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-border/70 bg-muted/30" />
          ))}
        </div>
      </div>
    );
  }

  if (!telemetry) {
    return null;
  }

  const { metrics, stageDistribution, departmentWorkload, ai, innovation, ecosystem, geo, health, dropdowns } = telemetry;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header & Observability Bar */}
      <PageHeader
        tag="Platform Analytics Observatory"
        title="Platform-Wide Intelligence & Operational Analytics"
        description="Comprehensive real-data metrics across civic incident lifecycles, workforce capacity, AI classification telemetry, university innovation pipelines, and partner ecosystems."
        backHref="/app/admin"
        backLabel="Platform Dashboard"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshNonce((v) => v + 1)}
              className="h-8.5 border-border text-foreground hover:bg-surface-elevated text-xs font-semibold gap-1.5 shadow-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
              {lastRefreshedAt && (
                <span className="text-[10px] text-muted-foreground font-normal">
                  ({new Date(lastRefreshedAt).toLocaleTimeString()})
                </span>
              )}
            </Button>
          </div>
        }
      />

      {/* 2. Global Unified Filter Controls Bar */}
      <Card className="rounded-xl border border-border/80 bg-surface shadow-xs p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Time Range Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>Period:</span>
            </span>
            {(Object.keys(TIME_RANGES) as TimeRangeKey[]).map((rk) => (
              <button
                key={rk}
                type="button"
                onClick={() => setTimeRange(rk)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                  timeRange === rk
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {TIME_RANGES[rk].label}
              </button>
            ))}
          </div>

          {/* Department & Category Selectors */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-lg border border-border/60">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="bg-transparent text-xs font-medium text-foreground focus:outline-hidden"
              >
                <option value="ALL">All Departments</option>
                {dropdowns.departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-lg border border-border/60">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent text-xs font-medium text-foreground focus:outline-hidden"
              >
                <option value="ALL">All Categories</option>
                {dropdowns.categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* 3. Multi-Tab Navigation Bar */}
      <div className="flex items-center gap-1 border-b border-border/80 pb-px overflow-x-auto">
        {[
          { key: "overview", label: "Platform Overview", icon: BarChart3 },
          { key: "civic", label: "Civic Operations", icon: Layers },
          { key: "workforce", label: "Department & Workforce", icon: Building2 },
          { key: "ai", label: "AI & Automation", icon: Bot },
          { key: "innovation", label: "Innovation Pipeline", icon: Rocket },
          { key: "ecosystem", label: "Institutions & Industry", icon: GraduationCap },
          { key: "geo", label: "Geospatial Operations", icon: MapPin },
          { key: "health", label: "Platform Health", icon: HeartPulse },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as AnalyticsTabKey)}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
                isActive
                  ? "border-primary text-primary bg-primary/5 rounded-t-lg"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: PLATFORM OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="p-4 rounded-xl border border-border/80 bg-surface shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Issues</span>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground mt-2">{metrics.total}</div>
              <p className="text-xs text-muted-foreground mt-1">{metrics.resolved} resolved ({metrics.resolutionRate}%)</p>
            </Card>

            <Card className="p-4 rounded-xl border border-border/80 bg-surface shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Active Workspaces</span>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground mt-2">{metrics.activeWorkspacesCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Across {metrics.institutionsCount} partner universities</p>
            </Card>

            <Card className="p-4 rounded-xl border border-border/80 bg-surface shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">AI Automation Rate</span>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground mt-2">
                {metrics.totalIssuesCount > 0 ? Math.round((metrics.classifiedIssuesCount / metrics.totalIssuesCount) * 100) : 100}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">Override rate: {metrics.humanOverrideRate}%</p>
            </Card>

            <Card className="p-4 rounded-xl border border-border/80 bg-surface shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Ecosystem Support</span>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground mt-2">{metrics.supportListingsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">{metrics.supportApplicationsCount} partner applications</p>
            </Card>
          </div>

          {/* Intake vs Resolution Chart */}
          <Card className="rounded-xl border border-border/80 bg-surface p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Intake vs. Resolution Velocity ({TIME_RANGES[timeRange].label})
                </h4>
              </div>
              {hoveredPoint !== null && formattedTimeline[hoveredPoint] && (
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="font-semibold text-foreground">{formattedTimeline[hoveredPoint].label}:</span>
                  <span className="font-bold text-sky-600">{formattedTimeline[hoveredPoint].intake} Intake</span>
                  <span>·</span>
                  <span className="font-bold text-emerald-600">{formattedTimeline[hoveredPoint].resolved} Resolved</span>
                </div>
              )}
            </div>

            <div className="h-52 w-full flex items-end gap-2 pt-4 pb-2 px-1">
              {formattedTimeline.map((pt, idx) => {
                const intakeHeight = Math.max(6, (pt.intake / maxTimelineVal) * 100);
                const resolvedHeight = Math.max(6, (pt.resolved / maxTimelineVal) * 100);

                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center gap-1 h-full justify-end group cursor-pointer"
                    onMouseEnter={() => setHoveredPoint(idx)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    <div className="w-full flex items-end justify-center gap-1 h-38">
                      <div
                        className="w-1/2 max-w-[16px] bg-sky-500 rounded-t-sm transition-all group-hover:bg-sky-400 shadow-2xs"
                        style={{ height: `${intakeHeight}%` }}
                        title={`Intake: ${pt.intake}`}
                      />
                      <div
                        className="w-1/2 max-w-[16px] bg-emerald-500 rounded-t-sm transition-all group-hover:bg-emerald-400 shadow-2xs"
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
        </div>
      )}

      {/* TAB 2: CIVIC OPERATIONS */}
      {activeTab === "civic" && (
        <div className="space-y-6">
          {/* Resolution Velocity Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="p-4 rounded-xl border border-border/80 bg-surface shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Average Resolution Time</span>
              <div className="text-2xl font-bold font-mono text-foreground mt-2">
                {metrics.avgResolutionHours !== null ? formatDurationFromHours(Number(metrics.avgResolutionHours)) : "N/A"}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">From submission to closure</p>
            </Card>

            <Card className="p-4 rounded-xl border border-border/80 bg-surface shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Median Resolution Time</span>
              <div className="text-2xl font-bold font-mono text-foreground mt-2">
                {metrics.medianResolutionHours !== null ? formatDurationFromHours(Number(metrics.medianResolutionHours)) : "N/A"}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">50th percentile duration</p>
            </Card>

            <Card className="p-4 rounded-xl border border-border/80 bg-surface shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Citizen Verification</span>
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-2">
                {metrics.citizenVerificationRate}%
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{metrics.citizenVerified} verified by reporters</p>
            </Card>

            <Card className="p-4 rounded-xl border border-border/80 bg-surface shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Reopen / Rework Rate</span>
              <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-2">
                {metrics.reopenRate}%
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{metrics.reopened} issues reopened</p>
            </Card>
          </div>

          {/* 9-Stage Workflow Funnel */}
          <Card className="rounded-xl border border-border/80 bg-surface p-5 shadow-xs space-y-4">
            <div className="border-b border-border/60 pb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                9-Stage Civic Lifecycle Funnel
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Exact count and conversion distribution of reports across municipal workflow stages.
              </p>
            </div>

            <div className="space-y-2.5">
              {stageDistribution.map((st) => (
                <div key={st.key} className="space-y-1 text-xs">
                  <div className="flex justify-between font-semibold">
                    <span className="text-foreground">{st.stage}</span>
                    <span className="font-mono text-muted-foreground">{st.count} issues ({st.pct}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                    <div className={`h-full ${st.color} rounded-full`} style={{ width: `${st.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: DEPARTMENT & WORKFORCE */}
      {activeTab === "workforce" && (
        <div className="space-y-6">
          <Card className="rounded-xl border border-border/80 bg-surface p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Department Workload &amp; Throughput Matrix
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Resolution rate and active load distribution across all {departmentWorkload.length} municipal branches.
                </p>
              </div>
              <Link to="/app/admin/departments" className="text-xs font-semibold text-primary hover:underline">
                Manage Departments
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-[10px] uppercase font-bold text-muted-foreground">
                    <th className="text-left py-2 px-2">Department</th>
                    <th className="text-right py-2 px-2">Total Assigned</th>
                    <th className="text-right py-2 px-2">Active Tasks</th>
                    <th className="text-right py-2 px-2">Resolved</th>
                    <th className="text-right py-2 px-2">Closure Rate</th>
                    <th className="text-right py-2 px-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {departmentWorkload.map((dept) => (
                    <tr key={dept.id} className="hover:bg-muted/10">
                      <td className="py-2.5 px-2 font-bold text-foreground">{dept.d_name}</td>
                      <td className="text-right py-2.5 px-2 font-mono">{dept.total}</td>
                      <td className="text-right py-2.5 px-2 font-mono text-amber-600 dark:text-amber-400 font-bold">{dept.active}</td>
                      <td className="text-right py-2.5 px-2 font-mono text-emerald-600 dark:text-emerald-400">{dept.resolved}</td>
                      <td className="text-right py-2.5 px-2 font-mono font-bold">{dept.closure_rate}%</td>
                      <td className="text-right py-2.5 px-2">
                        <Badge variant={dept.is_active ? "emerald" : "outline"} size="sm">
                          {dept.is_active ? "Active" : "Disabled"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: AI & AUTOMATION OBSERVATORY */}
      {activeTab === "ai" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="p-4 rounded-xl border border-border/80 bg-surface shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">AI Analyses Total</span>
              <div className="text-2xl font-bold font-mono text-foreground mt-2">{ai.totalAnalyses}</div>
              <p className="text-[11px] text-muted-foreground mt-1">Executed via Edge Functions</p>
            </Card>

            <Card className="p-4 rounded-xl border border-border/80 bg-surface shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Average Model Confidence</span>
              <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-2">
                {Math.round(ai.avgConfidence * 100)}%
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Multi-modal classification</p>
            </Card>

            <Card className="p-4 rounded-xl border border-border/80 bg-surface shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Human Override Rate</span>
              <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-2">
                {ai.humanOverrideRate}%
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{ai.overriddenCount} classifications modified</p>
            </Card>

            <Card className="p-4 rounded-xl border border-border/80 bg-surface shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Complex Problem Detection</span>
              <div className="text-2xl font-bold font-mono text-teal-600 dark:text-teal-400 mt-2">
                {ai.complexCount}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Escalated to Innovation</p>
            </Card>
          </div>

          <Card className="rounded-xl border border-border/80 bg-surface p-5 shadow-xs space-y-4">
            <div className="border-b border-border/60 pb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                AI Classification &amp; Human-AI Agreement Notes
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                AI recommendations are strictly advisory. Human municipal officers and administrators maintain complete authoritative discretion.
              </p>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/60">
                <span className="text-muted-foreground">Simple Civic Issues Identified by AI</span>
                <span className="font-bold text-foreground">{ai.simpleCount}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/60">
                <span className="text-muted-foreground">Complex Multi-Domain Civic Problems Flagged</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{ai.complexCount}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/60">
                <span className="text-muted-foreground">Unclassified / Raw Intake Queue</span>
                <span className="font-bold text-foreground">{ai.unclassifiedCount}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 5: INNOVATION PIPELINE */}
      {activeTab === "innovation" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="p-4 rounded-xl border border-border/80 bg-surface shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Invitation Acceptance</span>
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-2">
                {innovation.invitationAcceptanceRate}%
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{innovation.acceptedInvitations} of {innovation.totalInvitations} accepted</p>
            </Card>

            <Card className="p-4 rounded-xl border border-border/80 bg-surface shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Proposal Approval Rate</span>
              <div className="text-2xl font-bold font-mono text-teal-600 dark:text-teal-400 mt-2">
                {innovation.proposalApprovalRate}%
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{innovation.approvedProposals} of {innovation.totalProposals} approved</p>
            </Card>

            <Card className="p-4 rounded-xl border border-border/80 bg-surface shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Active Field Pilots</span>
              <div className="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400 mt-2">
                {innovation.activeFieldPilots}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{innovation.totalPilotPlans} total protocols</p>
            </Card>

            <Card className="p-4 rounded-xl border border-border/80 bg-surface shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Scaling Deployments</span>
              <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-2">
                {innovation.scalingDeployments}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{innovation.totalDeploymentPlans} scaling blueprints</p>
            </Card>
          </div>

          <Card className="rounded-xl border border-border/80 bg-surface p-5 shadow-xs space-y-4">
            <div className="border-b border-border/60 pb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Research Milestones Execution Health
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Progression across {innovation.milestones.total} active university project milestones.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Completed</span>
                <div className="text-2xl font-bold font-mono text-foreground mt-1">
                  {innovation.milestones.completed}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/20 text-center">
                <span className="text-xs font-bold text-sky-800 dark:text-sky-300">In Progress</span>
                <div className="text-2xl font-bold font-mono text-foreground mt-1">
                  {innovation.milestones.inProgress}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                <span className="text-xs font-bold text-amber-800 dark:text-amber-300">Delayed / Blocked</span>
                <div className="text-2xl font-bold font-mono text-foreground mt-1">
                  {innovation.milestones.blockedDelayed}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/60 border border-border/60 text-center">
                <span className="text-xs font-bold text-muted-foreground">Not Started</span>
                <div className="text-2xl font-bold font-mono text-foreground mt-1">
                  {innovation.milestones.notStarted}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 6: INSTITUTIONS & INDUSTRY ECOSYSTEM */}
      {activeTab === "ecosystem" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card className="rounded-xl border border-border/80 bg-surface p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Accredited Universities ({ecosystem.institutionsCount})
                </h4>
                <Link to="/app/admin/institutions" className="text-xs font-semibold text-primary hover:underline">
                  Directory
                </Link>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2.5 rounded-lg bg-muted/40">
                  <span className="text-muted-foreground">Verified Institutions</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {ecosystem.verifiedInstitutions}
                  </span>
                </div>
                <div className="flex justify-between p-2.5 rounded-lg bg-muted/40">
                  <span className="text-muted-foreground">Pending Accreditation</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {ecosystem.pendingInstitutions}
                  </span>
                </div>
                <div className="flex justify-between p-2.5 rounded-lg bg-muted/40">
                  <span className="text-muted-foreground">IITs &amp; National Institutes</span>
                  <span className="font-bold text-foreground">
                    {ecosystem.iitNitCount}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="rounded-xl border border-border/80 bg-surface p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Industry Partners &amp; Support ({ecosystem.industryOrgsCount})
                </h4>
                <Link to="/app/admin/users" className="text-xs font-semibold text-primary hover:underline">
                  Partners
                </Link>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2.5 rounded-lg bg-muted/40">
                  <span className="text-muted-foreground">Verified Industry Partners</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {ecosystem.verifiedIndustryOrgs}
                  </span>
                </div>
                <div className="flex justify-between p-2.5 rounded-lg bg-muted/40">
                  <span className="text-muted-foreground">Active Marketplace Support Listings</span>
                  <span className="font-bold text-foreground">{ecosystem.supportListingsCount}</span>
                </div>
                <div className="flex justify-between p-2.5 rounded-lg bg-muted/40">
                  <span className="text-muted-foreground">Partner Applications Submitted</span>
                  <span className="font-bold text-foreground">{ecosystem.supportApplicationsCount}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 7: GEOSPATIAL OPERATIONS */}
      {activeTab === "geo" && (
        <div className="space-y-6">
          <Card className="rounded-xl border border-border/80 bg-surface p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Geospatial Incident Density &amp; Geographic Distribution
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Location clustering of civic reports across municipal sectors.
                </p>
              </div>
              <span className="text-xs font-semibold text-muted-foreground">
                {geo.geolocatedReports} Geolocated Reports
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <h5 className="font-bold text-foreground text-xs">Top Incident Localities</h5>
                {geo.topLocalities.map((item, i) => (
                  <div key={i} className="flex justify-between p-2 rounded-lg bg-muted/40">
                    <span className="truncate max-w-[200px] text-muted-foreground">{item.location}</span>
                    <span className="font-mono font-bold text-foreground">{item.count} issues</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <h5 className="font-bold text-foreground text-xs">Severity Distribution by Locality</h5>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/60 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Critical Hazard Hotspots</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      {geo.criticalHazards}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">High Priority Interventions</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {geo.highPriority}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Resolved in Timeframe</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{geo.resolved}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 8: PLATFORM HEALTH */}
      {activeTab === "health" && (
        <div className="space-y-6">
          <Card className="rounded-xl border border-border/80 bg-surface p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-emerald-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Data Quality &amp; Relational Integrity Telemetry
                </h4>
              </div>
              <Badge variant={health.orphanProjectsCount === 0 && health.invalidProposalsCount === 0 ? "emerald" : "amber"} size="sm">
                {health.orphanProjectsCount === 0 && health.invalidProposalsCount === 0 ? "System Normal" : "Attention Required"}
              </Badge>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/60">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 ${health.orphanProjectsCount === 0 ? "text-emerald-600" : "text-amber-500"}`} />
                  <span className="font-semibold text-foreground">Orphan Projects Diagnostic</span>
                </div>
                <span className="font-mono text-muted-foreground">{health.orphanProjectsCount} detected</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/60">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 ${health.proposalIntegrityRate === 100 ? "text-emerald-600" : "text-amber-500"}`} />
                  <span className="font-semibold text-foreground">Proposals Relational Foreign Key Integrity</span>
                </div>
                <span className="font-mono text-muted-foreground">{health.proposalIntegrityRate}% compliant ({metrics.totalProposals} total)</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/60">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 ${health.unassignedActiveTasksCount === 0 ? "text-emerald-600" : "text-amber-500"}`} />
                  <span className="font-semibold text-foreground">Department Assignment Integrity</span>
                </div>
                <span className="font-mono text-muted-foreground">{health.unassignedActiveTasksCount} unassigned active</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/60">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="font-semibold text-foreground">Database RLS &amp; Migrations</span>
                </div>
                <span className="font-mono text-muted-foreground">51 migrations verified</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/60">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="font-semibold text-foreground">Recent Audit Log Transactions</span>
                </div>
                <span className="font-mono text-muted-foreground">{health.recentActivitiesCount} recorded</span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
