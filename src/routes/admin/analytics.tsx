import { useEffect, useMemo, useState } from "react";
import { AlertCircle, BarChart3, Building2, CheckCircle2, UsersRound, Workflow } from "lucide-react";

import { useAppSession } from "@/auth/app-session";
import { Button } from "@/components/ui/button";
import { formatAdminDateTime } from "@/lib/admin";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type IssueRow = Pick<
  Database["public"]["Tables"]["issues"]["Row"],
  "id" | "status" | "priority" | "severity" | "category" | "created_at" | "updated_at"
>;

type ProfileRow = Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "role_id" | "department_id"> & {
  role?: Pick<Database["public"]["Tables"]["roles"]["Row"], "code" | "name"> | null;
};

type DepartmentRow = Pick<Database["public"]["Tables"]["departments"]["Row"], "id" | "name" | "is_active">;
type HistoryRow = Pick<Database["public"]["Tables"]["issue_status_history"]["Row"], "id" | "issue_id" | "new_status" | "created_at">;

function buildBuckets(items: IssueRow[], getKey: (issue: IssueRow) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function AdminAnalyticsPage() {
  const { profile, status: sessionStatus, error: sessionError } = useAppSession();
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [activity, setActivity] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const sessionProblem = sessionStatus === "error" ? sessionError ?? "CivicFix profile is unavailable." : null;

  useEffect(() => {
    if (sessionStatus !== "ready" || !profile?.id) {
      return;
    }

    let cancelled = false;

    async function loadAnalytics() {
      setLoading(true);
      setError(null);

      const [issuesResult, profilesResult, departmentsResult, activityResult] = await Promise.all([
        supabase.from("issues").select("id, status, priority, severity, category, created_at, updated_at").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, role_id, department_id, role:roles(code, name)").order("created_at", { ascending: false }),
        supabase.from("departments").select("id, name, is_active").order("name", { ascending: true }),
        supabase.from("issue_status_history").select("id, issue_id, new_status, created_at").order("created_at", { ascending: false }).limit(12),
      ]);

      if (cancelled) {
        return;
      }

      const firstError = issuesResult.error ?? profilesResult.error ?? departmentsResult.error ?? activityResult.error;
      if (firstError) {
        if (import.meta.env.DEV) {
          console.error("Admin analytics load failed", firstError);
        }
        setError("Unable to load analytics right now.");
        setLoading(false);
        return;
      }

      setIssues(issuesResult.data ?? []);
      setProfiles(profilesResult.data ?? []);
      setDepartments(departmentsResult.data ?? []);
      setActivity(activityResult.data ?? []);
      setLoading(false);
    }

    void loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [profile?.id, refreshNonce, sessionStatus]);

  const stats = useMemo(() => {
    const totalUsers = profiles.length;
    const citizens = profiles.filter((entry) => entry.role?.code === "CITIZEN").length;
    const officers = profiles.filter((entry) => entry.role?.code === "MUNICIPAL_OFFICER").length;
    const workers = profiles.filter((entry) => entry.role?.code === "FIELD_WORKER").length;
    const totalIssues = issues.length;
    const resolvedIssues = issues.filter((issue) => ["RESOLVED", "CITIZEN_VERIFIED"].includes(issue.status)).length;
    const criticalIssues = issues.filter((issue) => issue.severity === "CRITICAL").length;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const recent7Days = issues.filter((issue) => new Date(issue.created_at).getTime() >= cutoff.getTime()).length;
    const activeDepartments = departments.filter((department) => department.is_active).length;
    return { totalUsers, citizens, officers, workers, totalIssues, resolvedIssues, criticalIssues, recent7Days, activeDepartments };
  }, [departments, issues, profiles]);

  const statusBuckets = useMemo(() => buildBuckets(issues, (issue) => issue.status), [issues]);
  const priorityBuckets = useMemo(() => buildBuckets(issues, (issue) => issue.priority), [issues]);
  const severityBuckets = useMemo(() => buildBuckets(issues, (issue) => issue.severity), [issues]);
  const categoryBuckets = useMemo(() => buildBuckets(issues, (issue) => issue.category), [issues]);

  const throughput = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const issue of issues) {
      const day = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(issue.created_at));
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }
    return Array.from(byDay.entries())
      .slice(0, 7)
      .map(([label, count]) => ({ label, count }))
      .reverse();
  }, [issues]);

  const maxStatus = Math.max(1, ...statusBuckets.map((entry) => entry.count));
  const maxPriority = Math.max(1, ...priorityBuckets.map((entry) => entry.count));
  const maxSeverity = Math.max(1, ...severityBuckets.map((entry) => entry.count));

  if (sessionProblem || error) {
    return (
      <section className="rounded-[1.75rem] border border-border/80 bg-white/82 p-6 shadow-lg shadow-teal-950/10">
        <div className="max-w-2xl space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-700">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Unable to load analytics</h2>
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
        <section className="rounded-[1.75rem] border border-teal-100/80 bg-[linear-gradient(135deg,rgba(15,118,110,0.12)_0%,rgba(2,132,199,0.10)_48%,rgba(124,58,237,0.08)_100%)] p-6 shadow-lg shadow-teal-950/10">
          <div className="space-y-3">
            <div className="h-4 w-44 animate-pulse rounded-full bg-muted/60" />
            <div className="h-9 w-full max-w-3xl animate-pulse rounded-2xl bg-muted/60" />
            <div className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-muted/40" />
          </div>
        </section>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-2xl border border-border/80 bg-surface/90" />
          ))}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.85rem] border border-teal-100/80 bg-[linear-gradient(135deg,rgba(15,118,110,0.14)_0%,rgba(2,132,199,0.12)_45%,rgba(124,58,237,0.10)_100%)] p-6 shadow-2xl shadow-teal-950/12">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center rounded-full border border-sky-200/80 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#0f5f59] shadow-sm shadow-teal-950/5">
              System analytics
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Operational intelligence</h2>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                Real metrics from the CivicFix schema, including issue throughput, role distribution, and platform activity signals.
              </p>
            </div>
          </div>
          <Button onClick={() => setRefreshNonce((value) => value + 1)} type="button" variant="outline">
            Refresh data
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total users", value: stats.totalUsers, icon: UsersRound },
          { label: "Total issues", value: stats.totalIssues, icon: BarChart3 },
          { label: "Resolved issues", value: stats.resolvedIssues, icon: CheckCircle2 },
          { label: "Critical issues", value: stats.criticalIssues, icon: Workflow },
          { label: "Reports in last 7 days", value: stats.recent7Days, icon: BarChart3 },
          { label: "Citizens", value: stats.citizens, icon: UsersRound },
          { label: "Officers", value: stats.officers, icon: Building2 },
          { label: "Workers", value: stats.workers, icon: UsersRound },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-border/80 bg-surface/90 p-5 shadow-sm shadow-teal-950/5">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-50 text-sky-700 ring-1 ring-sky-200">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-teal-950/5">
          <h3 className="text-lg font-semibold text-foreground">Issue throughput</h3>
          <div className="mt-5 space-y-3">
            {throughput.length > 0 ? (
              throughput.map((entry) => (
                <div key={entry.label} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-foreground">{entry.label}</span>
                    <span className="text-muted-foreground">{entry.count}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-muted/60">
                    <div className="h-full rounded-full bg-gradient-to-r from-teal-500 via-sky-400 to-violet-500" style={{ width: `${Math.max(8, (entry.count / Math.max(1, ...throughput.map((item) => item.count))) * 100)}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">No issues have been recorded yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-teal-950/5">
          <h3 className="text-lg font-semibold text-foreground">Activity snapshot</h3>
          <div className="mt-5 space-y-3">
            {activity.length > 0 ? (
              activity.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-medium text-foreground">Issue {entry.issue_id.slice(0, 8)}</p>
                    <span className="rounded-full border border-border/70 bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {entry.new_status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{formatAdminDateTime(entry.created_at)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">Recent audit entries will appear here once they are written.</p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
        <div className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-teal-950/5">
          <h3 className="text-lg font-semibold text-foreground">Issue status mix</h3>
          <div className="mt-5 space-y-3">
            {statusBuckets.length > 0 ? (
              statusBuckets.map((entry) => (
                <div key={entry.label} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-foreground">{entry.label}</span>
                    <span className="text-muted-foreground">{entry.count}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-muted/60">
                    <div className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-teal-500" style={{ width: `${(entry.count / maxStatus) * 100}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">No issue status data is available.</p>
            )}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-teal-950/5">
          <h3 className="text-lg font-semibold text-foreground">Priority mix</h3>
          <div className="mt-5 space-y-3">
            {priorityBuckets.length > 0 ? (
              priorityBuckets.map((entry) => (
                <div key={entry.label} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-foreground">{entry.label}</span>
                    <span className="text-muted-foreground">{entry.count}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-muted/60">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-400 to-rose-500" style={{ width: `${(entry.count / maxPriority) * 100}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">No priority data is available.</p>
            )}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-teal-950/5">
          <h3 className="text-lg font-semibold text-foreground">Severity mix</h3>
          <div className="mt-5 space-y-3">
            {severityBuckets.length > 0 ? (
              severityBuckets.map((entry) => (
                <div key={entry.label} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-foreground">{entry.label}</span>
                    <span className="text-muted-foreground">{entry.count}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-muted/60">
                    <div className="h-full rounded-full bg-gradient-to-r from-rose-500 via-orange-400 to-amber-500" style={{ width: `${(entry.count / maxSeverity) * 100}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">No severity data is available.</p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-teal-950/5">
          <h3 className="text-lg font-semibold text-foreground">Top categories</h3>
          <div className="mt-5 space-y-3">
            {categoryBuckets.length > 0 ? (
              categoryBuckets.slice(0, 8).map((entry) => (
                <div key={entry.label} className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-surface-elevated px-4 py-3 text-sm">
                  <span className="font-medium text-foreground">{entry.label}</span>
                  <span className="text-muted-foreground">{entry.count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">No categories are available yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-teal-950/5">
          <h3 className="text-lg font-semibold text-foreground">System notes</h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
              <p className="text-sm font-medium text-foreground">Active departments</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{stats.activeDepartments}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
              <p className="text-sm font-medium text-foreground">Resolved issues</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{stats.resolvedIssues}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
              <p className="text-sm font-medium text-foreground">Pending items</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{issues.filter((issue) => ["SUBMITTED", "AI_ANALYZED"].includes(issue.status)).length}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
              <p className="text-sm font-medium text-foreground">Recent activity</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{activity.length}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
