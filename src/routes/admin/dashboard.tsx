import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, Building2, CheckCircle2, ClipboardList, RefreshCw, ShieldCheck, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Button } from "@/components/ui/button";
import {
  formatAdminDateTime,
  getAdminInitials,
  getAdminIssueStatusTone,
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
  "id" | "status" | "priority" | "severity" | "category" | "title" | "created_at" | "updated_at"
>;

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

export function AdminDashboardPage() {
  const { profile, status: sessionStatus, error: sessionError } = useAppSession();
  const [state, setState] = useState<AdminDashboardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const sessionProblem = sessionStatus === "error" ? sessionError ?? "CivicFix profile is unavailable." : null;

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
          .select("id, status, priority, severity, category, title, created_at, updated_at")
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

    const totalUsers = profiles.length;
    const citizenCount = profiles.filter((entry) => entry.role?.code === "CITIZEN").length;
    const officerCount = profiles.filter((entry) => entry.role?.code === "MUNICIPAL_OFFICER").length;
    const workerCount = profiles.filter((entry) => entry.role?.code === "FIELD_WORKER").length;
    const totalIssues = issues.length;
    const pendingIssues = countIssuesByStatus(issues, ["SUBMITTED", "AI_ANALYZED"]);
    const activeIssues = countIssuesByStatus(issues, ["ASSIGNED", "IN_PROGRESS", "REOPENED"]);
    const underReviewIssues = countIssuesByStatus(issues, ["UNDER_REVIEW"]);
    const resolvedIssues = countIssuesByStatus(issues, ["RESOLVED", "CITIZEN_VERIFIED"]);
    const criticalIssues = countIssuesBySeverity(issues, "CRITICAL");

    return {
      totalUsers,
      citizenCount,
      officerCount,
      workerCount,
      totalIssues,
      pendingIssues,
      activeIssues,
      underReviewIssues,
      resolvedIssues,
      criticalIssues,
    };
  }, [state]);

  const activeAdmins = useMemo(() => {
    return (state?.profiles ?? []).filter((entry) => entry.role?.code === "ADMIN").length;
  }, [state]);

  const latestActivity = state?.activities ?? [];
  const recentUsers = (state?.profiles ?? []).slice(0, 4);
  const topIssues = (state?.issues ?? []).slice(0, 4);
  const departments = state?.departments ?? [];

  if (sessionProblem || error) {
    return (
      <section className="rounded-[1.75rem] border border-border/80 bg-white/82 p-6 shadow-lg shadow-teal-950/10">
        <div className="max-w-2xl space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-700">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Unable to load Admin dashboard</h2>
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
        <section className="relative overflow-hidden rounded-[1.9rem] border border-teal-100/80 bg-[linear-gradient(135deg,rgba(15,118,110,0.14)_0%,rgba(2,132,199,0.14)_45%,rgba(124,58,237,0.12)_100%)] p-6 shadow-2xl shadow-teal-950/10">
          <div className="space-y-3">
            <div className="h-4 w-48 animate-pulse rounded-full bg-white/50" />
            <div className="h-10 w-full max-w-3xl animate-pulse rounded-2xl bg-white/55" />
            <div className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-white/40" />
          </div>
        </section>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl border border-border/80 bg-surface/90" />
          ))}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative isolate overflow-hidden rounded-[1.9rem] border border-teal-100/80 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.24),transparent_34%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.24),transparent_30%),linear-gradient(135deg,rgba(15,118,110,0.14)_0%,rgba(2,132,199,0.14)_45%,rgba(124,58,237,0.12)_100%)] shadow-2xl shadow-teal-950/12">
        <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute right-0 top-10 h-44 w-44 rounded-full bg-sky-400/18 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-36 w-36 -translate-x-1/2 rounded-full bg-violet-400/12 blur-3xl" aria-hidden="true" />
        <div className="border-b border-white/40 bg-[linear-gradient(135deg,rgba(255,255,255,0.86)_0%,rgba(247,250,248,0.74)_100%)] px-6 py-6 backdrop-blur-md">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#0f5f59] shadow-sm shadow-teal-950/5">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                System Administration
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">CivicFix control center</h2>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  Monitor platform health, user composition, issue load, and the latest governance activity across the CivicFix system.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="shadow-md shadow-teal-950/15">
                <Link to="/app/admin/users">
                  Manage users
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/app/admin/issues">Review issues</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/app/admin/analytics">Open analytics</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 px-6 py-6 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Total Users", value: stats.totalUsers, icon: UsersRound, tone: "info" as const },
            { label: "Citizens", value: stats.citizenCount, icon: UsersRound, tone: "info" as const },
            { label: "Officers", value: stats.officerCount, icon: Building2, tone: "warning" as const },
            { label: "Workers", value: stats.workerCount, icon: RefreshCw, tone: "danger" as const },
            { label: "Total Issues", value: stats.totalIssues, icon: ClipboardList, tone: "info" as const },
            { label: "Pending", value: stats.pendingIssues, icon: ClipboardList, tone: "warning" as const },
            { label: "Active", value: stats.activeIssues, icon: RefreshCw, tone: "danger" as const },
            { label: "Under Review", value: stats.underReviewIssues, icon: ShieldCheck, tone: "default" as const },
            { label: "Resolved", value: stats.resolvedIssues, icon: CheckCircle2, tone: "success" as const },
            { label: "Critical", value: stats.criticalIssues, icon: CheckCircle2, tone: "danger" as const },
          ].map(({ label, value, icon: Icon, tone }) => (
            <div
              key={label}
              className="relative overflow-hidden rounded-2xl border border-white/50 bg-white/78 p-5 shadow-sm shadow-teal-950/8 backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div
                className={[
                  "absolute inset-x-0 top-0 h-1",
                  tone === "success"
                    ? "bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500"
                    : tone === "warning"
                      ? "bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500"
                      : tone === "danger"
                        ? "bg-gradient-to-r from-orange-500 via-rose-500 to-red-500"
                        : "bg-gradient-to-r from-sky-500 via-cyan-400 to-teal-500",
                ].join(" ")}
              />
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <span
                  className={[
                    "inline-flex h-9 w-9 items-center justify-center rounded-full ring-1",
                    tone === "success"
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      : tone === "warning"
                        ? "bg-amber-50 text-amber-700 ring-amber-200"
                        : tone === "danger"
                          ? "bg-rose-50 text-rose-700 ring-rose-200"
                          : "bg-sky-50 text-sky-700 ring-sky-200",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-teal-950/5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Governance summary</p>
              <h3 className="mt-1 text-xl font-semibold text-foreground">Platform composition at a glance</h3>
            </div>
            <div className="rounded-full border border-border/70 bg-surface-elevated px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {activeAdmins} active admins
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Citizen", count: stats.citizenCount, tone: getAdminRoleTone("CITIZEN") },
              { label: "Municipal Officer", count: stats.officerCount, tone: getAdminRoleTone("MUNICIPAL_OFFICER") },
              { label: "Field Worker", count: stats.workerCount, tone: getAdminRoleTone("FIELD_WORKER") },
              { label: "Admin", count: activeAdmins, tone: getAdminRoleTone("ADMIN") },
            ].map((entry) => (
              <div key={entry.label} className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-muted-foreground">{entry.label}</p>
                  <span
                    className={[
                      "inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ring-1",
                      entry.tone === "success"
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        : entry.tone === "warning"
                          ? "bg-amber-50 text-amber-700 ring-amber-200"
                          : entry.tone === "danger"
                            ? "bg-rose-50 text-rose-700 ring-rose-200"
                            : "bg-sky-50 text-sky-700 ring-sky-200",
                    ].join(" ")}
                  >
                    {getAdminInitials(entry.label)}
                  </span>
                </div>
                <p className="mt-3 text-2xl font-semibold text-foreground">{entry.count}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-teal-950/5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Recent activity</p>
          <div className="mt-4 space-y-3">
            {latestActivity.length > 0 ? (
              latestActivity.map((activity) => (
                <div key={activity.id} className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {activity.issue?.title ?? "Issue activity"}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {activity.old_status ? `${activity.old_status} -> ` : ""}
                        {activity.new_status}
                      </p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${activity.new_status ? (getAdminIssueStatusTone(activity.new_status) === "success" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : getAdminIssueStatusTone(activity.new_status) === "warning" ? "bg-amber-50 text-amber-700 ring-amber-200" : getAdminIssueStatusTone(activity.new_status) === "danger" ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-sky-50 text-sky-700 ring-sky-200") : "bg-slate-100 text-slate-700 ring-slate-200"}`}>
                      {activity.new_status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {activity.changed_by_profile?.full_name?.trim() || activity.changed_by_profile?.email || "System"} · {formatAdminDateTime(activity.created_at)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 bg-surface-elevated px-4 py-6 text-sm leading-6 text-muted-foreground">
                No recent audit activity is available yet.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
        <div className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-teal-950/5">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-foreground">Recent users</h3>
            <Button asChild size="sm" variant="outline">
              <Link to="/app/admin/users">Open user management</Link>
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {recentUsers.length > 0 ? (
              recentUsers.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-surface-elevated p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{entry.full_name || entry.email || "Unnamed user"}</p>
                    <p className="truncate text-sm text-muted-foreground">{entry.email || entry.clerk_user_id}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${entry.role?.code === "ADMIN" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : entry.role?.code === "MUNICIPAL_OFFICER" ? "bg-amber-50 text-amber-700 ring-amber-200" : entry.role?.code === "FIELD_WORKER" ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-sky-50 text-sky-700 ring-sky-200"}`}>
                    {entry.role?.name ?? "Citizen"}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 bg-surface-elevated px-4 py-6 text-sm text-muted-foreground">
                No user records available.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-teal-950/5">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-foreground">Critical issues</h3>
            <Button asChild size="sm" variant="outline">
              <Link to="/app/admin/issues">Open issue monitoring</Link>
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {topIssues.filter((issue) => issue.severity === "CRITICAL" || issue.priority === "URGENT").length > 0 ? (
              topIssues
                .filter((issue) => issue.severity === "CRITICAL" || issue.priority === "URGENT")
                .slice(0, 3)
                .map((issue) => (
                  <div key={issue.id} className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{issue.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{issue.category}</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${issue.severity === "CRITICAL" ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-amber-50 text-amber-700 ring-amber-200"}`}>
                        {issue.severity}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {issue.priority} priority · Updated {formatAdminDateTime(issue.updated_at)}
                    </p>
                  </div>
                ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 bg-surface-elevated px-4 py-6 text-sm text-muted-foreground">
                No critical issues are currently flagged.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-teal-950/5">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-foreground">Department overview</h3>
            <Button asChild size="sm" variant="outline">
              <Link to="/app/admin/departments">Open departments</Link>
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {departments.length > 0 ? (
              departments.slice(0, 4).map((department) => (
                <div key={department.id} className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-foreground">{department.name}</p>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${department.is_active ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-700 ring-slate-200"}`}>
                      {department.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{department.description || "No description provided."}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 bg-surface-elevated px-4 py-6 text-sm text-muted-foreground">
                No departments are configured yet.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
