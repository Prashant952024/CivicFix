import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  CheckCircle2,
  ClipboardList,
  Gauge,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  formatOfficerIssueDateTime,
  getOfficerIssueSeverityLabel,
  getOfficerIssueSeverityTone,
  getOfficerIssueStatusLabel,
  getOfficerIssueStatusTone,
  type OfficerIssueStatus,
} from "@/lib/officer-issues";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type DashboardIssueRow = Pick<
  Database["public"]["Tables"]["issues"]["Row"],
  "id" | "title" | "category" | "status" | "priority" | "created_at" | "severity" | "location_text" | "address_text"
> & {
  department?: Pick<Database["public"]["Tables"]["departments"]["Row"], "name"> | null;
};

function countStatus(issues: DashboardIssueRow[], match: Array<OfficerIssueStatus>) {
  return issues.filter((issue) => match.includes(issue.status)).length;
}

export function OfficerDashboardPage() {
  const { profile, status: sessionStatus, error: sessionError } = useAppSession();
  const [issues, setIssues] = useState<DashboardIssueRow[]>([]);
  const [deptAssignments, setDeptAssignments] = useState<
    Array<{ id: string; issue_id: string; department_id: string; status: string; department?: { name: string } | null }>
  >([]);
  const [departmentsList, setDepartmentsList] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const profileId = profile?.id;
  const sessionProblem = sessionStatus === "error" ? sessionError ?? "CivicFix profile is unavailable." : null;

  useEffect(() => {
    if (sessionStatus !== "ready" || !profileId) {
      return;
    }

    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError(null);

      const [issuesRes, deptAssignmentsRes, deptsRes] = await Promise.all([
        supabase
          .from("issues")
          .select(
            "id, title, category, status, priority, created_at, severity, location_text, address_text, department:departments(name)",
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("issue_department_assignments")
          .select("id, issue_id, department_id, status, department:departments(name)"),
        supabase
          .from("departments")
          .select("id, name")
          .eq("is_active", true)
          .order("name", { ascending: true }),
      ]);

      if (cancelled) {
        return;
      }

      if (issuesRes.error) {
        if (import.meta.env.DEV) {
          console.error("Officer dashboard load failed", issuesRes.error);
        }
        setError("Unable to load officer operations right now.");
        setIssues([]);
        setLoading(false);
        return;
      }

      setIssues(issuesRes.data ?? []);
      setDeptAssignments(deptAssignmentsRes.data ?? []);
      setDepartmentsList(deptsRes.data ?? []);
      setLoading(false);
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [profileId, refreshNonce, sessionStatus]);

  const stats = useMemo(() => {
    const totalIssues = issues.length;
    const pendingAssignment = issues.filter(
      (issue) =>
        issue.status === "SUBMITTED" ||
        issue.status === "AI_ANALYZED" ||
        issue.status === "VERIFIED",
    ).length;
    const assignedIssues = countStatus(issues, ["ASSIGNED"]);
    const partiallyCompleted = countStatus(issues, ["PARTIALLY_COMPLETED"]);
    const underReviewIssues = countStatus(issues, ["UNDER_REVIEW"]);
    const resolvedIssues = countStatus(issues, ["RESOLVED", "CITIZEN_VERIFIED"]);

    // Calculate issues with multiple departments
    const issueDeptCounts = new Map<string, number>();
    for (const da of deptAssignments) {
      issueDeptCounts.set(da.issue_id, (issueDeptCounts.get(da.issue_id) ?? 0) + 1);
    }
    let multiDeptCount = 0;
    for (const count of issueDeptCounts.values()) {
      if (count > 1) multiDeptCount++;
    }

    return {
      totalIssues,
      pendingAssignment,
      assignedIssues,
      partiallyCompleted,
      underReviewIssues,
      resolvedIssues,
      multiDeptCount,
    };
  }, [issues, deptAssignments]);

  const departmentWorkloads = useMemo(() => {
    const activeAssignments = deptAssignments.filter(
      (da) => da.status === "ASSIGNED" || da.status === "IN_PROGRESS" || da.status === "UNDER_REVIEW",
    );

    return departmentsList
      .map((dept) => {
        const count = activeAssignments.filter((da) => da.department_id === dept.id).length;
        return {
          id: dept.id,
          name: dept.name,
          activeCount: count,
        };
      })
      .sort((a, b) => b.activeCount - a.activeCount);
  }, [deptAssignments, departmentsList]);

  // Operational action queue: Issues that require immediate officer attention
  const needsAttentionIssues = useMemo(() => {
    return issues
      .filter((issue) =>
        issue.status === "SUBMITTED" ||
        issue.status === "AI_ANALYZED" ||
        issue.status === "UNDER_REVIEW" ||
        issue.status === "REOPENED" ||
        issue.priority === "URGENT",
      )
      .slice(0, 5);
  }, [issues]);

  const recentIssues = useMemo(() => issues.slice(0, 6), [issues]);

  if (sessionProblem || error) {
    return (
      <Card className="page-container-standard p-6 sm:p-8">
        <div className="max-w-2xl space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-700">
            <AlertCircle className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Unable to load officer dashboard</h2>
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
            <div className="h-4 w-44 animate-pulse rounded-full bg-muted/60" />
            <div className="h-8 w-full max-w-xl animate-pulse rounded-2xl bg-muted/60" />
            <div className="h-4 w-full max-w-lg animate-pulse rounded-full bg-muted/40" />
          </div>
        </Card>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl border border-border/80 bg-surface/90" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl border border-border/80 bg-surface/80" />
      </div>
    );
  }

  const metricCards = [
    { label: "Pending Assignment", value: stats.pendingAssignment, icon: Bell, tone: "warning" as const },
    { label: "Assigned to Depts", value: stats.assignedIssues, icon: UserCheck, tone: "info" as const },
    { label: "Multi-Dept Issues", value: stats.multiDeptCount, icon: ClipboardList, tone: "default" as const },
    { label: "Partially Done", value: stats.partiallyCompleted, icon: Gauge, tone: "danger" as const },
    { label: "Under Review", value: stats.underReviewIssues, icon: ShieldAlert, tone: "default" as const },
    { label: "Resolved", value: stats.resolvedIssues, icon: CheckCircle2, tone: "success" as const },
  ];

  return (
    <div className="page-container-standard space-y-6 sm:space-y-8">
      {/* Officer Operational Hero */}
      <section className="relative overflow-hidden rounded-[2rem] border border-teal-100/90 bg-[linear-gradient(135deg,rgba(15,118,110,0.14)_0%,rgba(2,132,199,0.12)_46%,rgba(79,70,229,0.08)_100%)] p-6 sm:p-8 shadow-xl shadow-teal-950/8">
        <div className="pointer-events-none absolute -right-8 top-0 h-40 w-40 rounded-full bg-sky-400/20 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-10 left-6 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" aria-hidden="true" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-200/90 bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-[#0f5f59] shadow-sm shadow-teal-950/5">
              <TrendingUp className="h-3.5 w-3.5 text-[#0f766e]" aria-hidden="true" />
              <span>Municipal Operations Center</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
              Officer Operations Dashboard
            </h1>

            <p className="text-sm sm:text-base leading-relaxed text-muted-foreground">
              Monitor incoming citizen reports, verify complaints, prioritize civic hazards, and route tasks to municipal field workers.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Button asChild size="lg" className="shadow-lg shadow-teal-950/15 hover:shadow-xl">
              <Link to="/app/officer/issues">
                <span>Open Work Queue</span>
                <ArrowRight className="h-4 w-4 ml-1.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Compact Operational Metrics Bar (6 metrics) */}
      <section aria-label="Operational metrics">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {metricCards.map(({ label, value, icon: Icon, tone }) => {
            const accentClass =
              tone === "success"
                ? "border-t-emerald-500"
                : tone === "warning"
                  ? "border-t-amber-500"
                  : tone === "danger"
                    ? "border-t-rose-500"
                    : tone === "info"
                      ? "border-t-sky-500"
                      : "border-t-teal-500";

            return (
              <Card
                key={label}
                className={`p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md border-t-4 ${accentClass}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-muted-foreground truncate">{label}</p>
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                </div>
                <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* NEEDS ATTENTION SECTION (Most Important Section for Officer) */}
      <section className="space-y-4" aria-label="Issues needing attention">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" aria-hidden="true" />
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-800">
                Action Required
              </p>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-0.5">
              Needs Officer Attention ({needsAttentionIssues.length})
            </h2>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/app/officer/issues">View Full Queue</Link>
          </Button>
        </div>

        {needsAttentionIssues.length > 0 ? (
          <div className="grid gap-3">
            {needsAttentionIssues.map((issue) => {
              const statusTone = getOfficerIssueStatusTone(issue.status);
              const statusLabel = getOfficerIssueStatusLabel(issue.status);
              const location = issue.address_text?.trim() || issue.location_text?.trim();

              const actionHint =
                issue.status === "SUBMITTED" || issue.status === "AI_ANALYZED"
                  ? "Verify Complaint"
                  : issue.status === "UNDER_REVIEW"
                    ? "Review Resolution Proof"
                    : issue.status === "REOPENED"
                      ? "Reassign Worker"
                      : "Review Urgency";

              return (
                <Card
                  key={issue.id}
                  className="p-4 sm:p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md border-l-4 border-l-amber-500"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={statusTone} size="sm">
                          {statusLabel}
                        </Badge>
                        <Badge
                          variant={issue.priority === "URGENT" ? "danger" : issue.priority === "HIGH" ? "warning" : "default"}
                          size="sm"
                        >
                          Priority {issue.priority}
                        </Badge>
                        <Badge variant="outline" size="sm" className="bg-white/80">
                          {issue.category}
                        </Badge>
                        {issue.department?.name ? (
                          <Badge variant="teal" size="sm">
                            {issue.department.name}
                          </Badge>
                        ) : null}
                      </div>

                      <div>
                        <Link
                          to={`/app/officer/issues/${issue.id}`}
                          className="block hover:text-primary transition-colors"
                        >
                          <h3 className="text-base sm:text-lg font-bold text-foreground line-clamp-1">
                            {issue.title}
                          </h3>
                        </Link>
                        {location ? (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            📍 {location}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right hidden sm:block text-xs text-muted-foreground">
                        <p>{formatOfficerIssueDateTime(issue.created_at)}</p>
                      </div>
                      <Button asChild size="sm" className="shadow-sm">
                        <Link to={`/app/officer/issues/${issue.id}`}>
                          <span>{actionHint}</span>
                          <ArrowRight className="h-3.5 w-3.5 ml-1" aria-hidden="true" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-6 text-center bg-surface-elevated">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" aria-hidden="true" />
            <h3 className="mt-2 text-base font-bold text-foreground">You are all caught up!</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              No pending complaints currently require verification or review.
            </p>
          </Card>
        )}
      </section>

      {/* RECENT OPERATIONAL ISSUES QUEUE */}
      <section className="space-y-4" aria-label="Recent operational activity">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Live Registry
            </p>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-0.5">
              Recent Operational Issues
            </h2>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/app/officer/issues">View All ({issues.length})</Link>
          </Button>
        </div>

        {recentIssues.length > 0 ? (
          <div className="grid gap-3">
            {recentIssues.map((issue) => {
              const statusTone = getOfficerIssueStatusTone(issue.status);
              const statusLabel = getOfficerIssueStatusLabel(issue.status);
              const severityTone = getOfficerIssueSeverityTone(issue.severity);
              const severityLabel = getOfficerIssueSeverityLabel(issue.severity);

              return (
                <Card
                  key={issue.id}
                  className="p-4 sm:p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={statusTone} size="sm">
                          {statusLabel}
                        </Badge>
                        <Badge variant="outline" size="sm" className="bg-white/80">
                          {issue.category}
                        </Badge>
                        <Badge variant={issue.priority === "URGENT" ? "danger" : "default"} size="sm">
                          Priority {issue.priority}
                        </Badge>
                        <Badge variant={severityTone} size="sm">
                          Severity {severityLabel}
                        </Badge>
                      </div>

                      <Link
                        to={`/app/officer/issues/${issue.id}`}
                        className="block hover:text-primary transition-colors"
                      >
                        <h3 className="text-base font-bold text-foreground truncate">
                          {issue.title}
                        </h3>
                      </Link>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatOfficerIssueDateTime(issue.created_at)}</span>
                        {issue.department?.name ? <span>• Dept: {issue.department.name}</span> : null}
                      </div>
                    </div>

                    <Button asChild size="sm" variant="outline" className="shrink-0">
                      <Link to={`/app/officer/issues/${issue.id}`}>
                        <span>Manage</span>
                        <ArrowRight className="h-3.5 w-3.5 ml-1" aria-hidden="true" />
                      </Link>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-6 text-center bg-surface-elevated">
            <p className="text-sm font-semibold text-foreground">No issues in the municipal registry yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              When citizens file reports, they will appear here for verification and routing.
            </p>
          </Card>
        )}
      </section>

      {/* DEPARTMENT WORKLOAD BREAKDOWN */}
      <section className="space-y-4" aria-label="Department workload breakdown">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Capacity & Allocation
            </p>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-0.5">
              Department Workload
            </h2>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {departmentWorkloads.map((dept) => (
            <Card key={dept.id} className="p-4 bg-surface-elevated space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-foreground line-clamp-1">{dept.name}</span>
                <Badge variant={dept.activeCount > 10 ? "danger" : dept.activeCount > 0 ? "info" : "default"} size="sm">
                  {dept.activeCount} active
                </Badge>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, dept.activeCount * 15)}%` }}
                />
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Municipal Workflow Summary Card */}
      <section aria-label="Municipal workflow guide">
        <Card className="p-6 sm:p-8 bg-[linear-gradient(135deg,rgba(255,255,255,0.95)_0%,rgba(240,248,247,0.90)_100%)]">
          <div className="grid gap-6 md:grid-cols-3 items-center">
            <div className="space-y-1.5 md:col-span-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#0f766e]">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                <span>Operating Protocol</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-foreground">
                Municipal Triage Pipeline
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Standardized 5-step operational protocol: citizen report intake, officer triage, department routing, field execution, and resolution review.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 md:col-span-2">
              {[
                { step: "1", title: "Verify", desc: "Triage complaint" },
                { step: "2", title: "Prioritize", desc: "Set urgency" },
                { step: "3", title: "Route", desc: "Assign Dept(s)" },
                { step: "4", title: "Review", desc: "Inspect proof" },
                { step: "5", title: "Resolve", desc: "Close loop" },
              ].map((item) => (
                <div key={item.step} className="rounded-xl border border-teal-100 bg-white/90 p-3 text-center shadow-sm">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">
                    {item.step}
                  </span>
                  <p className="mt-1.5 text-xs font-bold text-foreground">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}

