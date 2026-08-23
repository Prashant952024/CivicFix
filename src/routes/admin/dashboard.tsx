import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock3,
  Layers,
  MapPin,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  formatAdminDate,
  formatAdminDateTime,
  getAdminInitials,
  getAdminIssueStatusTone,
  getAdminPriorityTone,
  getAdminRoleTone,
} from "@/lib/admin";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"] & {
  role?: Pick<Database["public"]["Tables"]["roles"]["Row"], "code" | "name"> | null;
  department?: Pick<Database["public"]["Tables"]["departments"]["Row"], "id" | "name" | "is_active"> | null;
};

type IssueRow = Pick<
  Database["public"]["Tables"]["issues"]["Row"],
  "id" | "status" | "priority" | "severity" | "category" | "title" | "created_at" | "updated_at" | "location_text" | "address_text"
>;

type IssueAssignmentRow = Database["public"]["Tables"]["issue_assignments"]["Row"] & {
  department?: Pick<Database["public"]["Tables"]["departments"]["Row"], "id" | "name" | "is_active"> | null;
  worker?: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email"> | null;
  assigned_by_profile?: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email"> | null;
};

type HistoryRow = Pick<
  Database["public"]["Tables"]["issue_status_history"]["Row"],
  "id" | "issue_id" | "old_status" | "new_status" | "notes" | "created_at"
> & {
  issue?: Pick<Database["public"]["Tables"]["issues"]["Row"], "id" | "title" | "category"> | null;
  changed_by_profile?: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email"> | null;
};

type DepartmentRow = Database["public"]["Tables"]["departments"]["Row"];

type AdminDashboardState = {
  profiles: ProfileRow[];
  issues: IssueRow[];
  activities: HistoryRow[];
  departments: DepartmentRow[];
};

function countIssuesByStatus(issues: IssueRow[], statuses: Array<IssueRow["status"]>) {
  return issues.filter((issue) => statuses.includes(issue.status)).length;
}

function countIssuesBySeverity(issues: IssueRow[], severity: IssueRow["severity"]) {
  return issues.filter((issue) => issue.severity === severity).length;
}

function isResolvedLikeIssue(status: IssueRow["status"]) {
  return status === "RESOLVED" || status === "CITIZEN_VERIFIED";
}

function getCurrentAssignment(issue: IssueRow & { issue_assignments?: IssueAssignmentRow[] | null }) {
  const assignments = [...(issue.issue_assignments ?? [])].sort(
    (a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime(),
  );
  return assignments.find((assignment) => assignment.unassigned_at === null) ?? assignments[0] ?? null;
}

export function AdminDashboardPage() {
  const { profile, status: sessionStatus, error: sessionError } = useAppSession();
  const [state, setState] = useState<AdminDashboardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const sessionProblem = sessionStatus === "error" ? sessionError ?? "CivicFix profile is unavailable." : null;
  const snapshotTimeMs = lastRefreshedAt ? new Date(lastRefreshedAt).getTime() : null;

  useEffect(() => {
    if (sessionStatus !== "ready" || !profile?.id) {
      return;
    }

    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError(null);

      const [profilesResult, issuesResult, activitiesResult, departmentsResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, clerk_user_id, full_name, email, phone, role_id, department_id, created_at, updated_at, role:roles(code, name), department:departments(id, name, is_active)")
          .order("created_at", { ascending: false }),
        supabase
          .from("issues")
          .select(
            `
            id,
            status,
            priority,
            severity,
            category,
            title,
            location_text,
            address_text,
            created_at,
            updated_at,
            issue_assignments(
              id,
              issue_id,
              department_id,
              worker_id,
              assigned_by_profile_id,
              status,
              assigned_at,
              unassigned_at,
              department:departments(id, name, is_active),
              worker:profiles!issue_assignments_worker_id_fkey(id, full_name, email),
              assigned_by_profile:profiles!issue_assignments_assigned_by_profile_id_fkey(id, full_name, email)
            )
          `,
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("issue_status_history")
          .select("id, issue_id, old_status, new_status, notes, created_at, issue:issues(id, title, category), changed_by_profile:profiles(id, full_name, email)")
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("departments")
          .select("id, name, description, is_active, created_at, updated_at")
          .order("name", { ascending: true }),
      ]);

      if (cancelled) {
        return;
      }

      const firstError = profilesResult.error ?? issuesResult.error ?? activitiesResult.error ?? departmentsResult.error;
      if (firstError) {
        if (import.meta.env.DEV) {
          console.error("Admin dashboard load failed", firstError);
        }
        setError("Unable to load the Admin dashboard.");
        setState(null);
        setLoading(false);
        return;
      }

      setState({
        profiles: profilesResult.data ?? [],
        issues: issuesResult.data ?? [],
        activities: activitiesResult.data ?? [],
        departments: departmentsResult.data ?? [],
      });
      setLastRefreshedAt(new Date().toISOString());
      setLoading(false);
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [profile?.id, refreshNonce, sessionStatus]);

  const stats = useMemo(() => {
    const profiles = state?.profiles ?? [];
    const issues = state?.issues ?? [];
    const staleThresholdMs = 21 * 24 * 60 * 60 * 1000;
    const now = snapshotTimeMs ?? 0;

    const totalUsers = profiles.length;
    const totalAdmins = profiles.filter((entry) => entry.role?.code === "ADMIN").length;
    const citizenCount = profiles.filter((entry) => entry.role?.code === "CITIZEN").length;
    const officerCount = profiles.filter((entry) => entry.role?.code === "MUNICIPAL_OFFICER").length;
    const workerCount = profiles.filter((entry) => entry.role?.code === "FIELD_WORKER").length;
    const totalIssues = issues.length;
    const pendingIssues = countIssuesByStatus(issues, ["SUBMITTED", "AI_ANALYZED"]);
    const activeIssues = countIssuesByStatus(issues, ["ASSIGNED", "IN_PROGRESS", "REOPENED"]);
    const underReviewIssues = countIssuesByStatus(issues, ["UNDER_REVIEW"]);
    const resolvedIssues = countIssuesByStatus(issues, ["RESOLVED", "CITIZEN_VERIFIED"]);
    const unresolvedIssues = issues.filter((issue) => !isResolvedLikeIssue(issue.status));
    const unassignedIssues = unresolvedIssues.filter((issue) => !getCurrentAssignment(issue));
    const reopenedIssues = countIssuesByStatus(issues, ["REOPENED"]);
    const staleIssues = snapshotTimeMs
      ? unresolvedIssues.filter((issue) => now - new Date(issue.updated_at).getTime() > staleThresholdMs)
      : [];
    const criticalIssues = countIssuesBySeverity(issues, "CRITICAL");
    const resolutionRate = totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 0;

    return {
      totalUsers,
      totalAdmins,
      citizenCount,
      officerCount,
      workerCount,
      totalIssues,
      pendingIssues,
      activeIssues,
      underReviewIssues,
      resolvedIssues,
      unassignedIssues: unassignedIssues.length,
      reopenedIssues,
      staleIssues: staleIssues.length,
      criticalIssues,
      resolutionRate,
    };
  }, [snapshotTimeMs, state]);

  const activeAdmins = useMemo(() => {
    return (state?.profiles ?? []).filter((entry) => entry.role?.code === "ADMIN").length;
  }, [state]);

  const monitoringIssues = useMemo(() => {
    const issues = state?.issues ?? [];
    const staleThresholdMs = 21 * 24 * 60 * 60 * 1000;
    const now = snapshotTimeMs ?? 0;

    return [...issues]
      .filter((issue) => !isResolvedLikeIssue(issue.status))
      .sort((a, b) => {
        const aNeedsAttention =
          a.status === "REOPENED" || a.status === "UNDER_REVIEW" || a.status === "AI_ANALYZED" || a.status === "SUBMITTED";
        const bNeedsAttention =
          b.status === "REOPENED" || b.status === "UNDER_REVIEW" || b.status === "AI_ANALYZED" || b.status === "SUBMITTED";
        if (aNeedsAttention !== bNeedsAttention) {
          return aNeedsAttention ? -1 : 1;
        }

        const aStale = snapshotTimeMs ? now - new Date(a.updated_at).getTime() > staleThresholdMs : false;
        const bStale = snapshotTimeMs ? now - new Date(b.updated_at).getTime() > staleThresholdMs : false;
        if (aStale !== bStale) {
          return aStale ? -1 : 1;
        }

        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      })
      .slice(0, 4);
  }, [snapshotTimeMs, state]);

  const systemHealth = useMemo(() => {
    const totalDepartments = state?.departments.length ?? 0;
    const activeDepartments = (state?.departments ?? []).filter((department) => department.is_active).length;

    return [
      {
        label: "Auth Session",
        value: profile?.full_name?.trim() || profile?.email || "Admin session ready",
        status: "Operational",
        tone: "success" as const,
      },
      {
        label: "Database Feed",
        value: lastRefreshedAt ? `Synced ${formatAdminDateTime(lastRefreshedAt)}` : "Awaiting refresh",
        status: "Operational",
        tone: "info" as const,
      },
      {
        label: "Department Coverage",
        value: `${activeDepartments}/${totalDepartments} active departments`,
        status: activeDepartments === totalDepartments ? "Full" : "Partial",
        tone: activeDepartments === totalDepartments ? ("success" as const) : activeDepartments > 0 ? ("warning" as const) : ("danger" as const),
      },
      {
        label: "User Accounts",
        value: `${stats.totalUsers} accounts (${stats.totalAdmins} admins)`,
        status: "Active",
        tone: stats.totalAdmins > 0 ? ("success" as const) : ("warning" as const),
      },
      {
        label: "Issue Volume",
        value: `${stats.totalIssues} total records logged`,
        status: "Live",
        tone: stats.totalIssues > 0 ? ("success" as const) : ("warning" as const),
      },
      {
        label: "Attention Queue",
        value: `${stats.unassignedIssues} unassigned · ${stats.staleIssues} stale`,
        status: stats.unassignedIssues > 0 || stats.staleIssues > 0 ? "Action Needed" : "Clear",
        tone: stats.unassignedIssues > 0 || stats.staleIssues > 0 ? ("danger" as const) : ("success" as const),
      },
    ];
  }, [lastRefreshedAt, profile?.email, profile?.full_name, state?.departments, stats.totalAdmins, stats.totalIssues, stats.totalUsers, stats.staleIssues, stats.unassignedIssues]);

  const latestActivity = state?.activities ?? [];
  const recentUsers = (state?.profiles ?? []).slice(0, 4);
  const topIssues = (state?.issues ?? []).slice(0, 4);
  const departments = state?.departments ?? [];

  if (sessionProblem || error) {
    return (
      <EmptyState
        icon={AlertCircle}
        variant="error"
        title="Admin Dashboard Unavailable"
        description={sessionProblem ?? error ?? "Unable to load the Admin dashboard."}
        action={
          <Button onClick={() => setRefreshNonce((value) => value + 1)} type="button">
            Try Again
          </Button>
        }
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-44 w-full animate-pulse rounded-[1.85rem] border border-teal-100/80 bg-teal-50/40" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl border border-border/80 bg-surface/90" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-[1.75rem] border border-border/80 bg-surface/90" />
          <div className="h-80 animate-pulse rounded-[1.75rem] border border-border/80 bg-surface/90" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Standard Page Header */}
      <PageHeader
        tag="System Administration"
        title="CivicFix Control Center"
        description="Monitor system-wide platform health, municipal departments, field workers, and governance activity."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="default">
              <Link to="/app/admin/users" state={{ openCreateModal: true }}>
                <UserPlus className="h-4 w-4 mr-1.5" />
                Create User
              </Link>
            </Button>
            <Button asChild variant="outline" size="default">
              <Link to="/app/admin/users">Manage Users</Link>
            </Button>
            <Button asChild variant="outline" size="default">
              <Link to="/app/admin/issues">Review Issues</Link>
            </Button>
            <Button asChild variant="outline" size="default">
              <Link to="/app/admin/analytics">
                <BarChart3 className="h-4 w-4 mr-1.5" />
                Analytics
              </Link>
            </Button>
            <Button onClick={() => setRefreshNonce((value) => value + 1)} size="sm" type="button" variant="ghost">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {/* 2. Core System Metrics (Compact 2x5 Grid) */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Total Users", value: stats.totalUsers, icon: UsersRound, tone: "info" as const },
          { label: "Citizens", value: stats.citizenCount, icon: UsersRound, tone: "info" as const },
          { label: "Officers", value: stats.officerCount, icon: Building2, tone: "warning" as const },
          { label: "Field Workers", value: stats.workerCount, icon: RefreshCw, tone: "danger" as const },
          { label: "Total Issues", value: stats.totalIssues, icon: Layers, tone: "info" as const },
          { label: "Pending", value: stats.pendingIssues, icon: Clock3, tone: "warning" as const },
          { label: "In Progress", value: stats.activeIssues, icon: Activity, tone: "danger" as const },
          { label: "Under Review", value: stats.underReviewIssues, icon: ShieldCheck, tone: "default" as const },
          { label: "Resolved", value: stats.resolvedIssues, icon: CheckCircle2, tone: "success" as const },
          { label: "Critical Priority", value: stats.criticalIssues, icon: ShieldAlert, tone: "danger" as const },
        ].map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className="border border-border/80 bg-surface/95 shadow-sm transition hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl border ${
                    tone === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : tone === "warning"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : tone === "danger"
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-sky-200 bg-sky-50 text-sky-700"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
              </div>
              <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 3. High-Priority Needs Attention & System Health Grid */}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] items-start">
        {/* Needs Attention Container */}
        <Card className="border-2 border-amber-200/90 bg-gradient-to-br from-amber-50/30 via-surface to-surface shadow-sm">
          <CardHeader className="pb-3 border-b border-border/60 bg-gradient-to-r from-amber-50/60 via-surface to-rose-50/40">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-300 bg-amber-100 text-amber-800">
                  <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-foreground">Needs Immediate Attention</CardTitle>
                  <p className="text-xs text-muted-foreground">High-urgency, unassigned, or stale issue escalations</p>
                </div>
              </div>
              <Badge variant="warning" size="sm">
                {stats.unassignedIssues} unassigned · {stats.staleIssues} stale
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-5 space-y-3">
            {monitoringIssues.length > 0 ? (
              monitoringIssues.map((issue) => {
                const assignment = getCurrentAssignment(issue);
                const isStale = snapshotTimeMs
                  ? snapshotTimeMs - new Date(issue.updated_at).getTime() > 21 * 24 * 60 * 60 * 1000
                  : false;
                const statusTone = getAdminIssueStatusTone(issue.status);
                const priorityTone = getAdminPriorityTone(issue.priority);

                return (
                  <div
                    key={issue.id}
                    className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-foreground text-sm truncate">{issue.title}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span className="font-medium">{issue.category}</span>
                          <span>·</span>
                          <span>Updated {formatAdminDateTime(issue.updated_at)}</span>
                          {issue.location_text && (
                            <>
                              <span>·</span>
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {issue.location_text}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <Badge variant={statusTone} size="sm">
                          {issue.status.split("_").join(" ")}
                        </Badge>
                        <Badge variant={priorityTone} size="sm">
                          {issue.priority}
                        </Badge>
                        {isStale && (
                          <Badge variant="danger" size="sm">
                            Stale (21d+)
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60 text-xs">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {assignment?.department?.name ?? "No department"}
                        </span>
                        <span>•</span>
                        <span>{assignment?.worker?.full_name?.trim() || assignment?.worker?.email || "No worker assigned"}</span>
                      </div>
                      <Button asChild size="sm" variant="outline" className="text-xs h-8">
                        <Link to={`/app/admin/issues/${issue.id}`}>
                          Inspect Issue
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 bg-surface/60 p-8 text-center text-sm text-muted-foreground">
                All queues are clear. No issues currently require admin escalation.
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Health Status Panel */}
        <Card className="border border-border/80 bg-surface/95 shadow-sm">
          <CardHeader className="pb-3 border-b border-border/60 bg-gradient-to-r from-teal-50/50 via-surface to-sky-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 text-teal-700">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-foreground">System Health & Telemetry</CardTitle>
                  <p className="text-xs text-muted-foreground">Operational status of core CivicFix services</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground">
                {lastRefreshedAt ? formatAdminDateTime(lastRefreshedAt) : "Live"}
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className="grid gap-2.5 sm:grid-cols-2">
              {systemHealth.map((item) => (
                <div key={item.label} className="rounded-2xl border border-border/70 bg-background/50 p-3.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</p>
                    <Badge variant={item.tone} size="sm">
                      {item.status}
                    </Badge>
                  </div>
                  <p className="text-xs font-medium text-foreground truncate">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Resolution Rate Banner */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-900">Overall Closure Rate</p>
                <p className="text-xs text-emerald-800 mt-0.5">
                  {stats.resolvedIssues} of {stats.totalIssues} issues resolved or citizen-verified
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-extrabold text-emerald-800">{stats.resolutionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Governance Composition & Audit Activity */}
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] items-start">
        {/* Governance / Roles Breakdown */}
        <Card className="border border-border/80 bg-surface/95 shadow-sm">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UsersRound className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-bold text-foreground">Governance Composition</CardTitle>
              </div>
              <Badge variant="teal" size="sm">
                {activeAdmins} active admins
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Citizen", count: stats.citizenCount, tone: getAdminRoleTone("CITIZEN") },
                { label: "Officer", count: stats.officerCount, tone: getAdminRoleTone("MUNICIPAL_OFFICER") },
                { label: "Field Worker", count: stats.workerCount, tone: getAdminRoleTone("FIELD_WORKER") },
                { label: "Admin", count: activeAdmins, tone: getAdminRoleTone("ADMIN") },
              ].map((entry) => (
                <div key={entry.label} className="rounded-2xl border border-border/70 bg-background/50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{entry.label}</p>
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-xl text-[10px] font-bold ${
                        entry.tone === "success"
                          ? "bg-emerald-100 text-emerald-800"
                          : entry.tone === "warning"
                            ? "bg-amber-100 text-amber-800"
                            : entry.tone === "danger"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-sky-100 text-sky-800"
                      }`}
                    >
                      {getAdminInitials(entry.label)}
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-foreground">{entry.count}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Audit Activity */}
        <Card className="border border-border/80 bg-surface/95 shadow-sm">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-teal-600" />
                <CardTitle className="text-base font-bold text-foreground">Recent Audit Activity</CardTitle>
              </div>
              <span className="text-xs text-muted-foreground">{latestActivity.length} recent events</span>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-2.5">
            {latestActivity.length > 0 ? (
              latestActivity.map((activity) => (
                <div key={activity.id} className="rounded-xl border border-border/60 bg-background/50 p-3 text-xs">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-bold text-foreground truncate">{activity.issue?.title ?? "Issue status change"}</p>
                    <Badge variant={activity.new_status ? getAdminIssueStatusTone(activity.new_status) : "default"} size="sm">
                      {activity.new_status ?? "Updated"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground truncate">
                    {activity.changed_by_profile?.full_name?.trim() || activity.changed_by_profile?.email || "System"} · {formatAdminDateTime(activity.created_at)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">No audit events logged yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 5. Tri-Column Supporting Breakdowns */}
      <div className="grid gap-6 lg:grid-cols-3 items-start">
        {/* Recent Users */}
        <Card className="border border-border/80 bg-surface/95 shadow-sm">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-foreground">Recent Accounts</CardTitle>
              <Button asChild size="sm" variant="ghost" className="text-xs h-7 px-2 text-primary">
                <Link to="/app/admin/users">View all →</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            {recentUsers.length > 0 ? (
              recentUsers.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/50 p-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{entry.full_name || entry.email || "User"}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{entry.email}</p>
                  </div>
                  <Badge variant={entry.role?.code === "ADMIN" ? "success" : entry.role?.code === "MUNICIPAL_OFFICER" ? "warning" : entry.role?.code === "FIELD_WORKER" ? "danger" : "info"} size="sm">
                    {entry.role?.name ?? "Citizen"}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-3">No user records.</p>
            )}
          </CardContent>
        </Card>

        {/* Critical Issues */}
        <Card className="border border-border/80 bg-surface/95 shadow-sm">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-foreground">Critical Issues</CardTitle>
              <Button asChild size="sm" variant="ghost" className="text-xs h-7 px-2 text-primary">
                <Link to="/app/admin/issues">View all →</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            {topIssues.filter((issue) => issue.severity === "CRITICAL" || issue.priority === "URGENT").length > 0 ? (
              topIssues
                .filter((issue) => issue.severity === "CRITICAL" || issue.priority === "URGENT")
                .slice(0, 3)
                .map((issue) => (
                  <div key={issue.id} className="rounded-xl border border-border/60 bg-background/50 p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-xs font-bold text-foreground truncate">{issue.title}</p>
                      <Badge variant="danger" size="sm">
                        {issue.severity}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {issue.priority} Priority · {formatAdminDate(issue.updated_at)}
                    </p>
                  </div>
                ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-3">No critical issues flagged.</p>
            )}
          </CardContent>
        </Card>

        {/* Department Overview */}
        <Card className="border border-border/80 bg-surface/95 shadow-sm">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-foreground">Departments</CardTitle>
              <Button asChild size="sm" variant="ghost" className="text-xs h-7 px-2 text-primary">
                <Link to="/app/admin/departments">Manage →</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            {departments.length > 0 ? (
              departments.slice(0, 3).map((dept) => (
                <div key={dept.id} className="rounded-xl border border-border/60 bg-background/50 p-3">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className="text-xs font-bold text-foreground">{dept.name}</p>
                    <Badge variant={dept.is_active ? "success" : "default"} size="sm">
                      {dept.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{dept.description || "No description."}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-3">No departments configured.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

