import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, Bell, CheckCircle2, ClipboardList, Gauge, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Button } from "@/components/ui/button";
import {
  formatOfficerIssueDateTime,
  getOfficerIssueSeverityLabel,
  getOfficerIssueStatusLabel,
  getOfficerIssueStatusTone,
  type OfficerIssueStatus,
} from "@/lib/officer-issues";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type DashboardIssueRow = Pick<
  Database["public"]["Tables"]["issues"]["Row"],
  "id" | "title" | "category" | "status" | "priority" | "created_at" | "severity"
> & {
  department?: Pick<Database["public"]["Tables"]["departments"]["Row"], "name"> | null;
};

function countStatus(issues: DashboardIssueRow[], match: Array<OfficerIssueStatus>) {
  return issues.filter((issue) => match.includes(issue.status)).length;
}

function badgeToneClasses(tone: "default" | "success" | "warning" | "danger" | "info") {
  return tone === "success"
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : tone === "warning"
      ? "bg-amber-50 text-amber-700 ring-amber-200"
      : tone === "danger"
        ? "bg-red-50 text-red-700 ring-red-200"
      : tone === "info"
          ? "bg-sky-50 text-sky-700 ring-sky-200"
          : "bg-teal-50 text-teal-700 ring-teal-200";
}

export function OfficerDashboardPage() {
  const { profile, status: sessionStatus, error: sessionError } = useAppSession();
  const [issues, setIssues] = useState<DashboardIssueRow[]>([]);
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

      const { data, error: loadError } = await supabase
        .from("issues")
        .select(
          "id, title, category, status, priority, created_at, severity, department:departments(name)",
        )
        .order("created_at", { ascending: false });

      if (cancelled) {
        return;
      }

      if (loadError) {
        if (import.meta.env.DEV) {
          console.error("Officer dashboard load failed", loadError);
        }
        setError("Unable to load officer operations right now.");
        setIssues([]);
        setLoading(false);
        return;
      }

      setIssues(data ?? []);
      setLoading(false);
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [profileId, refreshNonce, sessionStatus]);

  const stats = useMemo(() => {
    const totalIssues = issues.length;
    const pendingVerification = countStatus(issues, ["SUBMITTED", "AI_ANALYZED", "UNDER_REVIEW"]);
    const verifiedIssues = countStatus(issues, ["VERIFIED"]);
    const inProgressIssues = countStatus(issues, ["ASSIGNED", "IN_PROGRESS", "REOPENED"]);
    const resolvedIssues = countStatus(issues, ["RESOLVED", "CITIZEN_VERIFIED"]);
    const highPriorityIssues = issues.filter((issue) => issue.priority === "HIGH" || issue.priority === "URGENT").length;

    return {
      totalIssues,
      pendingVerification,
      verifiedIssues,
      inProgressIssues,
      resolvedIssues,
      highPriorityIssues,
    };
  }, [issues]);

  const recentIssues = useMemo(() => issues.slice(0, 6), [issues]);

  if (sessionProblem || error) {
    return (
      <section className="rounded-[1.75rem] border border-border/80 bg-white/82 p-6 shadow-lg shadow-teal-950/10">
        <div className="max-w-2xl space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-700">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Unable to load officer dashboard</h2>
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
        <section className="rounded-[1.75rem] border border-teal-100/80 bg-[linear-gradient(135deg,rgba(15,118,110,0.10)_0%,rgba(2,132,199,0.08)_52%,rgba(79,70,229,0.08)_100%)] p-6 shadow-lg shadow-teal-950/10">
          <div className="space-y-3">
            <div className="h-4 w-44 animate-pulse rounded-full bg-muted/60" />
            <div className="h-9 w-full max-w-3xl animate-pulse rounded-2xl bg-muted/60" />
            <div className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-muted/40" />
          </div>
        </section>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-[1.5rem] border border-border/80 bg-surface/90" />
          ))}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-teal-100/80 bg-[linear-gradient(135deg,rgba(15,118,110,0.10)_0%,rgba(2,132,199,0.10)_48%,rgba(79,70,229,0.08)_100%)] shadow-lg shadow-teal-950/10">
        <div className="pointer-events-none absolute -right-8 top-0 h-36 w-36 rounded-full bg-[#0284c7]/15 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute bottom-0 left-6 h-40 w-40 rounded-full bg-[#0f766e]/15 blur-3xl" aria-hidden="true" />
        <div className="border-b border-teal-100/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.76)_0%,rgba(247,250,248,0.72)_100%)] px-6 py-5 backdrop-blur-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center rounded-full border border-sky-200/80 bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#0f5f59] shadow-sm shadow-teal-950/5">
                Municipal officer workspace
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight text-foreground">Municipal Officer Dashboard</h2>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  Live operational visibility for verification, triage, and assignment. This view is powered by current Supabase data.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-white/75 px-4 py-2 text-sm text-sky-900 shadow-sm shadow-sky-950/5">
                <TrendingUp className="h-4 w-4" aria-hidden="true" />
                Live queue
              </div>
              <Button asChild>
                <Link to="/app/officer/issues">
                  Open issue queue
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          { label: "Total Issues", value: stats.totalIssues, icon: ClipboardList, tone: "default" as const },
          { label: "Pending Verification", value: stats.pendingVerification, icon: Bell, tone: "warning" as const },
          { label: "Verified Issues", value: stats.verifiedIssues, icon: CheckCircle2, tone: "info" as const },
          { label: "In Progress", value: stats.inProgressIssues, icon: Gauge, tone: "info" as const },
          { label: "Resolved", value: stats.resolvedIssues, icon: CheckCircle2, tone: "success" as const },
          { label: "High Priority", value: stats.highPriorityIssues, icon: Bell, tone: "danger" as const },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div
            key={label}
            className="relative overflow-hidden rounded-2xl border border-border/70 bg-white/84 p-5 shadow-sm shadow-teal-950/8 backdrop-blur-sm"
          >
            <div
              className={[
                "absolute inset-x-0 top-0 h-1",
                label === "Resolved"
                  ? "bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500"
                  : label === "Pending Verification"
                    ? "bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500"
                    : label === "High Priority"
                      ? "bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500"
                    : label === "Verified Issues"
                      ? "bg-gradient-to-r from-sky-500 via-sky-400 to-sky-500"
                      : "bg-gradient-to-r from-teal-500 via-teal-400 to-emerald-500",
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
                        ? "bg-orange-50 text-orange-700 ring-orange-200"
                        : tone === "info"
                          ? "bg-sky-50 text-sky-700 ring-sky-200"
                          : "bg-teal-50 text-teal-700 ring-teal-200",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Triage queue</p>
              <h3 className="mt-1 text-xl font-semibold text-foreground">Recent operational issues</h3>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/app/officer/issues">View all</Link>
            </Button>
          </div>

            <div className="mt-6 space-y-3">
            {recentIssues.length > 0 ? (
              recentIssues.map((issue) => (
                <Link
                  key={issue.id}
                  className="block rounded-2xl border border-border/70 bg-[linear-gradient(135deg,rgba(15,118,110,0.06)_0%,rgba(2,132,199,0.05)_52%,rgba(5,150,105,0.05)_100%)] p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                  to={`/app/officer/issues/${issue.id}`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${badgeToneClasses(getOfficerIssueStatusTone(issue.status))}`}>
                          {getOfficerIssueStatusLabel(issue.status)}
                        </span>
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${
                  issue.priority === "URGENT"
                    ? "bg-orange-50 text-orange-700 ring-orange-200"
                    : issue.priority === "HIGH"
                      ? "bg-amber-50 text-amber-700 ring-amber-200"
                      : issue.priority === "MEDIUM"
                        ? "bg-sky-50 text-sky-700 ring-sky-200"
                        : "bg-teal-50 text-teal-700 ring-teal-200"
                }`}>
                          Priority {issue.priority}
                        </span>
                        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${badgeToneClasses(issue.severity === "CRITICAL" ? "danger" : issue.severity === "HIGH" ? "warning" : issue.severity === "MEDIUM" ? "info" : "success")}`}>
                          Severity {getOfficerIssueSeverityLabel(issue.severity)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-lg font-semibold tracking-tight text-foreground">{issue.title}</h4>
                        <p className="text-sm leading-6 text-muted-foreground">
                          {issue.category}
                          {issue.department?.name ? ` · ${issue.department.name}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground lg:text-right">
                      <p>{formatOfficerIssueDateTime(issue.created_at)}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">Open issue</p>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl border border-border/70 bg-[linear-gradient(135deg,rgba(15,118,110,0.08)_0%,rgba(2,132,199,0.06)_100%)] p-5">
                <p className="text-sm font-medium text-foreground">No issues in the municipal queue yet.</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Once citizens submit reports, they will appear here for verification and routing.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border/80 bg-[linear-gradient(135deg,rgba(15,118,110,0.08)_0%,rgba(2,132,199,0.06)_100%)] p-6 shadow-lg shadow-teal-950/10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Workflow</p>
          <div className="mt-4 grid gap-3">
            {["REPORT", "ANALYZE", "PRIORITIZE", "ASSIGN", "RESOLVE", "VERIFY"].map((step, index) => (
              <div
                key={step}
                className="flex items-center gap-3 rounded-2xl border border-border/70 bg-white/75 px-4 py-3 shadow-sm shadow-black/5"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#0f766e] to-[#0284c7] text-xs font-bold text-white shadow-sm shadow-teal-950/10">
                  {index + 1}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{step}</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Municipal operations</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
